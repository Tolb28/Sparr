import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { GlassCard } from '@/components/ui/glass-card';
import { SparrButton } from '@/components/ui/sparr-button';
import { RootStackParamList } from '../navigation/AppNavigator';
import { createClubTrainingPlan } from '../api/clubs';
import { colors } from '@/src/theme/colors';

type RouteType = RouteProp<RootStackParamList, 'CreateClubPlan'>;

export default function CreateClubPlanScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteType>();
  const { clubId } = route.params;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a plan name.');
      return;
    }
    try {
      setLoading(true);
      await createClubTrainingPlan(clubId, {
        title: title.trim(),
        description: description.trim() || undefined,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Unable to create plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: (insets.top || 0) + 4 }]}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>New Training Plan</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.body}>
        {/* Icon */}
        <View style={styles.iconHero}>
          <View style={styles.iconCircle}>
            <Ionicons name="barbell" size={32} color={colors.primary.main} />
          </View>
          <Text style={styles.heroTitle}>Create a Club Training Plan</Text>
          <Text style={styles.heroSub}>
            Build a structured training calendar your members can copy to their own schedule.
          </Text>
        </View>

        <GlassCard variant="medium" radius={14} padding={16}>
          <Text style={styles.label}>Plan Name</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Beginner Boxing 8-Week"
            placeholderTextColor={colors.text.tertiary}
            autoFocus
            returnKeyType="next"
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="What is this plan for? Who is it designed for?"
            placeholderTextColor={colors.text.tertiary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </GlassCard>

        <SparrButton
          label="Create Plan"
          variant="primary"
          onPress={handleCreate}
          loading={loading}
          fullWidth
        />

        <Text style={styles.hint}>
          After creating, you can add individual training sessions from the club's Schedule tab.
        </Text>
      </View>
    </KeyboardAvoidingView>
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

  body: { padding: 16, gap: 14 },

  iconHero: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.glass.redSurface,
    borderWidth: 1.5, borderColor: colors.glass.redBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { color: colors.text.primary, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  heroSub: { color: colors.text.secondary, fontSize: 13, textAlign: 'center', lineHeight: 20 },

  label: {
    color: colors.text.secondary, fontSize: 11, fontWeight: '700',
    letterSpacing: 0.8, marginBottom: 6, textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.glass.surface, borderRadius: 10,
    borderWidth: 1, borderColor: colors.glass.border,
    color: colors.text.primary, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  multiline: { height: 80, paddingTop: 10 },

  hint: {
    color: colors.text.tertiary, fontSize: 12, textAlign: 'center', lineHeight: 18,
    paddingHorizontal: 8,
  },
});
