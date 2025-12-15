import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import EditProfileScreen from '../screens/ProfileEditScreen';
import ProfileCreateScreen from '../screens/ProfileCreateScreen';
import BottomTabNavigator from './BottomTabNavigator';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  EditProfile: undefined;
  CreateProfile: undefined;
  Main: undefined;
  BrowseCalendars: undefined;
  CreateCalendar: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateProfile"
        component={ProfileCreateScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Main"
        component={BottomTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BrowseCalendars"
        component={require('../screens/BrowseCalendarsScreen').default}
        options={{ title: 'Browse Calendars' }}
      />
      <Stack.Screen
        name="CreateCalendar"
        component={require('../screens/CreateCalendarScreen').default}
        options={{ title: 'Create Calendar' }}
      />
    </Stack.Navigator>
  );
}
