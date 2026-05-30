/**
 * Color Theme Configuration
 * Centralized color palette for the entire application
 */

export const colors = {
  // Primary Colors
  primary: {
    main: '#f20d0d',        // Red - Main primary color
    light: '#f43f3f',       // Lighter red
    lighter: '#fecaca',     // Light red surface
    dark: '#c60a0a',        // Darker red
    darker: '#991b1b',      // Much darker red
  },

  // Secondary Colors
  secondary: {
    main: '#341818',        // Deep card accent
    light: '#492222',       // Lighter accent
    dark: '#221010',        // Darker accent
  },

  // Neutral Colors (Grays)
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Semantic Colors
  success: {
    main: '#10b981',        // Green
    light: '#6ee7b7',
    dark: '#059669',
  },

  error: {
    main: '#ef4444',        // Red
    light: '#fca5a5',
    dark: '#dc2626',
  },

  warning: {
    main: '#f59e0b',        // Amber
    light: '#fbbf24',
    dark: '#d97706',
  },

  info: {
    main: '#06b6d4',        // Cyan
    light: '#22d3ee',
    dark: '#0891b2',
  },

  // Backgrounds
  background: {
    primary: '#221010',
    secondary: '#120808',
    tertiary: '#341818',
    card: '#221010',
  },

  // Text Colors
  text: {
    primary: '#ffffff',
    secondary: '#cb9090',
    tertiary: '#8f6d6d',
    inverse: '#ffffff',
  },

  // Border Colors
  border: {
    light: '#3a1d1d',
    medium: '#6d2e2e',
    dark: '#8f6d6d',
  },

  // Overlay/Shadow (tinted shadows for premium feel)
  overlay: {
    light: 'rgba(0, 0, 0, 0.1)',
    medium: 'rgba(0, 0, 0, 0.4)',
    dark: 'rgba(0, 0, 0, 0.7)',
  },

  // Red-tinted shadows (brand-aligned elevation)
  redShadow: {
    light: 'rgba(242, 13, 13, 0.08)',
    medium: 'rgba(242, 13, 13, 0.12)',
    dark: 'rgba(242, 13, 13, 0.20)',
  },

  // Glassmorphism Surfaces (dark-mode glass, enhanced for better visibility)
  glass: {
    surface: 'rgba(255, 255, 255, 0.04)',
    surfaceMedium: 'rgba(255, 255, 255, 0.07)',
    surfaceStrong: 'rgba(255, 255, 255, 0.10)',
    medium: 'rgba(255, 255, 255, 0.06)',
    border: 'rgba(255, 255, 255, 0.14)',        // Increased from 0.09 for better visibility
    borderStrong: 'rgba(255, 255, 255, 0.20)', // Increased from 0.14 for better separation
    redSurface: 'rgba(242, 13, 13, 0.08)',
    redBorder: 'rgba(242, 13, 13, 0.25)',       // Increased opacity for better brand visibility
  },

  // Gradient Stop Pairs
  gradient: {
    primaryStart: '#f20d0d',
    primaryMid: '#d40b0b',
    primaryEnd: '#991b1b',
    heroOverlayStart: 'rgba(18, 8, 8, 0.00)',
    heroOverlayEnd: 'rgba(18, 8, 8, 0.92)',
    cardOverlayStart: 'rgba(34, 16, 16, 0.00)',
    cardOverlayEnd: 'rgba(34, 16, 16, 0.90)',
    accentGlow: 'rgba(242, 13, 13, 0.18)',
  },

  // Interactive Elements
  interactive: {
    background: '#f20d0d',
    backgroundHover: '#c60a0a',
    backgroundActive: '#991b1b',
    text: '#ffffff',
  },

  // Card/Container
  card: {
    background: '#221010',
    border: '#3a1d1d',
    shadow: 'rgba(0, 0, 0, 0.1)',
  },

  // Input/Form
  input: {
    background: '#341818',
    border: '#6d2e2e',
    borderFocus: '#f20d0d',
    placeholder: '#8f6d6d',
  },

  // Status Colors
  status: {
    online: '#10b981',
    offline: '#9ca3af',
    away: '#f59e0b',
    busy: '#ef4444',
  },
};

/**
 * Color utilities
 */
export const colorUtils = {
  /**
   * Convert hex color to RGB
   */
  hexToRgb: (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  },

  /**
   * Convert hex color to RGBA with opacity
   */
  hexToRgba: (hex: string, alpha: number = 1): string => {
    const rgb = colorUtils.hexToRgb(hex);
    if (!rgb) return hex;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  },

  /**
   * Lighten a hex color
   */
  lighten: (hex: string, percent: number): string => {
    const rgb = colorUtils.hexToRgb(hex);
    if (!rgb) return hex;
    const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * (percent / 100)));
    const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * (percent / 100)));
    const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * (percent / 100)));
    return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
  },

  /**
   * Darken a hex color
   */
  darken: (hex: string, percent: number): string => {
    const rgb = colorUtils.hexToRgb(hex);
    if (!rgb) return hex;
    const r = Math.max(0, Math.round(rgb.r - rgb.r * (percent / 100)));
    const g = Math.max(0, Math.round(rgb.g - rgb.g * (percent / 100)));
    const b = Math.max(0, Math.round(rgb.b - rgb.b * (percent / 100)));
    return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
  },
};

export default colors;
