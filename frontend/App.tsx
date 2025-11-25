// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import '@/global.css';

export default function App() {
  return (
    <GluestackUIProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </GluestackUIProvider>
  );
}
