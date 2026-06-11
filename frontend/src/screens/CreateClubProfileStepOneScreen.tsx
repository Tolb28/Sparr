import React, { useState } from 'react';
import { ScrollView, View, Pressable, StyleSheet, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { GlassCard } from '@/components/ui/glass-card';
import { SparrButton } from '@/components/ui/sparr-button';
import { useThemeColors } from '@/src/hooks/useThemeColors';

export default function CreateClubProfileStepOneScreen() {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [joinPolicy, setJoinPolicy] = useState<'open' | 'approval'>('open');
  const [error, setError] = useState<string | null>(null);

  const handleContinue = () => {
    if (!title.trim()) {
      setError('Club name is required');
      return;
    }

    navigation.navigate('CreateClubStepTwo', {
      title: title.trim(),
      location: location.trim() || null,
      bio: bio.trim() || null,
      joinPolicy,
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: c.background.secondary }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: (insets.top || 0) + 4, borderBottomColor: c.border.light }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.iconBtn, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
          <Text style={[styles.headerTitle, { color: c.text.primary }]}>Create Club · Step 1/2</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Step indicator */}
        <View style={styles.stepBar}>
          <View style={[styles.stepDot, styles.stepActive, { backgroundColor: c.primary.main, borderColor: c.primary.main }]} />
          <View style={[styles.stepLine, { backgroundColor: c.glass.border }]} />
          <View style={[styles.stepDot, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]} />
        </View>

        <View style={styles.body}>
          <Text style={[styles.pageTitle, { color: c.text.primary }]}>Club Basics</Text>
          <Text style={[styles.pageSub, { color: c.text.secondary }]}>Set the key details first, then add avatar and finish.</Text>

          {!!error && (
            <GlassCard variant="red" radius={10} padding={12}>
              <Text style={styles.errorText}>{error}</Text>
            </GlassCard>
          )}

          <GlassCard variant="medium" radius={14} padding={16}>
            <Text style={[styles.label, { color: c.text.secondary }]}>Club Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.glass.surface, borderColor: c.glass.border, color: c.text.primary }]}
              value={title}
              onChangeText={(t) => { setTitle(t); setError(null); }}
              placeholder="Club name"
              placeholderTextColor={c.text.tertiary}
            />

            <Text style={[styles.label, { marginTop: 14, color: c.text.secondary }]}>Location</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.glass.surface, borderColor: c.glass.border, color: c.text.primary }]}
              value={location}
              onChangeText={setLocation}
              placeholder="Location"
              placeholderTextColor={c.text.tertiary}
            />

            <Text style={[styles.label, { marginTop: 14, color: c.text.secondary }]}>Bio</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline, { backgroundColor: c.glass.surface, borderColor: c.glass.border, color: c.text.primary }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell athletes about your club..."
              placeholderTextColor={c.text.tertiary}
              multiline
              numberOfLines={3}
            />
          </GlassCard>

          <GlassCard variant="medium" radius={14} padding={16}>
            <Text style={[styles.label, { color: c.text.secondary }]}>Join Policy</Text>
            <View style={styles.policyRow}>
              <Pressable
                style={[
                  styles.policyBtn,
                  { borderColor: c.glass.border, backgroundColor: c.glass.surface },
                  joinPolicy === 'open' && { borderColor: c.primary.main, backgroundColor: c.glass.redSurface },
                ]}
                onPress={() => setJoinPolicy('open')}
              >
                <Ionicons name="people-outline" size={16} color={joinPolicy === 'open' ? c.primary.main : c.text.secondary} />
                <Text style={[styles.policyText, { color: c.text.secondary }, joinPolicy === 'open' && { color: c.primary.main }]}>Open</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.policyBtn,
                  { borderColor: c.glass.border, backgroundColor: c.glass.surface },
                  joinPolicy === 'approval' && { borderColor: c.primary.main, backgroundColor: c.glass.redSurface },
                ]}
                onPress={() => setJoinPolicy('approval')}
              >
                <Ionicons name="shield-checkmark-outline" size={16} color={joinPolicy === 'approval' ? c.primary.main : c.text.secondary} />
                <Text style={[styles.policyText, { color: c.text.secondary }, joinPolicy === 'approval' && { color: c.primary.main }]}>Approval</Text>
              </Pressable>
            </View>
          </GlassCard>

          <SparrButton label="Continue" variant="primary" onPress={handleContinue} fullWidth />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 6,
  },
  stepDot: {
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 1,
  },
  stepActive: { width: 24 },
  stepLine: { width: 32, height: 2 },
  body: { padding: 16, gap: 14 },
  pageTitle: { fontSize: 22, fontWeight: '800' },
  pageSub: { fontSize: 13, marginTop: -6 },
  errorText: { color: '#ffb3b3', fontSize: 13 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6, textTransform: 'uppercase' },
  input: {
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  inputMultiline: { height: 72, textAlignVertical: 'top', paddingTop: 10 },
  policyRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  policyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1,
  },
  policyText: { fontWeight: '600', fontSize: 13 },
});
