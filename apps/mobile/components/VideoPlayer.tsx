import { useRef, useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { ProgressBar } from './ui';

interface VideoPlayerProps {
  uri: string;
  enrollmentId?: string;
  moduleId?: string;
  alreadyComplete?: boolean;
  onComplete?: () => void;
}

export function VideoPlayer({
  uri,
  enrollmentId,
  moduleId,
  alreadyComplete = false,
  onComplete,
}: VideoPlayerProps) {
  const { c } = useTheme();
  const videoRef = useRef<Video>(null);
  const [completed, setCompleted] = useState(alreadyComplete);
  const [progress, setProgress] = useState(alreadyComplete ? 100 : 0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firedRef = useRef(alreadyComplete);
  const resumeKey =
    enrollmentId || moduleId
      ? `lms_video_pos_${enrollmentId ?? 'x'}_${moduleId ?? 'root'}`
      : null;

  useEffect(() => {
    setError(null);
    setReady(false);
  }, [uri]);

  useEffect(() => {
    if (!resumeKey || !ready || alreadyComplete) return;
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
  }, [resumeKey, ready, alreadyComplete]);

  const handlePlaybackStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        setError(
          `Cannot play video. Phone must reach MinIO on your Mac Wi‑Fi.\n${uri}\n${status.error}`,
        );
      }
      return;
    }
    if (!ready) setReady(true);
    setError(null);

    const pct = status.durationMillis
      ? (status.positionMillis / status.durationMillis) * 100
      : 0;
    setProgress(pct);

    if (resumeKey && !completed && status.positionMillis % 5000 < 400) {
      AsyncStorage.setItem(resumeKey, String(status.positionMillis)).catch(() => {});
    }

    if (pct >= 90 && !firedRef.current) {
      firedRef.current = true;
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
        shouldPlay
        resizeMode={ResizeMode.CONTAIN}
        style={{ flex: 1, backgroundColor: '#000' }}
        onPlaybackStatusUpdate={handlePlaybackStatus}
        onError={(err) =>
          setError(`Cannot play video. Check Wi‑Fi and MinIO.\n${uri}\n${err}`)
        }
      />
      <View className="p-4" style={{ backgroundColor: c.card }}>
        {error ? (
          <Text className="text-xs leading-5" style={{ color: c.danger }}>
            {error}
          </Text>
        ) : (
          <>
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
          </>
        )}
      </View>
    </View>
  );
}
