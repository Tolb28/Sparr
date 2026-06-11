// App.tsx
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import AppNavigator, { linking } from './src/navigation/AppNavigator';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { ProgressProvider } from '@/src/context/ProgressContext';
import { NotificationHost } from '@/src/services/notificationService';
import { useColorScheme } from 'nativewind';
import { colors as darkColors, lightColors } from '@/src/theme/colors';
import '@/global.css';

// Uncomment after running: cd frontend && npm install
import { useFonts } from 'expo-font';
import {
  BarlowCondensed_700Bold,
  BarlowCondensed_600SemiBold,
} from '@expo-google-fonts/barlow-condensed';
import {
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
} from '@expo-google-fonts/barlow';

export default function App() {
  const { colorScheme } = useColorScheme();
  const isLight = colorScheme === 'light';
  const themeC = isLight ? lightColors : darkColors;

  const AppNavTheme = {
    ...DefaultTheme,
    dark: !isLight,
    colors: {
      ...DefaultTheme.colors,
      background: themeC.background.secondary,
      card: themeC.background.primary,
      text: themeC.text.primary,
      border: themeC.border.light,
      primary: themeC.primary.main,
      notification: themeC.primary.main,
    },
  };

  useEffect(() => {
    NavigationBar.setBackgroundColorAsync('#00000000');
    void NavigationBar.setButtonStyleAsync(isLight ? 'dark' : 'light');
  }, [isLight]);

  const [fontsLoaded] = useFonts({
    BarlowCondensed_700Bold,
    BarlowCondensed_600SemiBold,
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
  });
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: themeC.background.secondary }} />;

  return (
    <SafeAreaProvider>
      <GluestackUIProvider mode="system">
        <StatusBar style="auto" />
        <ProgressProvider>
          <NavigationContainer linking={linking} theme={AppNavTheme}>
            <AppNavigator />
          </NavigationContainer>
        </ProgressProvider>
      </GluestackUIProvider>
      <NotificationHost />
    </SafeAreaProvider>
  );
}
