'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" className="w-full justify-start text-muted-foreground">
        <Sun className="mr-3 h-4 w-4" />
        Light Mode
      </Button>
    );
  }

  const isDark = theme === 'dark';

  return (
    <Button
      variant="ghost"
      className="w-full justify-start text-muted-foreground hover:text-foreground"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? (
        <>
          <Sun className="mr-3 h-4 w-4" />
          Light Mode
        </>
      ) : (
        <>
          <Moon className="mr-3 h-4 w-4" />
          Dark Mode
        </>
      )}
    </Button>
  );
}
