import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import EditProfileScreen from '../screens/ProfileEditScreen';
import ProfileCreateScreen from '../screens/ProfileCreateScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import BottomTabNavigator from './BottomTabNavigator';
import BrowseCalendarsScreen from '../screens/BrowseCalendarsScreen'; // Import this
import CreateCalendarScreen from '../screens/CreateCalendarScreen';   // Import this
import ForeignProfileScreen from '@/src/screens/ForeignProfileScreen';   // Import this
import TechniqueScreen from '../screens/TechniqueScreen';
import TechniqueDetailScreen from '../screens/TechniqueDetailScreen';
import DrillDetailScreen from '../screens/DrillDetailScreen';
import CombinationDetailScreen from '../screens/CombinationDetailScreen';
import TrainingScreen from '../screens/TrainingScreen';
import ConversationsScreen from '../screens/ConversationsScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import NewConversationScreen from '../screens/NewConversationScreen';
import ConversationInfoScreen from '../screens/ConversationInfoScreen';
import ClubProfileScreen from '../screens/ClubProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CreateClubProfileStepOneScreen from '../screens/CreateClubProfileStepOneScreen';
import CreateClubProfileStepTwoScreen from '../screens/CreateClubProfileStepTwoScreen';
import ManageClubScreen from '../screens/ManageClubScreen';
import ConversationSettingsScreen from '../screens/ConversationSettingsScreen';
import ClubMembersScreen from '../screens/ClubMembersScreen';
import ClubMemberDetailScreen from '../screens/ClubMemberDetailScreen';
import CreateClubPlanScreen from '../screens/CreateClubPlanScreen';
import CreateClubCalendarScreen from '../screens/CreateClubCalendarScreen';
import CreateTrainingScreen from '../screens/CreateTrainingScreen';
import EditTrainingScreen from '../screens/EditTrainingScreen';
import EditCalendarScreen from '../screens/EditCalendarScreen';
import CalendarPreviewScreen from '../screens/CalendarPreviewScreen';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import PendingVerificationScreen from '../screens/PendingVerificationScreen';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  EditProfile: undefined;
  CreateProfile: undefined;
  CreatePost: { clubId?: number } | undefined;
  Main: undefined;
  BrowseCalendars: { clubId?: number } | undefined;
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
  ConversationInfo: { conversationId: number; conversationTitle: string; isGroup?: boolean };
  ClubProfile: { clubId: number };
  Settings: undefined;
  CreateClubStepOne: undefined;
  CreateClubStepTwo: { title: string; location?: string | null; bio?: string | null; joinPolicy: 'open' | 'approval' };
  ManageClub: { clubId: number };
  ConversationSettings: { conversationId: number; conversationTitle: string };
  ClubMembers: { clubId: number; canManage: boolean };
  ClubMemberDetail: { clubId: number; member: any };
  CreateClubPlan: { clubId: number };
  CreateClubCalendar: { clubId: number };
  CreateTraining: undefined;
  EditTraining: { trainingId: number };
  EditCalendar: { calendarId: number };
  CalendarPreview: { calendarId: number; clubId?: number };
  TermsOfService: undefined;
  PrivacyPolicy: undefined;
  PendingVerification: { email: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const linking = {
  prefixes: ['sparr://', 'https://sparr.app'],
  config: {
    screens: {
      Login: 'auth/confirm',
    },
  },
};

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
        options={{ headerShown: false }}
      />
      
      <Stack.Screen
        name="BrowseCalendars"
        component={BrowseCalendarsScreen}
        options={{ headerShown: false }}
      />
      
      <Stack.Screen
        name="CreateCalendar"
        component={CreateCalendarScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="ForeignProfile"
        component={ForeignProfileScreen}
        options={{ headerShown: false }}
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
      <Stack.Screen
        name="ConversationInfo"
        component={ConversationInfoScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ClubProfile"
        component={ClubProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateClubStepOne"
        component={CreateClubProfileStepOneScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateClubStepTwo"
        component={CreateClubProfileStepTwoScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ManageClub"
        component={ManageClubScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ConversationSettings"
        component={ConversationSettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ClubMembers"
        component={ClubMembersScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ClubMemberDetail"
        component={ClubMemberDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateClubPlan"
        component={CreateClubPlanScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateClubCalendar"
        component={CreateClubCalendarScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateTraining"
        component={CreateTrainingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditTraining"
        component={EditTrainingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditCalendar"
        component={EditCalendarScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CalendarPreview"
        component={CalendarPreviewScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TermsOfService"
        component={TermsOfServiceScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PendingVerification"
        component={PendingVerificationScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}