import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import ClassroomsScreen from '../screens/main/ClassroomsScreen';
import StudyScreen from '../screens/main/StudyScreen';
import NotesScreen from '../screens/main/NotesScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

export type MainTabParamList = {
  Classrooms: undefined;
  Study: undefined;
  Notes: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({ label, focused, color }: { label: string; focused: boolean; color: string }) {
  // Placeholder icons as text — replace with react-native-vector-icons or expo-symbols later
  const icons: Record<string, string> = {
    Classrooms: '📚',
    Study:      '🧠',
    Notes:      '📝',
    Profile:    '👤',
  };
  return <Text style={{ fontSize: focused ? 22 : 20, color }}>{icons[label]}</Text>;
}

export default function MainTabs() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: tokens.cardBg,
          borderTopColor: tokens.cardBorder,
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarActiveTintColor: tokens.accent,
        tabBarInactiveTintColor: tokens.tabInactiveText,
        tabBarIcon: ({ focused, color }) => (
          <TabIcon label={route.name} focused={focused} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Classrooms" component={ClassroomsScreen} />
      <Tab.Screen name="Study"      component={StudyScreen} />
      <Tab.Screen name="Notes"      component={NotesScreen} />
      <Tab.Screen name="Profile"    component={ProfileScreen} />
    </Tab.Navigator>
  );
}
