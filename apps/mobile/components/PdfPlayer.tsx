import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { CheckCircle } from 'lucide-react-native';

interface PdfPlayerProps {
  uri: string;
  onAcknowledge?: () => void;
}

export function PdfPlayer({ uri, onAcknowledge }: PdfPlayerProps) {
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <View className="flex-1">
      <WebView
        source={{ uri }}
        style={{ flex: 1 }}
        onScroll={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 50) {
            setScrolledToEnd(true);
          }
        }}
      />
      <View className="p-4 bg-white border-t border-slate-200">
        {!scrolledToEnd && (
          <Text className="text-sm text-amber-600 mb-2">Scroll to the bottom to acknowledge this policy</Text>
        )}
        <TouchableOpacity
          disabled={!scrolledToEnd || acknowledged}
          onPress={() => { setAcknowledged(true); onAcknowledge?.(); }}
          className={`py-3 rounded-xl items-center ${scrolledToEnd && !acknowledged ? 'bg-indigo-600' : 'bg-slate-200'}`}
        >
          {acknowledged ? (
            <View className="flex-row items-center gap-2">
              <CheckCircle color="#10b981" size={18} />
              <Text className="text-emerald-600 font-semibold">Policy Acknowledged</Text>
            </View>
          ) : (
            <Text className={`font-semibold ${scrolledToEnd ? 'text-white' : 'text-slate-400'}`}>
              I Acknowledge This Policy
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
