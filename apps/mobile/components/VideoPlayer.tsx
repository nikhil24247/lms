import { useRef, useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { ProgressBar } from './ui';

interface VideoPlayerProps {
  uri: string;
  enrollmentId?: string;
  onComplete?: () => void;
}

export function VideoPlayer({ uri, enrollmentId, onComplete }: VideoPlayerProps) {
  const { c } = useTheme();
  const videoRef = useRef<Video>(null);
  const [completed, setCompleted] = useState(false);
  const [progress, setProgress] = useState(0);
  const resumeKey = enrollmentId ? `lms_video_pos_${enrollmentId}` : null;

  useEffect(() => {
    if (!resumeKey) return;
    AsyncStorage.getItem(resumeKey).then(async (raw) => {
      const pos = raw ? Number(raw) : 0;
      if (pos > 1000 && videoRef.current) {
        try {
          await videoRef.current.setPositionAsync(pos);
        } catch {
          // ignore
        }
      }
    });
  }, [resumeKey]);

  const handlePlaybackStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    const pct = status.durationMillis
      ? (status.positionMillis / status.durationMillis) * 100
      : 0;
    setProgress(pct);

    if (resumeKey && status.positionMillis % 5000 < 400) {
      AsyncStorage.setItem(resumeKey, String(status.positionMillis)).catch(() => {});
    }

    if (pct >= 90 && !completed) {
      setCompleted(true);
      if (resumeKey) AsyncStorage.removeItem(resumeKey).catch(() => {});
      onComplete?.();
    }
  };

  return (
    <View className="flex-1">
      <Video
        ref={videoRef}
        source={{ uri }}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        style={{ flex: 1, backgroundColor: '#000' }}
        onPlaybackStatusUpdate={handlePlaybackStatus}
      />
      <View className="p-4" style={{ backgroundColor: c.card }}>
        <ProgressBar progress={progress} color={c.primary} />
        {completed ? (
          <Text className="text-sm mt-2 font-medium" style={{ color: c.success }}>
            Video complete (90%+ watched)
          </Text>
        ) : (
          <Text className="text-xs mt-2" style={{ color: c.muted }}>
            Progress resumes if you leave and come back
          </Text>
        )}
      </View>
    </View>
  );
}
