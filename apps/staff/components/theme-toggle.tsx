'use client';

import { Button } from '@workspace/ui';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 px-0 text-muted-foreground sm:w-auto sm:px-3"
        aria-label="Switch theme"
      >
        <Sun className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">Light Mode</span>
      </Button>
    );
  }

  const isDark = theme === 'dark';

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 px-0 text-muted-foreground hover:text-foreground sm:w-auto sm:px-3"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <>
          <Sun className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Light Mode</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Dark Mode</span>
        </>
      )}
    </Button>
  );
}
