import React from 'react';
import { View } from 'react-native';
import { SparrButton } from '@/components/ui/sparr-button';
import { GlassCard } from '@/components/ui/glass-card';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/src/hooks/useThemeColors';

interface MembershipCTAProps {
  club: any;
  canManage: boolean;
  joining?: boolean;
  leaving?: boolean;
  onJoin?: () => void;
  onLeave?: () => void;
  onManage?: () => void;
}

export default function MembershipCTA({ club, canManage, joining, leaving, onJoin, onLeave }: MembershipCTAProps) {
  const c = useThemeColors();
  if (canManage) {
    return (
      <GlassCard variant="medium" radius={12} padding={12}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: c.text.primary, fontWeight: '700' }}>You manage this club</Text>
        </View>
      </GlassCard>
    );
  }

  const isMember = club?.join_status === 'member';
  const isRequested = club?.join_status === 'requested';

  if (isMember) {
    return (
      <SparrButton
        label="Leave Club"
        variant="outline"
        loading={leaving}
        onPress={onLeave}
        disabled={leaving}
        fullWidth
      />
    );
  }

  if (isRequested) {
    return (
      <SparrButton
        label="Requested"
        variant="outline"
        disabled
        fullWidth
      />
    );
  }

  return (
    <SparrButton
      label={(club?.join_policy || 'open') === 'open' ? 'Join Club' : 'Request to Join'}
      variant="primary"
      loading={joining}
      onPress={onJoin}
      disabled={joining}
      fullWidth
    />
  );
}
