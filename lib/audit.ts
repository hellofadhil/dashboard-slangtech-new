import 'server-only';

import type { FirebaseSessionUser } from '@/lib/auth/server';

export function logAdminEvent(event: string, actor: FirebaseSessionUser, metadata?: Record<string, unknown>): void {
  console.info('[admin-audit]', JSON.stringify({
    event,
    actor: {
      email: actor.email,
      uid: actor.uid,
    },
    metadata,
    timestamp: new Date().toISOString(),
  }));
}

export function logServerError(scope: string, error: unknown, metadata?: Record<string, unknown>): void {
  console.error('[server-error]', JSON.stringify({
    scope,
    message: error instanceof Error ? error.message : String(error),
    metadata,
    timestamp: new Date().toISOString(),
  }));
}
