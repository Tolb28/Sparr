import { useColorScheme } from 'nativewind';
import { colors, lightColors } from '@/src/theme/colors';

export function useThemeColors() {
  const { colorScheme } = useColorScheme();
  return colorScheme === 'light' ? lightColors : colors;
}
