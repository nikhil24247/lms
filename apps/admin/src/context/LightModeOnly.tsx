import { useEffect, type ReactNode } from 'react';

const STORAGE_KEY = 'lms_theme';

/** App is light-mode only — clears any saved dark preference. */
export function LightModeOnly({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem(STORAGE_KEY, 'light');
  }, []);

  return <>{children}</>;
}
