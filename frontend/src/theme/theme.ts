/**
 * Theme Utilities
 * Helper functions and hooks for using the color theme throughout the app
 */

import { colors } from './colors';

/**
 * Theme configuration object that maps common UI elements to colors
 */
export const theme = {
  // Primary colors - main interactive elements
  primary: colors.primary.main,
  primaryLight: colors.primary.light,
  primaryDark: colors.primary.dark,

  // Secondary colors - accent elements
  secondary: colors.secondary.main,
  secondaryLight: colors.secondary.light,
  secondaryDark: colors.secondary.dark,

  // Text colors
  textPrimary: colors.text.primary,
  textSecondary: colors.text.secondary,
  textTertiary: colors.text.tertiary,
  textInverse: colors.text.inverse,

  // Background colors
  bgPrimary: colors.background.primary,
  bgSecondary: colors.background.secondary,
  bgTertiary: colors.background.tertiary,

  // Border colors
  borderLight: colors.border.light,
  borderMedium: colors.border.medium,
  borderDark: colors.border.dark,

  // Semantic colors
  success: colors.success.main,
  successLight: colors.success.light,
  successDark: colors.success.dark,

  error: colors.error.main,
  errorLight: colors.error.light,
  errorDark: colors.error.dark,

  warning: colors.warning.main,
  warningLight: colors.warning.light,
  warningDark: colors.warning.dark,

  info: colors.info.main,
  infoLight: colors.info.light,
  infoDark: colors.info.dark,

  // Interactive elements
  buttonBg: colors.interactive.background,
  buttonBgHover: colors.interactive.backgroundHover,
  buttonBgActive: colors.interactive.backgroundActive,
  buttonText: colors.interactive.text,

  // Card/Container
  cardBg: colors.card.background,
  cardBorder: colors.card.border,
  cardShadow: colors.card.shadow,

  // Input/Form
  inputBg: colors.input.background,
  inputBorder: colors.input.border,
  inputBorderFocus: colors.input.borderFocus,
  inputPlaceholder: colors.input.placeholder,

  // Status colors
  statusOnline: colors.status.online,
  statusOffline: colors.status.offline,
  statusAway: colors.status.away,
  statusBusy: colors.status.busy,

  // Overlay/Shadow
  overlayLight: colors.overlay.light,
  overlayMedium: colors.overlay.medium,
  overlayDark: colors.overlay.dark,
};

/**
 * Tailwind color class mapper
 * Maps Tailwind color names to actual hex values from the theme
 */
export const tailwindColorMap = {
  // Grays (neutral)
  'gray-50': colors.neutral[50],
  'gray-100': colors.neutral[100],
  'gray-200': colors.neutral[200],
  'gray-300': colors.neutral[300],
  'gray-400': colors.neutral[400],
  'gray-500': colors.neutral[500],
  'gray-600': colors.neutral[600],
  'gray-700': colors.neutral[700],
  'gray-800': colors.neutral[800],
  'gray-900': colors.neutral[900],

  // Blues (primary)
  'blue-100': colors.primary.lighter,
  'blue-200': colors.primary.light,
  'blue-500': colors.primary.main,
  'blue-600': colors.primary.dark,
  'blue-700': colors.primary.darker,

  // Reds (error)
  'red-50': colors.error.light,
  'red-100': colors.error.light,
  'red-600': colors.error.main,
  'red-700': colors.error.dark,

  // Greens (success)
  'green-50': colors.success.light,
  'green-100': colors.success.light,
  'green-600': colors.success.main,
  'green-700': colors.success.dark,

  // Indigo (secondary)
  'indigo-600': colors.secondary.main,

  // Purples (secondary alternative)
  'purple-600': colors.secondary.main,

  // Slates/neutral darks
  'slate-500': colors.neutral[500],
  'slate-600': colors.neutral[600],

  // White
  'white': '#ffffff',
};

/**
 * Get color value from Tailwind class name
 * @param colorClass - Tailwind color class (e.g., 'gray-600', 'blue-500')
 * @returns Hex color value
 */
export const getTailwindColor = (colorClass: string): string => {
  return (tailwindColorMap as Record<string, string>)[colorClass] || colorClass;
};

/**
 * Style utilities for common component patterns
 */
export const themeStyles = {
  // Text color mappings
  textPrimary: { color: colors.text.primary },
  textSecondary: { color: colors.text.secondary },
  textTertiary: { color: colors.text.tertiary },
  textInverse: { color: colors.text.inverse },
  textError: { color: colors.error.main },
  textSuccess: { color: colors.success.main },
  textWarning: { color: colors.warning.main },

  // Background color mappings
  bgPrimary: { backgroundColor: colors.background.primary },
  bgSecondary: { backgroundColor: colors.background.secondary },
  bgTertiary: { backgroundColor: colors.background.tertiary },

  // Border color mappings
  borderLight: { borderColor: colors.border.light },
  borderMedium: { borderColor: colors.border.medium },
  borderDark: { borderColor: colors.border.dark },

  // Interactive button styles
  buttonPrimary: {
    backgroundColor: colors.primary.main,
  },
  buttonPrimaryHover: {
    backgroundColor: colors.primary.dark,
  },
  buttonSecondary: {
    backgroundColor: colors.secondary.main,
  },
  buttonSuccess: {
    backgroundColor: colors.success.main,
  },
  buttonError: {
    backgroundColor: colors.error.main,
  },
  buttonDisabled: {
    backgroundColor: colors.neutral[300],
  },

  // Input styles
  inputBase: {
    borderColor: colors.input.border,
    backgroundColor: colors.input.background,
  },
  inputFocus: {
    borderColor: colors.input.borderFocus,
  },

  // Card styles
  cardBase: {
    backgroundColor: colors.card.background,
    borderColor: colors.card.border,
  },

  // Error/Success/Warning/Info boxes
  alertError: {
    backgroundColor: colors.error.light,
    borderColor: colors.error.main,
  },
  alertSuccess: {
    backgroundColor: colors.success.light,
    borderColor: colors.success.main,
  },
  alertWarning: {
    backgroundColor: colors.warning.light,
    borderColor: colors.warning.main,
  },
  alertInfo: {
    backgroundColor: colors.info.light,
    borderColor: colors.info.main,
  },
};

export default theme;
