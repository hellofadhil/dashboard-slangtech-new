import { ZawaSessionManager } from '@/features/zawa/components/zawa-session-manager';
import { getZawaSessionRecord, toZawaSessionView } from '@/features/zawa/data';

export const dynamic = 'force-dynamic';

export default async function WhatsAppPage() {
  const session = await getZawaSessionRecord();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">WhatsApp</h1>
      </div>

      <ZawaSessionManager initialSession={session ? toZawaSessionView(session) : null} />
    </div>
  );
}
