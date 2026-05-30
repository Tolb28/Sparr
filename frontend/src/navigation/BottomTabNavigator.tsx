import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { View, Pressable, StyleSheet, GestureResponderEvent } from 'react-native';
import ProfileScreen from '../screens/ProfileScreen';
import CalendarScreen from '../screens/CalendarScreen';
import DiscoveryScreen from '../screens/DiscoveryScreen';
import TechniqueScreen from '../screens/TechniqueScreen';
import { Ionicons } from '@expo/vector-icons';
import FriendsScreen from '../screens/FriendsScreen';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { getUserProfile } from '../api/profile';
import { colors } from '@/src/theme/colors';

const Tab = createBottomTabNavigator();

const TABS: { name: string; icon: string; iconFilled: string }[] = [
  { name: 'Calendar', icon: 'calendar-outline', iconFilled: 'calendar' },
  { name: 'Techniques', icon: 'barbell-outline', iconFilled: 'barbell' },
  { name: 'Profile', icon: 'person-circle-outline', iconFilled: 'person-circle' },
  { name: 'Discovery', icon: 'compass-outline', iconFilled: 'compass' },
  { name: 'Friends', icon: 'people-outline', iconFilled: 'people' },
];

function CustomTabBar({ state, descriptors, navigation, profile }: any) {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const tabConfig = TABS.find((t) => t.name === route.name);

        const onPress = (e?: GestureResponderEvent) => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={onLongPress}
            accessibilityRole="button"
            accessibilityLabel={route.name}
            accessibilityState={{ selected: isFocused }}
            style={({ pressed }) => [styles.tabItem, pressed && styles.tabItemPressed]}
          >
            {route.name === 'Profile' ? (
              <View style={[styles.avatarWrap, isFocused && styles.avatarWrapActive]}>
                <Avatar size="sm">
                  <AvatarFallbackText style={styles.avatarFallback}>
                    {profile?.display_name ?? '?'}
                  </AvatarFallbackText>
                  <AvatarImage source={{ uri: profile?.avatar_url || undefined }} />
                </Avatar>
              </View>
            ) : (
              <Ionicons
                name={
                  isFocused
                    ? (tabConfig?.iconFilled as any)
                    : (tabConfig?.icon as any)
                }
                size={26}
                color={isFocused ? colors.primary.main : colors.neutral[500]}
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function BottomTabNavigator() {
  const [profile, setProfile] = useState<any>(null);

  const loadProfile = async () => {
    try {
      const data = await getUserProfile();
      setProfile(data?.profile ?? data);
    } catch {}
  };

  useEffect(() => { loadProfile(); }, []);
  useFocusEffect(React.useCallback(() => { loadProfile(); }, []));

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
      <Tab.Screen name="Friends" component={FriendsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 66,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    backgroundColor: colors.background.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  tabItemPressed: { opacity: 0.7 },
  avatarWrap: {
    borderRadius: 20,
    padding: 1,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarWrapActive: {
    borderColor: colors.primary.main,
  },
  avatarFallback: {
    color: '#ffffff',
  },
});
