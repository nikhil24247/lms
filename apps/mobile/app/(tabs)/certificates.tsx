import { View, Text, ScrollView, TouchableOpacity, Linking, Share, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Award, Download, Share2 } from 'lucide-react-native';
import { getMyCertificates } from '../../lib/api';
import { ScreenLoader } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';

export default function CertificatesScreen() {
  const { c } = useTheme();
  const { data: certs, isLoading, error } = useQuery({
    queryKey: ['my-certificates'],
    queryFn: getMyCertificates,
  });

  if (isLoading) return <ScreenLoader />;

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-6" style={{ backgroundColor: c.bg }}>
        <Text style={{ color: c.danger }}>
          {error instanceof Error ? error.message : 'Failed to load certificates'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1" style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 16 }}>
      {(certs ?? []).map((cert) => (
        <View
          key={cert.id}
          className="rounded-2xl p-4 mb-3 border"
          style={{ backgroundColor: c.card, borderColor: c.border }}
        >
          <View className="flex-row items-start gap-3">
            <View className="p-3 rounded-xl" style={{ backgroundColor: c.primarySoft }}>
              <Award color={c.primary} size={22} />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-base" style={{ color: c.text }}>
                {cert.training.title}
              </Text>
              <Text className="text-xs mt-1" style={{ color: c.muted }}>
                {cert.type === 'COMPLETION_PASS' ? 'Completion' : 'Participation'}
                {cert.score != null ? ` · ${Math.round(cert.score)}%` : ''}
              </Text>
              <Text className="text-xs mt-1" style={{ color: c.muted }}>
                {new Date(cert.issuedAt).toLocaleDateString()}
              </Text>
              <Text className="text-[10px] mt-1" style={{ color: c.muted }}>
                ID: {cert.certificateNumber}
              </Text>
            </View>
          </View>
          <View className="flex-row gap-2 mt-3">
            {cert.pdfUrl ? (
              <>
                <TouchableOpacity
                  onPress={() => Linking.openURL(cert.pdfUrl!)}
                  className="flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-xl"
                  style={{ backgroundColor: c.primarySoft }}
                >
                  <Download color={c.primary} size={16} />
                  <Text className="font-semibold text-sm" style={{ color: c.primary }}>
                    View / Download
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    Share.share({
                      message: `Certificate: ${cert.training.title}\n${cert.pdfUrl}`,
                      url: Platform.OS === 'ios' ? cert.pdfUrl! : undefined,
                    })
                  }
                  className="px-4 py-2.5 rounded-xl border"
                  style={{ borderColor: c.border }}
                >
                  <Share2 color={c.text} size={16} />
                </TouchableOpacity>
              </>
            ) : (
              <Text className="text-sm" style={{ color: c.muted }}>
                PDF not available
              </Text>
            )}
          </View>
        </View>
      ))}

      {(!certs || certs.length === 0) && (
        <View className="items-center py-16">
          <Award color={c.border} size={48} />
          <Text className="mt-3 font-medium" style={{ color: c.text }}>
            No certificates yet
          </Text>
          <Text className="text-sm mt-1 text-center" style={{ color: c.muted }}>
            Complete training to earn certificates
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
