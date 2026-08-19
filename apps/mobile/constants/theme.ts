export const colors = {
  light: {
    bg: '#f8fafc',
    card: '#ffffff',
    text: '#0f172a',
    muted: '#64748b',
    border: '#e2e8f0',
    primary: '#0d9488',
    primarySoft: '#ccfbf1',
    accent: '#0369a1',
    success: '#059669',
    warning: '#d97706',
    danger: '#e11d48',
    tabBar: '#ffffff',
    header: '#ffffff',
  },
  dark: {
    bg: '#0f172a',
    card: '#1e293b',
    text: '#f8fafc',
    muted: '#94a3b8',
    border: '#334155',
    primary: '#2dd4bf',
    primarySoft: '#134e4a',
    accent: '#38bdf8',
    success: '#34d399',
    warning: '#fbbf24',
    danger: '#fb7185',
    tabBar: '#1e293b',
    header: '#1e293b',
  },
};

export type ThemeColors = typeof colors.light;
