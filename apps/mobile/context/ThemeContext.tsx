import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, type ThemeColors } from '../constants/theme';

type Mode = 'light' | 'dark' | 'system';

type ThemeCtx = {
  mode: Mode;
  isDark: boolean;
  c: ThemeColors;
  setMode: (m: Mode) => void;
};

const Ctx = createContext<ThemeCtx | null>(null);
const KEY = 'lms_theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<Mode>('system');

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (v === 'light' || v === 'dark' || v === 'system') setModeState(v);
    });
  }, []);

  const setMode = (m: Mode) => {
    setModeState(m);
    AsyncStorage.setItem(KEY, m).catch(() => {});
  };

  const isDark = mode === 'system' ? system === 'dark' : mode === 'dark';
  const value = useMemo(
    () => ({ mode, isDark, c: isDark ? colors.dark : colors.light, setMode }),
    [mode, isDark],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme outside provider');
  return ctx;
}
