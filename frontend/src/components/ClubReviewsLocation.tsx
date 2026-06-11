import React, { useEffect, useState } from 'react';
import { View, Linking, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { GlassCard } from '@/components/ui/glass-card';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import ConfirmationModal from '@/src/components/ConfirmationModal';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ClubReviewsLocation({ club, reviews }: { club: any; reviews?: any[] }) {
  const c = useThemeColors();
  const [list, setList] = useState(reviews ?? []);
  const [reviewInfoVisible, setReviewInfoVisible] = useState(false);
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    setList(reviews ?? []);
  }, [reviews]);

  const openMaps = () => {
    if (!club?.location) return;
    const q = encodeURIComponent(club.location);
    const url = `https://www.google.com/maps/search/?api=1&query=${q}`;
    Linking.openURL(url).catch(() => {});
  };

  const handleWriteReview = () => setReviewInfoVisible(true);

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
      <ConfirmationModal
        visible={reviewInfoVisible}
        title="Write Review"
        message="Review submissions coming soon! Share your experience once the feature is live."
        confirmText="Got it"
        cancelText="Close"
        onConfirm={() => setReviewInfoVisible(false)}
        onCancel={() => setReviewInfoVisible(false)}
      />
      <Text style={{ color: c.text.primary, fontWeight: '700', marginBottom: 8 }}>Location & Reviews</Text>

      <GlassCard variant="medium" radius={14} padding={12} style={{ marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: c.text.primary, fontWeight: '700' }}>{club?.location ?? 'No address'}</Text>
            {!!club?.website && <Text style={{ color: c.text.tertiary, marginTop: 4 }}>{club.website}</Text>}
          </View>
          <View>
            <Pressable onPress={openMaps} accessibilityRole="button" accessibilityLabel="Open in maps">
              <View style={{ backgroundColor: c.primary.main, padding: 8, borderRadius: 8 }}>
                <Ionicons name="map-outline" size={18} color="#fff" />
              </View>
            </Pressable>
          </View>
        </View>
      </GlassCard>

      <GlassCard variant="medium" radius={14} padding={12}>
        <View style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: c.text.primary, fontWeight: '700' }}>Reviews</Text>
          <Pressable onPress={handleWriteReview}>
            <Text style={{ color: c.primary.main, fontWeight: '700' }}>Write</Text>
          </Pressable>
        </View>

        {list.length === 0 ? (
          <Text style={{ color: c.text.tertiary }}>No reviews yet</Text>
        ) : (
          list.slice(0, 3).map((r, idx) => (
            <View key={String(r.id ?? idx)} style={[styles.reviewRow, { borderBottomColor: c.border.light }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text.primary, fontWeight: '700' }}>{r.author_name || 'User'}</Text>
                <Text style={{ color: c.text.tertiary, marginTop: 4 }}>{r.comment}</Text>
              </View>
              <View style={{ marginLeft: 8, alignItems: 'center' }}>
                <Text style={{ color: c.text.primary, fontWeight: '800' }}>{r.rating ?? '—'}</Text>
                <Text style={{ color: c.text.tertiary, fontSize: 11 }}>stars</Text>
              </View>
            </View>
          ))
        )}
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  reviewRow: { flexDirection: 'row', gap: 8, paddingVertical: 8, borderBottomWidth: 1 },
});
