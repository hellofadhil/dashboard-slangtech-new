'use client';

import { useState } from 'react';
import {
  AlertCircle,
  Bot,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Phone,
  Send,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DEFAULT_WA_ADMIN_PHONE,
  DEFAULT_WA_BASE_URL,
  DEFAULT_WA_BOT_NAME,
  type WhatsAppSettingsView,
} from '@/features/whatsapp/types';

interface WhatsAppSettingsManagerProps {
  initialSettings: WhatsAppSettingsView;
}

export function WhatsAppSettingsManager({ initialSettings }: WhatsAppSettingsManagerProps) {
  const [settings, setSettings] = useState<WhatsAppSettingsView>(initialSettings);
  const [baseUrl, setBaseUrl] = useState(initialSettings.baseUrl || DEFAULT_WA_BASE_URL);
  const [userBot, setUserBot] = useState(initialSettings.userBot || DEFAULT_WA_BOT_NAME);
  const [apiKey, setApiKey] = useState(initialSettings.apiKey || '');
  const [adminPhone, setAdminPhone] = useState(initialSettings.adminPhone || DEFAULT_WA_ADMIN_PHONE);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Halo dari SlangTech. Ini pesan uji coba.');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'success' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!baseUrl.trim()) {
      toast.error('URL Gateway wajib diisi');
      return;
    }

    if (!userBot.trim()) {
      toast.error('Nama bot wajib diisi');
      return;
    }

    if (!apiKey.trim()) {
      toast.error('API key wajib diisi');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/whatsapp/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: baseUrl.trim(),
          userBot: userBot.trim(),
          apiKey: apiKey.trim(),
          adminPhone: adminPhone.trim(),
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || 'Gagal menyimpan pengaturan');
      }

      setSettings(result.data);
      toast.success('Pengaturan berhasil disimpan');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!testPhone.trim()) {
      toast.error('Nomor tujuan wajib diisi');
      return;
    }

    if (!testMessage.trim()) {
      toast.error('Pesan tidak boleh kosong');
      return;
    }

    setIsSendingTest(true);
    setTestResult({ status: 'idle', message: '' });

    try {
      const response = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone.trim(),
          message: testMessage.trim(),
          baseUrl: baseUrl.trim(),
          userBot: userBot.trim(),
          apiKey: apiKey.trim(),
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || 'Gagal mengirim pesan');
      }

      setTestResult({
        status: 'success',
        message: 'Pesan berhasil dikirim.',
      });
      toast.success('Pesan tes terkirim');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Gagal mengirim pesan';
      setTestResult({
        status: 'error',
        message: msg,
      });
      toast.error(msg);
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            {settings.isConfigured ? (
              <CheckCircle2 className="size-4 text-emerald-600" />
            ) : (
              <AlertCircle className="size-4 text-amber-500" />
            )}
          </CardHeader>
          <CardContent>
            <Badge
              variant={settings.isConfigured ? 'default' : 'secondary'}
              className={settings.isConfigured ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            >
              {settings.isConfigured ? 'Aktif' : 'Belum Lengkap'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Nama Bot</CardTitle>
            <Bot className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-base font-semibold truncate">
              {settings.userBot || DEFAULT_WA_BOT_NAME}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Nomor Admin</CardTitle>
            <Phone className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="font-mono text-sm font-semibold truncate">
              {settings.adminPhone || DEFAULT_WA_ADMIN_PHONE}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">API Key</CardTitle>
            <Key className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1.5 text-sm">
              {settings.hasApiKey ? (
                <>
                  <ShieldCheck className="size-4 text-emerald-600" />
                  <span className="font-mono text-xs text-muted-foreground">
                    ••••••••{settings.apiKey ? settings.apiKey.slice(-4) : ''}
                  </span>
                </>
              ) : (
                <span className="text-xs text-amber-600">Belum diisi</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Form Pengaturan */}
        <div className="lg:col-span-7">
          <Card>
            <form onSubmit={handleSave}>
              <CardHeader className="pb-4">
                <CardTitle>Pengaturan Gateway</CardTitle>
                <CardDescription>
                  Konfigurasi URL gateway, nama bot, nomor admin, dan API key Baselab.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="baseUrl">URL Gateway</Label>
                  <Input
                    id="baseUrl"
                    type="url"
                    placeholder="https://api-wa.baselab.web.id"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="userBot">Nama Bot</Label>
                    <Input
                      id="userBot"
                      type="text"
                      placeholder="marketing_bot"
                      value={userBot}
                      onChange={(e) => setUserBot(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="adminPhone">Nomor Admin</Label>
                    <Input
                      id="adminPhone"
                      type="tel"
                      placeholder="6289514563365"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="apiKey">API Key</Label>
                  <div className="relative">
                    <Input
                      id="apiKey"
                      type={showApiKey ? 'text' : 'password'}
                      placeholder="bw_..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="pr-10 font-mono text-xs sm:text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-6 py-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBaseUrl(DEFAULT_WA_BASE_URL);
                    setUserBot(DEFAULT_WA_BOT_NAME);
                    setAdminPhone(DEFAULT_WA_ADMIN_PHONE);
                  }}
                >
                  <RotateCcw className="mr-1.5 size-3.5" />
                  Reset
                </Button>

                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 size-4" />
                      Simpan
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Uji Coba Pengiriman */}
        <div className="lg:col-span-5">
          <Card>
            <form onSubmit={handleSendTest}>
              <CardHeader className="pb-4">
                <CardTitle>Tes Pengiriman</CardTitle>
                <CardDescription>
                  Kirim pesan uji coba ke nomor tujuan.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="testPhone">Nomor Tujuan</Label>
                    {adminPhone && (
                      <button
                        type="button"
                        onClick={() => setTestPhone(adminPhone)}
                        className="text-[11px] text-primary hover:underline"
                      >
                        Pakai nomor admin
                      </button>
                    )}
                  </div>
                  <Input
                    id="testPhone"
                    type="tel"
                    placeholder="081234567890"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="testMessage">Pesan</Label>
                  <Textarea
                    id="testMessage"
                    rows={4}
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Tulis pesan uji coba..."
                    required
                  />
                </div>

                {testResult.status === 'success' && (
                  <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <AlertTitle className="text-xs font-bold">Berhasil</AlertTitle>
                    <AlertDescription className="text-xs">
                      {testResult.message}
                    </AlertDescription>
                  </Alert>
                )}

                {testResult.status === 'error' && (
                  <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertTitle className="text-xs font-bold">Gagal</AlertTitle>
                    <AlertDescription className="text-xs">
                      {testResult.message}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>

              <CardFooter className="border-t border-border/60 bg-muted/20 px-6 py-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSendingTest || !apiKey}
                >
                  {isSendingTest ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 size-4" />
                      Kirim Pesan
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
