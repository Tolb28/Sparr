import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { GestureResponderEvent, View } from 'react-native';
import ProfileScreen from '../screens/ProfileScreen';
import CalendarScreen from '../screens/CalendarScreen'; // replaced inline placeholder with real screen
import DiscoveryScreen from '../screens/DiscoveryScreen'; // replaced inline placeholder with real screen
import TechniqueScreen from '../screens/TechniqueScreen';
import { Box } from '@/components/ui/box';
import { Pressable} from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import FriendsScreen from '../screens/FriendsScreen';
import ConversationsScreen from '../screens/ConversationsScreen';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { getUserProfile } from '../api/profile';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, string> = {
  Calendar: 'calendar-outline',
  Techniques: 'barbell-outline',
  Friends: 'people-outline',
  Discovery: 'clipboard-outline',
  Messages: 'chatbubble-outline',
  Profile: 'profile',
};

function CustomTabBar({ state, descriptors, navigation, profile }: any) {
  return (
    <Box
      style={{
        height: 60,
        borderTopWidth: 1,
        borderTopColor: '#ccc',
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 8,
      }}
    >
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;

        const onPress = (e?: GestureResponderEvent) => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const iconName = ICONS[route.name] ?? 'ellipse-outline';
        const color = isFocused ? '#000' : '#777';
        const size = 36;

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={onLongPress}
            accessibilityRole="button"
            style={{ alignItems: 'center', justifyContent: 'center' }}
          >
            {iconName === 'profile' ? <Avatar className="bg-indigo-600" size="md" key={profile?.avatar_url}>
              <AvatarFallbackText className="text-white">{profile?.display_name ?? '?'}</AvatarFallbackText>
              <AvatarImage source={{ uri: profile?.avatar_url || undefined }} />
            </Avatar> : <Ionicons name={iconName as any} size={size} color={color} />}
          </Pressable>
        );
      })}
    </Box>
  );
}

export default function BottomTabNavigator() {
  const [profile, setProfile] = useState<any>(null);

  const loadProfile = async () => {
    try {
      const data = await getUserProfile();
      const parsedProfile = data?.profile ?? data;
      setProfile(parsedProfile);
    } catch (err) {
      console.error('Failed to load profile for tab bar:', err);
    }
  };

  // Initial load
  useEffect(() => {
    loadProfile();
  }, []);

  // Reload profile whenever the navigator comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
    }, [])
  );

  return (
    <Tab.Navigator
      initialRouteName="Profile"
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} profile={profile} />}
    >
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Techniques" component={TechniqueScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Discovery" component={DiscoveryScreen} />
      <Tab.Screen name="Messages" component={ConversationsScreen} />
      <Tab.Screen name="Friends" component={FriendsScreen} />
    </Tab.Navigator>
  );
}