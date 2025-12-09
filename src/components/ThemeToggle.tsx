'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'venue-theme';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    let initial: Theme = 'light';

    if (stored === 'light' || stored === 'dark') {
      initial = stored;
    }

    document.documentElement.dataset.theme = initial;
    setTheme(initial);
    setMounted(true);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  if (!mounted) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="btn btn--ghost"
      style={{ fontSize: '0.8rem', paddingInline: '0.8rem' }}
    >
      {theme === 'light' ? 'Dark mode' : 'Light mode'}
    </button>
  );
}
