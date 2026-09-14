'use client';

import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/firebase/auth';
import { cn } from '@/lib/utils';

interface LogoutButtonProps {
  className?: string;
  variant?: React.ComponentProps<typeof Button>['variant'];
  asMenuItem?: boolean;
}

export function LogoutButton({ className, variant = 'ghost', asMenuItem = false }: LogoutButtonProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await fetch('/api/auth/session', { method: 'DELETE' });
      router.replace('/login');
      router.refresh();
    } catch {
      toast.error('Gagal keluar');
    }
  };

  if (asMenuItem) {
    return (
      <button
        type="button"
        className={cn('flex w-full items-center px-2 py-1.5 text-sm outline-none hover:bg-muted hover:text-foreground', className)}
        onClick={handleLogout}
      >
        <LogOut className="mr-2 h-4 w-4" />
        <span>Keluar</span>
      </button>
    );
  }

  return (
    <Button type="button" variant={variant} className={cn('w-full justify-start gap-2', className)} onClick={handleLogout}>
      <LogOut className="h-4 w-4" />
      Keluar
    </Button>
  );
}
