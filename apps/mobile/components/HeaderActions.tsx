import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Pressable } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Moon, Sun } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { getLearnerNotifications, markNotificationRead } from '../lib/api';

export function HeaderActions() {
  const { c, isDark, mode, setMode } = useTheme();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: notes } = useQuery({
    queryKey: ['learner-notifications'],
    queryFn: getLearnerNotifications,
    refetchInterval: 60_000,
  });

  const unread = (notes ?? []).filter((n) => !n.isRead).length;

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['learner-notifications'] }),
  });

  return (
    <View className="flex-row items-center gap-1 mr-1">
      <TouchableOpacity
        onPress={() => setMode(isDark ? 'light' : 'dark')}
        className="p-2"
        accessibilityLabel="Toggle theme"
      >
        {isDark ? <Sun color={c.text} size={20} /> : <Moon color={c.text} size={20} />}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setOpen(true)} className="p-2 relative">
        <Bell color={c.text} size={20} />
        {unread > 0 ? (
          <View
            className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full items-center justify-center px-1"
            style={{ backgroundColor: c.danger }}
          >
            <Text className="text-[9px] text-white font-bold">{unread > 9 ? '9+' : unread}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 bg-black/40" onPress={() => setOpen(false)} />
        <View
          className="absolute bottom-0 left-0 right-0 rounded-t-3xl max-h-[70%] p-4"
          style={{ backgroundColor: c.card }}
        >
          <Text className="text-lg font-bold mb-3" style={{ color: c.text }}>
            Notifications
          </Text>
          <ScrollView>
            {(notes ?? []).length === 0 ? (
              <Text className="text-sm py-8 text-center" style={{ color: c.muted }}>
                No notifications yet
              </Text>
            ) : (
              (notes ?? []).map((n) => (
                <TouchableOpacity
                  key={n.id}
                  onPress={() => !n.isRead && markRead.mutate(n.id)}
                  className="py-3 border-b"
                  style={{ borderColor: c.border }}
                >
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: n.isRead ? c.muted : c.text }}
                  >
                    {n.title}
                  </Text>
                  <Text className="text-xs mt-1" style={{ color: c.muted }}>
                    {n.body}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
          <Text className="text-[10px] text-center mt-2" style={{ color: c.muted }}>
            Theme: {mode}
          </Text>
        </View>
      </Modal>
    </View>
  );
}
