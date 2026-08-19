import { useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useSyncQueueStore } from '../stores/syncQueue.store';
import { syncQueue } from '../lib/api';

export function useSyncQueue() {
  const { items, removeItems } = useSyncQueueStore();

  const flush = useCallback(async () => {
    if (items.length === 0) return;

    try {
      await syncQueue(items);
      removeItems(items.length);
    } catch {
      // Will retry on next reconnect
    }
  }, [items, removeItems]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        flush();
      }
    });
    return () => unsubscribe();
  }, [flush]);

  return { pendingCount: items.length, flush };
}
