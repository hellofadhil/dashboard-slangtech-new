import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdminUser } from '@/lib/auth/server';
import { deleteFileFromR2, uploadFileToR2 } from '@/lib/r2/server';

export const runtime = 'nodejs';

async function requireAdminResponse() {
  const adminUser = await getCurrentAdminUser();

  if (!adminUser) {
    return NextResponse.json({ error: 'Sesi admin tidak valid' }, { status: 401 });
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const unauthorized = await requireAdminResponse();
    if (unauthorized) {
      return unauthorized;
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const folder = formData.get('folder');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File gambar wajib dipilih' }, { status: 400 });
    }

    const result = await uploadFileToR2(file, typeof folder === 'string' ? folder : 'classes');
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal mengunggah gambar' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const unauthorized = await requireAdminResponse();
    if (unauthorized) {
      return unauthorized;
    }

    const body = await request.json() as { url?: string };

    if (!body.url) {
      return NextResponse.json({ error: 'URL gambar wajib diisi' }, { status: 400 });
    }

    await deleteFileFromR2(body.url);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal menghapus gambar' },
      { status: 500 },
    );
  }
}
