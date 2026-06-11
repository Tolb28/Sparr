import React from 'react';
import { View, StyleSheet, ViewStyle, useWindowDimensions } from 'react-native';
import { Motion, MotionComponentProps } from '@legendapp/motion';
import { Button, ButtonText } from '@/components/ui/button';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { ProgressTimeframe } from '@/src/api/progress';

interface TimeframeToggleProps {
  activeTimeframe: ProgressTimeframe;
  onTimeframeChange: (timeframe: ProgressTimeframe) => void;
  disabled?: boolean;
}

type MotionViewProps = React.ComponentProps<typeof View> &
  MotionComponentProps<typeof View, ViewStyle, unknown, unknown, unknown>;

const MotionView = Motion.View as React.ComponentType<MotionViewProps>;

const TIMEFRAMES: { label: string; value: ProgressTimeframe }[] = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
  { label: 'All-time', value: 'lifetime' },
];

const TimeframeToggleBase: React.FC<TimeframeToggleProps> = ({
  activeTimeframe,
  onTimeframeChange,
  disabled = false,
}) => {
  const c = useThemeColors();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;

  return (
    <View style={[styles.container, isSmallScreen && styles.containerCompact]}>
      {TIMEFRAMES.map((option) => {
        const isActive = option.value === activeTimeframe;
        const handlePress = () => {
          if (disabled || isActive) return;
          onTimeframeChange(option.value);
        };

        return (
          <View key={option.value} style={{ flex: 1 }}>
            <MotionView
              animate={{ scale: isActive ? 1 : 0.96, opacity: isActive ? 1 : 0.78 }}
              transition={{ type: 'timing', duration: 200 }}
              style={{ flex: 1 }}
            >
              <Button
                size="sm"
                variant={isActive ? 'solid' : 'outline'}
                action={isActive ? 'primary' : 'secondary'}
                onPress={handlePress}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`${option.label} timeframe`}
                accessibilityState={{ disabled, selected: isActive }}
                testID={`TimeframeToggle_${option.value}`}
                className="rounded-full"
                style={[
                  styles.button,
                  { width: '100%' },
                  isSmallScreen && styles.buttonCompact,
                  isActive
                    ? { backgroundColor: c.primary.main, borderColor: c.primary.main }
                    : { backgroundColor: c.glass.surface, borderColor: c.glass.border },
                  disabled && styles.buttonDisabled,
                ]}
              >
                <ButtonText
                  numberOfLines={1}
                  ellipsizeMode="clip"
                  style={[
                    styles.buttonText,
                    isSmallScreen && styles.buttonTextCompact,
                    isActive
                      ? { color: '#fff', fontWeight: '600' }
                      : { color: c.text.secondary, fontWeight: '600' },
                  ]}
                >
                  {option.label.toUpperCase()}
                </ButtonText>
              </Button>
            </MotionView>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'nowrap',
  },
  containerCompact: {
    flexWrap: 'wrap',
    rowGap: 8,
    justifyContent: 'center',
  },
  button: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 10,
    minHeight: 44,
    borderWidth: 1,
  },
  buttonCompact: {
    paddingHorizontal: 8,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    fontSize: 11,
    letterSpacing: 0,
    textAlign: 'center',
  },
  buttonTextCompact: {
    fontSize: 11,
  },
});

export const TimeframeToggle = React.memo(TimeframeToggleBase);

export default TimeframeToggle;
