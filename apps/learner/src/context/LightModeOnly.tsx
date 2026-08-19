import { useEffect, type ReactNode } from 'react';

const STORAGE_KEY = 'lms_theme';

export function LightModeOnly({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem(STORAGE_KEY, 'light');
  }, []);

  return <>{children}</>;
}
