import { WhatsAppSettingsManager } from '@/features/whatsapp/components/whatsapp-settings-manager';
import { getWhatsAppSettings, toWhatsAppSettingsView } from '@/features/whatsapp/data';

export const dynamic = 'force-dynamic';

export default async function WhatsAppPage() {
  const settings = await getWhatsAppSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">WhatsApp</h1>
        <p className="mt-2 text-muted-foreground">
          Pengaturan gateway dan bot untuk pengiriman pesan WhatsApp.
        </p>
      </div>

      <WhatsAppSettingsManager initialSettings={toWhatsAppSettingsView(settings)} />
    </div>
  );
}
