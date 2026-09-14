'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { LockKeyhole } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSafeInternalPath } from '@/lib/auth/redirect';
import { auth } from '@/lib/firebase/auth';

function getReadableLoginError(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code)
    : '';

  if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password')) {
    return 'Email atau password salah.';
  }

  if (code.includes('auth/user-not-found')) {
    return 'Akun tidak ditemukan.';
  }

  if (code.includes('auth/too-many-requests')) {
    return 'Terlalu banyak percobaan login. Coba lagi nanti.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Gagal login. Periksa email dan password.';
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const idToken = await credential.user.getIdToken();
      const refreshToken = credential.user.refreshToken;
      const body = refreshToken ? { idToken, refreshToken } : { idToken };
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(data?.message || 'Gagal membuat sesi login');
      }

      toast.success('Login berhasil');
      router.replace(getSafeInternalPath(searchParams.get('next'), '/dashboard'));
      router.refresh();
    } catch (error) {
      toast.error(getReadableLoginError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md border bg-muted">
          <LockKeyhole className="h-5 w-5" />
        </div>
        <CardTitle>Login Admin</CardTitle>
        <CardDescription>
          Halaman ini khusus untuk Administrator. Guru dan siswa silakan masuk melalui website client.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Masuk...' : 'Masuk'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
