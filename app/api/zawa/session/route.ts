import { NextResponse } from 'next/server';
import { getCurrentAdminUser } from '@/lib/auth/server';
import {
  createZawaSession,
  deleteZawaSession,
  getZawaSession,
  resetZawaSession,
  ZawaApiError,
} from '@/lib/zawa/client';
import {
  createZawaSessionRecord,
  deleteZawaSessionRecord,
  getZawaSessionRecord,
  markZawaSessionError,
  toZawaSessionView,
  updateZawaSessionFromRemote,
} from '@/features/zawa/data';
import type { ZawaSessionRecord } from '@/features/zawa/types';

export const runtime = 'nodejs';

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

async function requireAdmin() {
  const adminUser = await getCurrentAdminUser();

  if (!adminUser) {
    return {
      response: jsonError('Sesi admin tidak valid', 401),
      adminUser: null,
    };
  }

  return { response: null, adminUser };
}

function getCredentials(session: ZawaSessionRecord) {
  return {
    zawaId: session.zawaId,
    sessionId: session.sessionId,
  };
}

async function syncStoredSession(session: ZawaSessionRecord, adminEmail: string) {
  const remoteSession = await getZawaSession(getCredentials(session));
  return updateZawaSessionFromRemote(session, remoteSession, adminEmail);
}

function getZawaErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export async function GET() {
  try {
    const { response, adminUser } = await requireAdmin();
    if (response) {
      return response;
    }
    if (!adminUser) {
      return jsonError('Sesi admin tidak valid', 401);
    }

    const existingSession = await getZawaSessionRecord();
    if (!existingSession) {
      return jsonError('Sesi Zawa belum dibuat', 404);
    }

    try {
      const syncedSession = await syncStoredSession(existingSession, adminUser.email);
      return NextResponse.json({ success: true, data: toZawaSessionView(syncedSession) });
    } catch (error) {
      if (error instanceof ZawaApiError && error.status === 404) {
        await deleteZawaSessionRecord();
        return jsonError('Sesi Zawa sudah tidak tersedia. Silakan buat sesi baru.', 404);
      }

      const markedSession = await markZawaSessionError(
        existingSession,
        getZawaErrorMessage(error, 'Gagal mengambil sesi Zawa'),
        adminUser.email,
      );

      return NextResponse.json(
        {
          success: false,
          message: markedSession.lastError,
          data: toZawaSessionView(markedSession),
        },
        { status: error instanceof ZawaApiError ? 502 : 500 },
      );
    }
  } catch (error) {
    return jsonError(getZawaErrorMessage(error, 'Gagal mengambil sesi Zawa'), 500);
  }
}

export async function POST() {
  try {
    const { response, adminUser } = await requireAdmin();
    if (response) {
      return response;
    }
    if (!adminUser) {
      return jsonError('Sesi admin tidak valid', 401);
    }

    const existingSession = await getZawaSessionRecord();
    if (existingSession) {
      return NextResponse.json(
        {
          success: false,
          message: 'Sesi Zawa masih tersimpan. Hapus sesi lama dulu kalau ingin membuat yang baru.',
          data: toZawaSessionView(existingSession),
        },
        { status: 409 },
      );
    }

    const zawaSession = await createZawaSession();
    const savedSession = await createZawaSessionRecord(zawaSession, adminUser.email);

    return NextResponse.json({ success: true, data: toZawaSessionView(savedSession) });
  } catch (error) {
    return jsonError(getZawaErrorMessage(error, 'Gagal membuat sesi Zawa'), 500);
  }
}

export async function PUT() {
  try {
    const { response, adminUser } = await requireAdmin();
    if (response) {
      return response;
    }
    if (!adminUser) {
      return jsonError('Sesi admin tidak valid', 401);
    }

    const existingSession = await getZawaSessionRecord();
    if (!existingSession) {
      return jsonError('Sesi Zawa belum dibuat', 404);
    }

    await resetZawaSession(getCredentials(existingSession));

    try {
      const syncedSession = await syncStoredSession(existingSession, adminUser.email);
      return NextResponse.json({ success: true, data: toZawaSessionView(syncedSession) });
    } catch {
      const markedSession = await markZawaSessionError(
        existingSession,
        'Sesi berhasil direset, tapi QR terbaru belum bisa diambil.',
        adminUser.email,
      );

      return NextResponse.json({ success: true, data: toZawaSessionView(markedSession) });
    }
  } catch (error) {
    if (error instanceof ZawaApiError && error.status === 404) {
      await deleteZawaSessionRecord();
      return jsonError('Sesi Zawa sudah tidak tersedia. Silakan buat sesi baru.', 404);
    }

    return jsonError(getZawaErrorMessage(error, 'Gagal reset sesi Zawa'), 500);
  }
}

export async function DELETE() {
  try {
    const { response } = await requireAdmin();
    if (response) {
      return response;
    }

    const existingSession = await getZawaSessionRecord();
    if (existingSession) {
      try {
        await deleteZawaSession(getCredentials(existingSession));
      } catch (error) {
        if (!(error instanceof ZawaApiError && error.status === 404)) {
          throw error;
        }
      }

      await deleteZawaSessionRecord();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(getZawaErrorMessage(error, 'Gagal menghapus sesi Zawa'), 500);
  }
}
