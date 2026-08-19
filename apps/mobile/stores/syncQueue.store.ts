import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SyncQueueItem } from '@lms/shared';

interface SyncQueueState {
  items: SyncQueueItem[];
  addItem: (item: Omit<SyncQueueItem, 'createdAt'> & { createdAt?: string }) => void;
  removeItems: (count: number) => void;
  clear: () => void;
}

export const useSyncQueueStore = create<SyncQueueState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => ({
          items: [
            ...state.items,
            { ...item, createdAt: item.createdAt ?? new Date().toISOString() },
          ],
        })),
      removeItems: (count) =>
        set((state) => ({ items: state.items.slice(count) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'lms-sync-queue',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
