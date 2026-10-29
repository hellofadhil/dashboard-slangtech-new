import { redirect } from 'next/navigation';
import { getAuthRefreshToken, getAuthSessionToken, getCurrentAdminUser } from '@/lib/auth/server';
import { DashboardHeader } from '@/components/dashboard/header';
import { DashboardSidebar } from '@/components/dashboard/sidebar';

export const metadata = {
  title: 'SlangTech - Admin Management Portal',
  description: 'Panel pengelolaan kelas, pendaftaran, verifikasi pembayaran, dan jadwal LKP SlangTech',
};

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionToken = await getAuthSessionToken();
  const refreshToken = await getAuthRefreshToken();
  const adminUser = await getCurrentAdminUser();

  if (!adminUser) {
    if (refreshToken) {
      redirect('/api/auth/session/refresh?next=/dashboard');
    }

    if (sessionToken) {
      redirect('/api/auth/session?next=/login');
    }

    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col md:ml-56">
        <DashboardHeader adminEmail={adminUser.email} />
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
