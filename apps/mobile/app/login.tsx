import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { GraduationCap } from 'lucide-react-native';
import { login } from '../lib/api';
import { useTheme } from '../context/ThemeContext';

export default function LoginScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const [email, setEmail] = useState('learner@example.com');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await login(email);
      if (result.user.role !== 'LEARNER' && result.user.role !== 'LMS_ADMIN') {
        setError('This app is for learners. Admins should use the web portal.');
        return;
      }
      router.replace('/(tabs)/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
      style={{ backgroundColor: c.primary }}
    >
      <View className="flex-1 justify-center px-6">
        <View className="items-center mb-8">
          <View className="w-16 h-16 bg-white/20 rounded-2xl items-center justify-center mb-4">
            <GraduationCap color="#ffffff" size={32} />
          </View>
          <Text className="text-white text-2xl font-bold">ProLMS</Text>
          <Text className="mt-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Sign in to your training
          </Text>
        </View>

        <View className="rounded-2xl p-6" style={{ backgroundColor: c.card }}>
          <Text className="text-sm font-medium mb-2" style={{ color: c.text }}>
            Email
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="learner@example.com"
            className="rounded-xl px-4 py-3 mb-4 border"
            style={{
              borderColor: c.border,
              color: c.text,
              backgroundColor: c.bg,
            }}
            placeholderTextColor={c.muted}
          />

          {error ? (
            <Text className="text-sm mb-3" style={{ color: c.danger }}>
              {error}
            </Text>
          ) : null}

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            className="py-3.5 rounded-xl items-center"
            style={{ backgroundColor: c.primary }}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-semibold">Sign In</Text>
            )}
          </TouchableOpacity>

          <Text className="text-xs text-center mt-4" style={{ color: c.muted }}>
            Demo: learner@example.com
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
