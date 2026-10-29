'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  ClipboardList,
  CalendarDays,
  TicketCheck,
  GraduationCap,
  LayoutDashboard,
  Menu,
  MessageCircle,
  School,
  UsersRound,
} from 'lucide-react';
import { LogoutButton } from '@/components/auth/logout-button';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    label: 'Utama',
    items: [
      {
        title: 'Ringkasan',
        href: '/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: 'Operasional',
    items: [
      {
        title: 'Pendaftaran Kelas',
        href: '/dashboard/enrollments',
        icon: ClipboardList,
      },
      {
        title: 'Pendaftaran Event',
        href: '/dashboard/event-enrollments',
        icon: TicketCheck,
      },
    ],
  },
  {
    label: 'Program',
    items: [
      {
        title: 'Program Kelas',
        href: '/dashboard/classes',
        icon: GraduationCap,
      },
      {
        title: 'Event & Workshop',
        href: '/dashboard/events',
        icon: CalendarDays,
      },
    ],
  },
  {
    label: 'Pengguna & Sistem',
    items: [
      {
        title: 'Data Siswa',
        href: '/dashboard/students',
        icon: UsersRound,
      },
      {
        title: 'Data Guru',
        href: '/dashboard/teachers',
        icon: School,
      },
      {
        title: 'WhatsApp Gateway',
        href: '/dashboard/whatsapp',
        icon: MessageCircle,
      },
    ],
  },
];

interface SidebarContentProps {
  onNavigate?: () => void;
}

function SidebarContent({ onNavigate }: SidebarContentProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col justify-between bg-card text-card-foreground">
      {/* Brand & Logo Header */}
      <div>
        <div className="flex items-center gap-2.5 border-b border-border/80 px-4 py-3.5">
          <Image
            src="/images/mylogo.webp"
            alt="LKP SlangTech Logo"
            width={32}
            height={32}
            className="size-8 shrink-0 object-contain rounded-full"
            priority
          />
          <span className="text-lg font-bold tracking-tight text-foreground">SlangTech</span>
        </div>

        {/* Navigation Groups */}
        <nav className="space-y-5 px-3 py-4">
          {navigationGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-emerald-50 text-emerald-800 font-semibold dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-105',
                          isActive
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-muted-foreground group-hover:text-foreground',
                        )}
                      />
                      <span className="truncate">{item.title}</span>
                      {isActive && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer / Logout */}
      <div className="border-t border-border/80 p-3">
        <LogoutButton
          variant="outline"
          className="w-full justify-center text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
        />
      </div>
    </div>
  );
}

export function DashboardSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed left-4 top-3 z-50 bg-card shadow-xs md:hidden"
            aria-label="Buka Menu Navigasi"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-56 p-0">
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 border-r border-border/80 bg-card md:flex md:flex-col">
        <SidebarContent />
      </aside>
    </>
  );
}
