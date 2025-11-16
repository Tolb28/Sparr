import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureResponderEvent, View } from 'react-native';
import ProfileScreen from '../screens/ProfileScreen';
import { Box, Pressable as GPressable, Text } from '@gluestack-ui/themed';
import { Ionicons } from '@expo/vector-icons';


const Tab = createBottomTabNavigator();

// simple placeholders for other tabs
function CalendarScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Calendar</Text>
    </View>
  );
}
function WorkoutsScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Workouts</Text>
    </View>
  );
}
function FriendsScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Friends</Text>
    </View>
  );
}
function ClipboardScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Clipboard</Text>
    </View>
  );
}

const ICONS: Record<string, string> = {
  Calendar: 'calendar-outline',
  Workouts: 'barbell-outline',
  Friends: 'people-outline',
  Clipboard: 'clipboard-outline',
  Profile: 'person-circle-outline',
};

function CustomTabBar({ state, descriptors, navigation }: any) {
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
        const size = 26;
        const translateY = 0;

        return (
          <GPressable
            key={route.key}
            onPress={onPress}
            onLongPress={onLongPress}
            accessibilityRole="button"
            $pressed={{ opacity: 0.7 }}
            style={{ alignItems: 'center', justifyContent: 'center', transform: [{ translateY }] }}
          >
            <Ionicons name={iconName as any} size={size} color={color} />
            {route.name !== 'Create' && (
              <Text style={{ fontSize: 10, marginTop: 2, color }}>{route.name}</Text>
            )}
          </GPressable>
        );
      })}
    </Box>
  );
}

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Profile"
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Workouts" component={WorkoutsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Clipboard" component={ClipboardScreen} />
      <Tab.Screen name="Friends" component={FriendsScreen} />
    </Tab.Navigator>
  );
}