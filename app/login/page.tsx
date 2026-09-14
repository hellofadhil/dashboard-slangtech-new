import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';
import { ThemeToggle } from '@/components/theme-toggle';
import { getAuthRefreshToken, getCurrentAdminUser } from '@/lib/auth/server';

export const metadata = {
  title: 'Login Admin',
};

export default async function LoginPage() {
  const adminUser = await getCurrentAdminUser();

  if (adminUser) {
    redirect('/dashboard');
  }

  const refreshToken = await getAuthRefreshToken();
  if (refreshToken) {
    redirect('/api/auth/session/refresh?next=/dashboard');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="fixed right-4 top-4">
        <ThemeToggle />
      </div>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
