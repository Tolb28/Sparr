import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { View, Pressable, StyleSheet, GestureResponderEvent, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProfileScreen from '../screens/ProfileScreen';
import CalendarScreen from '../screens/CalendarScreen';
import DiscoveryScreen from '../screens/DiscoveryScreen';
import TechniqueScreen from '../screens/TechniqueScreen';
import { Ionicons } from '@expo/vector-icons';
import FriendsScreen from '../screens/FriendsScreen';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { getUserProfile } from '../api/profile';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useResponsiveValue } from '@/src/utils/responsive';
import { tapHaptic } from '@/src/utils/haptics';
import { createPressFeedback } from '@/src/utils/motion';

const Tab = createBottomTabNavigator();

const TABS: { name: string; icon: string; iconFilled: string }[] = [
  { name: 'Calendar', icon: 'calendar-outline', iconFilled: 'calendar' },
  { name: 'Techniques', icon: 'barbell-outline', iconFilled: 'barbell' },
  { name: 'Profile', icon: 'person-circle-outline', iconFilled: 'person-circle' },
  { name: 'Discovery', icon: 'compass-outline', iconFilled: 'compass' },
  { name: 'Friends', icon: 'people-outline', iconFilled: 'people' },
];

function CustomTabBar({ state, descriptors, navigation, profile }: any) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const iconSize = useResponsiveValue(26, 24);
  const [tabScales, setTabScales] = useState(
    state.routes.map(() => new Animated.Value(1))
  );

  const handleTabPress = (index: number, route: any, isFocused: boolean) => {
    void tapHaptic();
    // Animate press feedback
    Animated.sequence([
      Animated.timing(tabScales[index], {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(tabScales[index], {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
  };

  return (
    <View style={[styles.tabBar, { borderTopColor: c.border.light, backgroundColor: c.background.primary, paddingBottom: insets.bottom + 4, height: 66 + insets.bottom }]}>
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const tabConfig = TABS.find((t) => t.name === route.name);

        const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

        return (
          <Animated.View
            key={route.key}
            style={[styles.tabItem, { transform: [{ scale: tabScales[index] }] }]}
          >
            <Pressable
              onPress={() => handleTabPress(index, route, isFocused)}
              onLongPress={onLongPress}
              accessibilityRole="button"
              accessibilityLabel={route.name}
              accessibilityState={{ selected: isFocused }}
              style={styles.tabButton}
            >
              {route.name === 'Profile' ? (
                <View style={[styles.avatarWrap, isFocused && { borderColor: c.primary.main }]}>
                  <Avatar size="sm">
                    <AvatarFallbackText style={styles.avatarFallback}>
                      {profile?.display_name ?? '?'}
                    </AvatarFallbackText>
                    <AvatarImage source={{ uri: profile?.avatar_url || undefined }} />
                  </Avatar>
                </View>
              ) : (
                <Ionicons
                  name={isFocused ? (tabConfig?.iconFilled as any) : (tabConfig?.icon as any)}
                  size={iconSize}
                  color={isFocused ? c.primary.main : c.neutral[500]}
                />
              )}
            </Pressable>
          </Animated.View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  tabButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemPressed: { opacity: 0.7 },
  avatarWrap: {
    borderRadius: 20,
    padding: 1,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarFallback: {
    color: '#ffffff',
  },
});
