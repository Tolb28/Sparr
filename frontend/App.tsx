// App.tsx
import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
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
      <GluestackUIProvider>
        <ProgressProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
          <NotificationHost />
        </ProgressProvider>
      </GluestackUIProvider>
    </SafeAreaProvider>
  );
}
