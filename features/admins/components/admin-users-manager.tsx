'use client';

import { FormEvent, useState, useTransition } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  createAdminUserAction,
  deleteAdminUserAction,
} from '@/features/admins/actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdminUser } from '@/lib/dashboard/types';

interface AdminUsersManagerProps {
  admins: AdminUser[];
  currentEmail: string;
}

export function AdminUsersManager({ admins, currentEmail }: AdminUsersManagerProps) {
  const [items, setItems] = useState(admins);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const result = await createAdminUserAction({ email, password });
      if (!result.success || !result.data) {
        toast.error(result.message);
        return;
      }

      setItems((current) => {
        const withoutDuplicate = current.filter((admin) => admin.email !== result.data!.email);
        return [...withoutDuplicate, result.data!].sort((a, b) => a.email.localeCompare(b.email));
      });
      setEmail('');
      setPassword('');
      toast.success(result.message);
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) {
      return;
    }

    startTransition(async () => {
      const result = await deleteAdminUserAction(deleteTarget.email);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setItems((current) => current.filter((admin) => admin.email !== deleteTarget.email));
      setDeleteTarget(null);
      toast.success(result.message);
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Akses Admin</CardTitle>
          <CardDescription>
            Buat akun Firebase Auth baru dan beri akses ke dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="admin-email">Email Admin</Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.com"
                disabled={isPending}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimal 6 karakter"
                disabled={isPending}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" disabled={isPending}>
              <UserPlus className="mr-2 h-4 w-4" />
              Buat Admin
            </Button>
          </form>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Dibuat Oleh</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="w-[96px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((admin) => (
                  <TableRow key={admin.email}>
                    <TableCell className="font-medium">
                      <div className="flex flex-wrap items-center gap-2">
                        {admin.email}
                        {admin.email === currentEmail ? <Badge variant="outline">Kamu</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{admin.createdBy || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(admin.createdAt).toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setDeleteTarget(admin)}
                          disabled={isPending || items.length <= 1}
                          aria-label={`Hapus akses admin ${admin.email}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus akses admin?</AlertDialogTitle>
            <AlertDialogDescription>
              Email {deleteTarget?.email} tidak akan bisa login ke dashboard lagi. Akun Firebase Auth-nya tidak ikut dihapus dari Firebase Console.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}>
              {isPending ? 'Menghapus...' : 'Ya, Hapus Akses'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
