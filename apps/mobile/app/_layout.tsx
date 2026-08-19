import 'react-native-gesture-handler';
import { useEffect, useState, type ReactNode } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { useSyncQueue } from '../hooks/useSyncQueue';
import { loadStoredToken, onAuthChange, getCurrentUser, clearAuthToken } from '../lib/api';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import '../global.css';

const queryClient = new QueryClient();

function SyncListener() {
  useSyncQueue();
  return null;
}

function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();
  const { c, isDark } = useTheme();

  useEffect(() => {
    loadStoredToken()
      .then(async (token) => {
        if (!token) {
          setAuthenticated(false);
          return;
        }
        try {
          await getCurrentUser();
          setAuthenticated(true);
        } catch {
          await clearAuthToken();
          setAuthenticated(false);
        }
      })
      .finally(() => setReady(true));
    const unsub = onAuthChange((authed) => setAuthenticated(authed));
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!ready || !navState?.key) return;

    const inAuthGroup = segments[0] === 'login';
    const atRoot = (segments as string[]).length === 0;

    if (!authenticated && !inAuthGroup) {
      router.replace('/login');
    } else if (authenticated && (inAuthGroup || atRoot)) {
      router.replace('/(tabs)/home');
    }
  }, [ready, authenticated, segments, router, navState?.key]);

  if (!ready || !navState?.key) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: c.bg }}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthGate>
          <SyncListener />
          <Stack screenOptions={{ headerBackTitle: 'Back' }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="course/[id]/index" options={{ title: 'Training' }} />
            <Stack.Screen name="course/[id]/module/[moduleId]" options={{ title: 'Learn' }} />
          </Stack>
        </AuthGate>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
