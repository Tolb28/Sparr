import { useWindowDimensions } from 'react-native';

export const breakpoints = {
  sm: 360,  // standard phone
  md: 480,  // large phone / fold-closed boundary
  lg: 640,  // fold-open (Galaxy Fold ~673dp unfolded portrait)
  xl: 840,  // tablet
} as const;

export type Breakpoint = keyof typeof breakpoints;

/** Returns the current breakpoint based on screen width. Recalculates on orientation/fold changes. */
export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  if (width >= breakpoints.xl) return 'xl';
  if (width >= breakpoints.lg) return 'lg';
  if (width >= breakpoints.md) return 'md';
  return 'sm';
}

/** Returns `wide` value when screen width >= md (fold-open or tablet), `narrow` otherwise. */
export function useResponsiveValue<T>(narrow: T, wide: T): T {
  const { width } = useWindowDimensions();
  return width >= breakpoints.md ? wide : narrow;
}

/**
 * Style to center and cap content width on wider screens.
 * Apply to a wrapper View inside the root ScrollView/View to
 * prevent content stretching to full width on fold-open/tablet.
 */
export const contentContainerStyle = {
  maxWidth: 560,
  width: '100%' as const,
  alignSelf: 'center' as const,
};
