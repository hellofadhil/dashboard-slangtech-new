import { redirect } from 'next/navigation';
import { AdminUsersManager } from '@/features/admins/components/admin-users-manager';
import { getCurrentAdminUser } from '@/lib/auth/server';
import { getAdminUsers } from '@/features/admins/data';

export default async function AdminUsersPage() {
  const currentAdmin = await getCurrentAdminUser();

  if (!currentAdmin) {
    redirect('/login');
  }

  const admins = await getAdminUsers();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
        <p className="mt-2 text-muted-foreground">
          Kelola email yang punya akses ke dashboard.
        </p>
      </div>
      <AdminUsersManager admins={admins} currentEmail={currentAdmin.email} />
    </div>
  );
}
