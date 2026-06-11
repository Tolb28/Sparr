/**
 * Motion and Animation Utilities
 * Standardized entrance animations, press feedback, and micro-interactions
 * MOTION_INTENSITY: 6 (fluid entry animations, press feedback, no excessive loops)
 */

import { Animated, Easing } from 'react-native';

/**
 * Standard entrance animation: fade-in + slight scale up
 * Duration: 300ms, natural easing
 */
export const createEntranceAnimation = (initialOpacity = 0, initialScale = 0.95) => {
  const opacity = new Animated.Value(initialOpacity);
  const scale = new Animated.Value(initialScale);

  const animate = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  return { opacity, scale, animate };
};

/**
 * Press feedback: subtle scale down on press, spring bounce on release
 * Duration: 150ms, gives immediate tactile feedback
 */
export const createPressFeedback = (initialScale = 1) => {
  const scale = new Animated.Value(initialScale);

  const onPressIn = () => {
    Animated.timing(scale, {
      toValue: 0.97,
      duration: 100,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      speed: 12,
      bounciness: 8,
      useNativeDriver: true,
    }).start();
  };

  return { scale, onPressIn, onPressOut };
};

/**
 * Unlock animation: scale bounce with color shift
 * Duration: 500ms, celebratory feel
 */
export const createUnlockAnimation = (initialScale = 0.8) => {
  const scale = new Animated.Value(initialScale);

  const animate = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.15,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  return { scale, animate };
};

/**
 * Completion swell: rapid scale pulse for training completion
 * Duration: 400ms
 */
export const createCompletionAnimation = () => {
  const scale = new Animated.Value(1);

  const animate = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.95,
        duration: 100,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  return { scale, animate };
};

/**
 * Fade in animation: simple opacity change
 * Duration: 250ms
 */
export const createFadeInAnimation = (initialOpacity = 0) => {
  const opacity = new Animated.Value(initialOpacity);

  const animate = () => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  return { opacity, animate };
};

/**
 * Slide in animation: enter from bottom with fade
 * Duration: 350ms
 */
export const createSlideInAnimation = (initialTranslateY = 20) => {
  const translateY = new Animated.Value(initialTranslateY);
  const opacity = new Animated.Value(0);

  const animate = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  return { translateY, opacity, animate };
};

/**
 * Pulse animation: subtle opacity pulse for attention
 * Loops continuously, use sparingly
 */
export const createPulseAnimation = () => {
  const opacity = new Animated.Value(1);

  const animate = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  return { opacity, animate };
};
