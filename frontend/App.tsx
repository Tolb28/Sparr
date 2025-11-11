// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <GluestackUIProvider config={config}>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </GluestackUIProvider>
  );
}
