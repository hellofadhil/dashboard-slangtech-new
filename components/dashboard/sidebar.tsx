'use client';

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

const navigation = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Classes',
    href: '/dashboard/classes',
    icon: GraduationCap,
  },
  {
    title: 'Events',
    href: '/dashboard/events',
    icon: CalendarDays,
  },
  {
    title: 'Class Enrollments',
    href: '/dashboard/enrollments',
    icon: ClipboardList,
  },
  {
    title: 'Event Enrollments',
    href: '/dashboard/event-enrollments',
    icon: TicketCheck,
  },
  {
    title: 'Students',
    href: '/dashboard/students',
    icon: UsersRound,
  },
  {
    title: 'Teachers',
    href: '/dashboard/teachers',
    icon: School,
  },
  {
    title: 'WhatsApp',
    href: '/dashboard/whatsapp',
    icon: MessageCircle,
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col gap-6 bg-sidebar py-5 text-sidebar-foreground">
      <div className="px-3">
        <p className="text-lg font-bold text-foreground">Hi, Admin</p>
        <p className="text-sm text-muted-foreground">LKP SlangTech</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Button
              key={item.href}
              variant={isActive ? 'default' : 'ghost'}
              className={cn(
                'justify-start gap-2',
                !isActive && 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isActive && 'shadow-xs',
              )}
              asChild
            >
              <Link href={item.href} onClick={onNavigate}>
                <Icon className="h-4 w-4" />
                {item.title}
              </Link>
            </Button>
          );
        })}
      </nav>
      <div className="space-y-1 px-2">
        <LogoutButton className="text-muted-foreground" />
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
          <Button variant="outline" size="icon" className="fixed left-4 top-3 z-50 bg-card md:hidden" aria-label="Buka Menu">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0">
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
        <SidebarContent />
      </aside>
    </>
  );
}
