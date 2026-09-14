import 'server-only';

import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { UploadFolder } from '@/lib/dashboard/types';
import { slugify } from '@/lib/dashboard/utils';
import { logServerError } from '@/lib/audit';

const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const TARGET_WEBP_SIZE = 100 * 1024;
const MIN_TARGET_WEBP_SIZE = 24 * 1024;
const MIN_WEBP_QUALITY = 28;
const MAX_WEBP_QUALITY = 82;

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

export interface R2UploadResult {
  url: string;
  key: string;
  originalSize: number;
  compressedSize: number;
  contentType: 'image/webp';
}

interface CompressedImage {
  bytes: Buffer;
  quality: number;
  maxDimension: number;
}

function getR2Config(): R2Config {
  const config = {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME,
    publicUrl: process.env.R2_PUBLIC_URL,
  };

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(`Konfigurasi R2 belum lengkap: ${missing.join(', ')}`);
  }

  return {
    accountId: config.accountId!,
    accessKeyId: config.accessKeyId!,
    secretAccessKey: config.secretAccessKey!,
    bucketName: config.bucketName!,
    publicUrl: config.publicUrl!.replace(/\/+$/, ''),
  };
}

function createR2Client(config: R2Config): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });
}

function validateUploadFolder(folder: string): UploadFolder {
  if (folder === 'classes' || folder === 'events') {
    return folder;
  }

  throw new Error('Folder unggahan tidak valid');
}

function createObjectKey(file: File, folder: UploadFolder): string {
  const baseName = slugify(file.name.replace(/\.[^.]+$/, '')) || 'image';
  return `${folder}/${crypto.randomUUID()}-${baseName}.webp`;
}

function extractKeyFromPublicUrl(url: string, publicUrl: string): string {
  const normalizedPublicUrl = publicUrl.replace(/\/+$/, '');
  const publicParsed = new URL(normalizedPublicUrl);
  const imageParsed = new URL(url);

  if (imageParsed.origin !== publicParsed.origin) {
    throw new Error('URL gambar tidak berasal dari R2 publik yang dikonfigurasi');
  }

  const publicPath = publicParsed.pathname.replace(/\/+$/, '');
  const imagePath = imageParsed.pathname;
  const keyPath = publicPath ? imagePath.slice(publicPath.length) : imagePath;
  const key = decodeURIComponent(keyPath.replace(/^\/+/, ''));

  if (!key) {
    throw new Error('Key gambar R2 tidak valid');
  }

  return key;
}

function getFolderMaxDimension(folder: UploadFolder): number {
  switch (folder) {
    case 'classes':
    case 'events':
    default:
      return 1200;
  }
}

function getCandidateDimensions(folder: UploadFolder, metadata: sharp.Metadata): number[] {
  const originalMaxDimension = Math.max(metadata.width ?? 0, metadata.height ?? 0);
  const folderMaxDimension = getFolderMaxDimension(folder);
  const startingDimension = originalMaxDimension > 0
    ? Math.min(originalMaxDimension, folderMaxDimension)
    : folderMaxDimension;

  return Array.from(new Set([
    startingDimension,
    1400,
    1200,
    1000,
    900,
    768,
    640,
    512,
    384,
    320,
  ]))
    .filter((dimension) => dimension > 0 && dimension <= startingDimension)
    .sort((a, b) => b - a);
}

async function encodeWebp(input: Buffer, maxDimension: number, quality: number): Promise<Buffer> {
  return sharp(input, { animated: false, limitInputPixels: 50_000_000 })
    .rotate()
    .resize({
      width: maxDimension,
      height: maxDimension,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({
      quality,
      effort: 5,
      smartSubsample: true,
    })
    .toBuffer();
}

function getTargetSize(originalSize: number): number {
  return Math.min(TARGET_WEBP_SIZE, Math.max(Math.floor(originalSize * 0.85), MIN_TARGET_WEBP_SIZE));
}

async function findBestWebpForDimension(input: Buffer, maxDimension: number, targetSize: number): Promise<CompressedImage> {
  let low = MIN_WEBP_QUALITY;
  let high = MAX_WEBP_QUALITY;
  let bestUnderTarget: CompressedImage | null = null;
  let smallest: CompressedImage | null = null;

  while (low <= high) {
    const quality = Math.floor((low + high) / 2);
    const bytes = await encodeWebp(input, maxDimension, quality);
    const candidate = { bytes, quality, maxDimension };

    if (!smallest || bytes.length < smallest.bytes.length) {
      smallest = candidate;
    }

    if (bytes.length <= targetSize) {
      bestUnderTarget = candidate;
      low = quality + 1;
    } else {
      high = quality - 1;
    }
  }

  return bestUnderTarget ?? smallest!;
}

async function compressImageForUpload(file: File, folder: UploadFolder): Promise<CompressedImage> {
  const input = Buffer.from(await file.arrayBuffer());
  const metadata = await sharp(input, { animated: false, limitInputPixels: 50_000_000 }).metadata();
  const dimensions = getCandidateDimensions(folder, metadata);
  const targetSize = getTargetSize(file.size);
  let smallest: CompressedImage | null = null;

  for (const dimension of dimensions) {
    const candidate = await findBestWebpForDimension(input, dimension, targetSize);

    if (!smallest || candidate.bytes.length < smallest.bytes.length) {
      smallest = candidate;
    }

    if (candidate.bytes.length <= targetSize) {
      return candidate;
    }
  }

  if (!smallest) {
    throw new Error('Gagal mengompres gambar');
  }

  return smallest;
}

export async function uploadFileToR2(file: File, folderInput: string): Promise<R2UploadResult> {
  if (!file || file.size === 0) {
    throw new Error('File gambar wajib dipilih');
  }

  if (!VALID_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Format gambar harus JPG, PNG, WebP, atau GIF');
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('Ukuran gambar maksimal 10MB');
  }

  const folder = validateUploadFolder(folderInput);
  const config = getR2Config();
  const client = createR2Client(config);
  const key = createObjectKey(file, folder);
  const compressed = await compressImageForUpload(file, folder);

  await client.send(new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: compressed.bytes,
    ContentType: 'image/webp',
    ContentLength: compressed.bytes.length,
    CacheControl: 'public, max-age=31536000, immutable',
    Metadata: {
      originalSize: String(file.size),
      compressedSize: String(compressed.bytes.length),
      quality: String(compressed.quality),
      maxDimension: String(compressed.maxDimension),
    },
  }));

  return {
    key,
    url: `${config.publicUrl}/${key}`,
    originalSize: file.size,
    compressedSize: compressed.bytes.length,
    contentType: 'image/webp',
  };
}

export async function deleteFileFromR2(url: string): Promise<void> {
  if (!url) {
    throw new Error('URL gambar wajib diisi');
  }

  const config = getR2Config();
  const client = createR2Client(config);
  const key = extractKeyFromPublicUrl(url, config.publicUrl);

  await client.send(new DeleteObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  }));
}

export async function deleteFilesFromR2(urls: Array<string | null | undefined>): Promise<void> {
  const uniqueUrls = [...new Set(urls.filter((url): url is string => Boolean(url)))];

  const results = await Promise.allSettled(uniqueUrls.map((url) => deleteFileFromR2(url)));

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      logServerError('r2.delete', result.reason, { url: uniqueUrls[index] });
    }
  });
}
