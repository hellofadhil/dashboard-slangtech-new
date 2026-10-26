import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';

const REGION_API_BASE_URL = 'https://api-daerah-indonesia.vercel.app/api';
const REGION_TYPES = ['provinces', 'regencies', 'districts', 'villages'] as const;

type RegionType = (typeof REGION_TYPES)[number];

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function isRegionType(value: string | null): value is RegionType {
  return REGION_TYPES.some((type) => type === value);
}

function getRegionPath(type: RegionType, parentId: string | null) {
  if (type === 'provinces') {
    return 'provinces.json';
  }

  if (!parentId || !/^\d+$/.test(parentId)) {
    return null;
  }

  return `${type}/${parentId}.json`;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');
  const parentId = searchParams.get('parentId');

  if (!isRegionType(type)) {
    return jsonError('Tipe wilayah belum valid.', 400);
  }

  const path = getRegionPath(type, parentId);

  if (!path) {
    return jsonError('ID parent wilayah wajib diisi.', 400);
  }

  const response = await fetch(`${REGION_API_BASE_URL}/${path}`, {
    next: { revalidate: 60 * 60 * 24 * 7 },
  }).catch(() => null);

  if (!response) {
    return jsonError('Data wilayah belum bisa dimuat.', 502);
  }

  if (!response.ok) {
    return jsonError('Data wilayah belum bisa dimuat.', response.status);
  }

  const regions = await response.json();

  return NextResponse.json(regions, {
    headers: {
      'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=86400',
    },
  });
}
