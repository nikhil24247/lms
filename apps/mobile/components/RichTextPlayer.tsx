import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

export function RichTextPlayer({
  content,
  alreadyComplete = false,
  onComplete,
}: {
  content: string;
  alreadyComplete?: boolean;
  onComplete?: () => void;
}) {
  const { c } = useTheme();
  const [done, setDone] = useState(alreadyComplete);
  const lines = content.split('\n');

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      {lines.map((line, i) => {
        if (line.startsWith('# ')) {
          return (
            <Text key={i} className="text-2xl font-bold mt-4 mb-2" style={{ color: c.text }}>
              {line.slice(2)}
            </Text>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <Text key={i} className="text-lg font-semibold mt-3 mb-1" style={{ color: c.text }}>
              {line.slice(3)}
            </Text>
          );
        }
        if (line.startsWith('- ')) {
          return (
            <Text key={i} className="text-base ml-4 my-1" style={{ color: c.text }}>
              • {line.slice(2)}
            </Text>
          );
        }
        if (line.trim() === '') return <View key={i} className="h-2" />;
        const rendered = line.replace(/\*\*(.*?)\*\*/g, '$1');
        return (
          <Text key={i} className="text-base leading-6 my-1" style={{ color: c.text }}>
            {rendered}
          </Text>
        );
      })}

      <TouchableOpacity
        disabled={done}
        onPress={() => {
          setDone(true);
          onComplete?.();
        }}
        className="mt-6 py-3.5 rounded-xl items-center"
        style={{ backgroundColor: done ? c.border : c.primary }}
      >
        {done ? (
          <View className="flex-row items-center gap-2">
            <CheckCircle color={c.success} size={18} />
            <Text className="font-semibold" style={{ color: c.success }}>
              Lesson completed
            </Text>
          </View>
        ) : (
          <Text className="text-white font-semibold">Mark lesson complete</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
