import 'server-only';

import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { UploadFolder } from '@/lib/dashboard/types';
import { slugify } from '@/lib/dashboard/utils';

const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

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

function getExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();

  if (fromName && /^[a-z0-9]+$/.test(fromName)) {
    return fromName;
  }

  return file.type.split('/').pop() || 'jpg';
}

function createObjectKey(file: File, folder: UploadFolder): string {
  const extension = getExtension(file);
  const baseName = slugify(file.name.replace(/\.[^.]+$/, '')) || 'image';
  return `${folder}/${crypto.randomUUID()}-${baseName}.${extension}`;
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

export async function uploadFileToR2(file: File, folderInput: string): Promise<R2UploadResult> {
  if (!file || file.size === 0) {
    throw new Error('File gambar wajib dipilih');
  }

  if (!VALID_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Format gambar harus JPG, PNG, WebP, atau GIF');
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('Ukuran gambar maksimal 5MB');
  }

  const folder = validateUploadFolder(folderInput);
  const config = getR2Config();
  const client = createR2Client(config);
  const key = createObjectKey(file, folder);
  const bytes = Buffer.from(await file.arrayBuffer());

  await client.send(new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: bytes,
    ContentType: file.type,
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  return {
    key,
    url: `${config.publicUrl}/${key}`,
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
      console.warn(`Gagal menghapus file R2: ${uniqueUrls[index]}`, result.reason);
    }
  });
}
