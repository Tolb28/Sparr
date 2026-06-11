import { PixelRatio } from 'react-native';

/** Allow system font scaling up to 40% above design size, then cap. */
const MAX_SCALE = 1.4;

/**
 * Returns a font size that respects the system font-size preference
 * but caps at MAX_SCALE × base to protect tight layouts.
 */
export function scaledFont(base: number): number {
  const scale = Math.min(PixelRatio.getFontScale(), MAX_SCALE);
  return Math.round(base * scale);
}

/**
 * Use as `maxFontSizeMultiplier` on any <Text> in a layout-constrained container
 * to let text grow with system settings while preventing overflow.
 */
export const MAX_FONT_SCALE = MAX_SCALE;
