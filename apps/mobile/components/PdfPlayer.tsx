import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';

interface PdfPlayerProps {
  uri: string;
  alreadyComplete?: boolean;
  onAcknowledge?: (signatureText?: string) => void;
}

export function PdfPlayer({ uri, alreadyComplete = false, onAcknowledge }: PdfPlayerProps) {
  const { c } = useTheme();
  const [scrolledToEnd, setScrolledToEnd] = useState(alreadyComplete);
  const [acknowledged, setAcknowledged] = useState(alreadyComplete);
  const [agreed, setAgreed] = useState(alreadyComplete);
  const [signature, setSignature] = useState('');

  return (
    <View className="flex-1">
      <WebView
        source={{ uri }}
        style={{ flex: 1 }}
        originWhitelist={['*']}
        onScroll={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 50) {
            setScrolledToEnd(true);
          }
        }}
      />
      <View className="p-4 border-t" style={{ backgroundColor: c.card, borderColor: c.border }}>
        {!scrolledToEnd && !acknowledged ? (
          <Text className="text-sm mb-2" style={{ color: c.warning }}>
            Scroll to the bottom to acknowledge this policy
          </Text>
        ) : null}
        <TouchableOpacity
          onPress={() => setAgreed((v) => !v)}
          disabled={acknowledged}
          className="flex-row items-center gap-2 mb-3"
        >
          <View
            className="w-5 h-5 rounded border items-center justify-center"
            style={{
              borderColor: agreed ? c.primary : c.border,
              backgroundColor: agreed ? c.primary : c.card,
            }}
          >
            {agreed ? <Text className="text-white text-xs font-bold">✓</Text> : null}
          </View>
          <Text className="text-sm flex-1" style={{ color: c.text }}>
            I have read and agree to this policy
          </Text>
        </TouchableOpacity>
        <TextInput
          placeholder="Type your full name to sign"
          placeholderTextColor={c.muted}
          value={signature}
          editable={!acknowledged}
          onChangeText={setSignature}
          className="rounded-xl border px-3 py-2.5 mb-3 text-sm"
          style={{ color: c.text, borderColor: c.border, backgroundColor: c.bg }}
        />
        <TouchableOpacity
          disabled={!scrolledToEnd || !agreed || !signature.trim() || acknowledged}
          onPress={() => {
            setAcknowledged(true);
            onAcknowledge?.(signature.trim());
          }}
          className="py-3 rounded-xl items-center"
          style={{
            backgroundColor:
              scrolledToEnd && agreed && signature.trim() && !acknowledged ? c.primary : c.border,
          }}
        >
          {acknowledged ? (
            <View className="flex-row items-center gap-2">
              <CheckCircle color={c.success} size={18} />
              <Text className="font-semibold" style={{ color: c.success }}>
                Policy acknowledged
              </Text>
            </View>
          ) : (
            <Text
              className="font-semibold"
              style={{
                color: scrolledToEnd && agreed && signature.trim() ? '#fff' : c.muted,
              }}
            >
              Acknowledge & sign
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
