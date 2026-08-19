import { View, Text, ScrollView } from 'react-native';

export function RichTextPlayer({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <ScrollView className="flex-1 p-4 bg-white">
      {lines.map((line, i) => {
        if (line.startsWith('# ')) {
          return <Text key={i} className="text-2xl font-bold text-slate-900 mt-4 mb-2">{line.slice(2)}</Text>;
        }
        if (line.startsWith('## ')) {
          return <Text key={i} className="text-lg font-semibold text-slate-800 mt-3 mb-1">{line.slice(3)}</Text>;
        }
        if (line.startsWith('- ')) {
          return <Text key={i} className="text-base text-slate-700 ml-4 my-1">• {line.slice(2)}</Text>;
        }
        if (line.trim() === '') return <View key={i} className="h-2" />;
        const rendered = line.replace(/\*\*(.*?)\*\*/g, '$1');
        return <Text key={i} className="text-base text-slate-700 leading-6 my-1">{rendered}</Text>;
      })}
    </ScrollView>
  );
}
