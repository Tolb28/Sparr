// App.tsx
import React from 'react';
import { View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AppNavigator, { linking } from './src/navigation/AppNavigator';

const AppNavTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: '#120808',
    card: '#221010',
    text: '#ffffff',
    border: '#2e1919',
    primary: '#f20d0d',
    notification: '#f20d0d',
  },
};
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { ProgressProvider } from '@/src/context/ProgressContext';
import { NotificationHost } from '@/src/services/notificationService';
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
  const [fontsLoaded] = useFonts({
    BarlowCondensed_700Bold,
    BarlowCondensed_600SemiBold,
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
  });
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: '#120808' }} />;

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
