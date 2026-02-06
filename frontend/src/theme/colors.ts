/**
 * Color Theme Configuration
 * Centralized color palette for the entire application
 */

export const colors = {
  // Primary Colors
  primary: {
    main: '#2563eb',        // Blue - Main primary color
    light: '#3b82f6',       // Lighter blue
    lighter: '#60a5fa',     // Even lighter blue
    dark: '#1e40af',        // Darker blue
    darker: '#1e3a8a',      // Much darker blue
  },

  // Secondary Colors
  secondary: {
    main: '#7c3aed',        // Purple - Secondary color
    light: '#a78bfa',       // Lighter purple
    dark: '#6d28d9',        // Darker purple
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
    primary: '#ffffff',
    secondary: '#f9fafb',
    tertiary: '#f3f4f6',
  },

  // Text Colors
  text: {
    primary: '#111827',
    secondary: '#4b5563',
    tertiary: '#9ca3af',
    inverse: '#ffffff',
  },

  // Border Colors
  border: {
    light: '#e5e7eb',
    medium: '#d1d5db',
    dark: '#9ca3af',
  },

  // Overlay/Shadow
  overlay: {
    light: 'rgba(0, 0, 0, 0.1)',
    medium: 'rgba(0, 0, 0, 0.4)',
    dark: 'rgba(0, 0, 0, 0.7)',
  },

  // Interactive Elements
  interactive: {
    background: '#2563eb',
    backgroundHover: '#1e40af',
    backgroundActive: '#1e3a8a',
    text: '#ffffff',
  },

  // Card/Container
  card: {
    background: '#ffffff',
    border: '#e5e7eb',
    shadow: 'rgba(0, 0, 0, 0.1)',
  },

  // Input/Form
  input: {
    background: '#ffffff',
    border: '#d1d5db',
    borderFocus: '#2563eb',
    placeholder: '#9ca3af',
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
