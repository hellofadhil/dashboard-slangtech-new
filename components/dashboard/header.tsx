'use client';

import { LogoutButton } from '@/components/auth/logout-button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DashboardHeaderProps {
  adminEmail?: string;
}

export function DashboardHeader({ adminEmail }: DashboardHeaderProps) {
  const emailInitials = adminEmail ? adminEmail.slice(0, 2).toUpperCase() : 'AD';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:px-6">
      {/* Left side: Context badge */}
      <div className="flex items-center gap-2 pl-12 md:pl-0">
        {/* <span className="hidden text-xs font-medium text-muted-foreground sm:inline-block">
          Sistem Operasional LKP SlangTech
        </span> */}
      </div>

      {/* Right side: Actions & User Menu */}
      <div className="flex items-center gap-2.5">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-9 gap-2.5 px-2.5 sm:px-3"
              aria-label="Menu Akun Admin"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/80 dark:border dark:border-emerald-500/40 dark:text-emerald-300 shrink-0">
                {emailInitials}
              </div>
              <span className="hidden max-w-[120px] truncate text-xs font-medium text-foreground sm:inline-block">
                {adminEmail ? adminEmail.split('@')[0] : 'Admin'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-2.5 py-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-700 dark:bg-emerald-950/80 dark:border dark:border-emerald-500/40 dark:text-emerald-300 shrink-0">
                  {emailInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold leading-none text-foreground dark:text-foreground truncate">
                    {adminEmail ? adminEmail.split('@')[0] : 'Administrator'}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground truncate">
                    {adminEmail || 'admin@slangtech.asia'}
                  </p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <LogoutButton asMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
