'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === 'dark';
  const Icon = isDark ? Moon : Sun;

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={isDark ? 'Aktifkan tema terang' : 'Aktifkan tema gelap'}
      disabled={!mounted}
      onClick={toggleTheme}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
