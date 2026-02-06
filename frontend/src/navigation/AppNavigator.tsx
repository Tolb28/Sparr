import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// 1. Import all screens statically at the top
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import EditProfileScreen from '../screens/ProfileEditScreen';
import ProfileCreateScreen from '../screens/ProfileCreateScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import BottomTabNavigator from './BottomTabNavigator';
import BrowseCalendarsScreen from '../screens/BrowseCalendarsScreen'; // Import this
import CreateCalendarScreen from '../screens/CreateCalendarScreen';   // Import this
import ForeignProfileScreen from '../screens/ForeignProfileScreen';   // Import this
import TechniqueScreen from '../screens/TechniqueScreen';
import TechniqueDetailScreen from '../screens/TechniqueDetailScreen';
import DrillDetailScreen from '../screens/DrillDetailScreen';
import CombinationDetailScreen from '../screens/CombinationDetailScreen';
import TrainingScreen from '../screens/TrainingScreen';
import ConversationsScreen from '../screens/ConversationsScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import NewConversationScreen from '../screens/NewConversationScreen';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  EditProfile: undefined;
  CreateProfile: undefined;
  CreatePost: undefined;
  Main: undefined;
  BrowseCalendars: undefined;
  CreateCalendar: undefined;
  ForeignProfile: { foreign_profile_id: number };
  Technique: undefined;
  TechniqueDetail: { technique_id: number; category?: string; items?: any[]; initialIndex?: number };
  DrillDetail: { drill_id: number; category?: string; items?: any[]; initialIndex?: number };
  CombinationDetail: { combination_id: number; category?: string; items?: any[]; initialIndex?: number };
  Training: { components: any[]; trainingName?: string };
  Conversations: undefined;
  ChatDetail: { conversationId: number; otherParticipantName: string; otherParticipantAvatar: string | null };
  NewConversation: undefined;
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
        name="CreatePost"
        component={CreatePostScreen}
        options={{ title: 'Create Post', headerBackTitle: 'Back' }}
      />
      
      {/* 2. Use the imported component directly */}
      <Stack.Screen
        name="BrowseCalendars"
        component={BrowseCalendarsScreen}
        options={{ title: 'Browse Calendars' }}
      />
      
      <Stack.Screen
        name="CreateCalendar"
        component={CreateCalendarScreen}
        options={{ title: 'Create Calendar' }}
      />

      <Stack.Screen
        name="ForeignProfile"
        component={ForeignProfileScreen}
        options={{ title: 'Foreign Profile' }}
      />
      <Stack.Screen
        name="Technique"
        component={TechniqueScreen}
        options={{ title: 'Technique' }}
      />
      <Stack.Screen
        name="TechniqueDetail"
        component={TechniqueDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DrillDetail"
        component={DrillDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CombinationDetail"
        component={CombinationDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Training"
        component={TrainingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Conversations"
        component={ConversationsScreen}
        options={{ title: 'Messages', headerShown: false }}
      />
      <Stack.Screen
        name="ChatDetail"
        component={ChatDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NewConversation"
        component={NewConversationScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}