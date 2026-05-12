import React, { useState } from 'react';
import { ScrollView, View, Pressable, StyleSheet, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { GlassCard } from '@/components/ui/glass-card';
import { SparrButton } from '@/components/ui/sparr-button';
import { colors } from '@/src/theme/colors';

export default function CreateClubProfileStepOneScreen() {
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
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: (insets.top || 0) + 4 }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Create Club · Step 1/2</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Step indicator */}
        <View style={styles.stepBar}>
          <View style={[styles.stepDot, styles.stepActive]} />
          <View style={styles.stepLine} />
          <View style={styles.stepDot} />
        </View>

        <View style={styles.body}>
          <Text style={styles.pageTitle}>Club Basics</Text>
          <Text style={styles.pageSub}>Set the key details first, then add avatar and finish.</Text>

          {!!error && (
            <GlassCard variant="red" radius={10} padding={12}>
              <Text style={styles.errorText}>{error}</Text>
            </GlassCard>
          )}

          <GlassCard variant="medium" radius={14} padding={16}>
            <Text style={styles.label}>Club Name *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={(t) => { setTitle(t); setError(null); }}
              placeholder="Club name"
              placeholderTextColor={colors.text.tertiary}
            />

            <Text style={[styles.label, { marginTop: 14 }]}>Location</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Location"
              placeholderTextColor={colors.text.tertiary}
            />

            <Text style={[styles.label, { marginTop: 14 }]}>Bio</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell athletes about your club..."
              placeholderTextColor={colors.text.tertiary}
              multiline
              numberOfLines={3}
            />
          </GlassCard>

          <GlassCard variant="medium" radius={14} padding={16}>
            <Text style={styles.label}>Join Policy</Text>
            <View style={styles.policyRow}>
              <Pressable
                style={[styles.policyBtn, joinPolicy === 'open' && styles.policyBtnActive]}
                onPress={() => setJoinPolicy('open')}
              >
                <Ionicons name="people-outline" size={16} color={joinPolicy === 'open' ? colors.primary.main : colors.text.secondary} />
                <Text style={[styles.policyText, joinPolicy === 'open' && styles.policyTextActive]}>Open</Text>
              </Pressable>
              <Pressable
                style={[styles.policyBtn, joinPolicy === 'approval' && styles.policyBtnActive]}
                onPress={() => setJoinPolicy('approval')}
              >
                <Ionicons name="shield-checkmark-outline" size={16} color={joinPolicy === 'approval' ? colors.primary.main : colors.text.secondary} />
                <Text style={[styles.policyText, joinPolicy === 'approval' && styles.policyTextActive]}>Approval</Text>
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
  root: { flex: 1, backgroundColor: colors.background.secondary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border.light,
  },
  headerTitle: { color: colors.text.primary, fontSize: 16, fontWeight: '700' },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.glass.surface, borderWidth: 1, borderColor: colors.glass.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 6,
  },
  stepDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.glass.surface, borderWidth: 1, borderColor: colors.glass.border,
  },
  stepActive: { backgroundColor: colors.primary.main, borderColor: colors.primary.main, width: 24 },
  stepLine: { width: 32, height: 2, backgroundColor: colors.glass.border },
  body: { padding: 16, gap: 14 },
  pageTitle: { color: colors.text.primary, fontSize: 22, fontWeight: '800' },
  pageSub: { color: colors.text.secondary, fontSize: 13, marginTop: -6 },
  errorText: { color: '#ffb3b3', fontSize: 13 },
  label: { color: colors.text.secondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6, textTransform: 'uppercase' },
  input: {
    backgroundColor: colors.glass.surface, borderRadius: 10, borderWidth: 1,
    borderColor: colors.glass.border, color: colors.text.primary,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  inputMultiline: { height: 72, textAlignVertical: 'top', paddingTop: 10 },
  policyRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  policyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: colors.glass.border,
    backgroundColor: colors.glass.surface,
  },
  policyBtnActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.glass.redSurface,
  },
  policyText: { color: colors.text.secondary, fontWeight: '600', fontSize: 13 },
  policyTextActive: { color: colors.primary.main },
});
