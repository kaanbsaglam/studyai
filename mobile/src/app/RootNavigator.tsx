import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import ClassroomDetailScreen from '../screens/main/ClassroomDetailScreen';
import DocumentsScreen from '../screens/classroom/DocumentsScreen';
import DocumentReaderScreen from '../screens/classroom/DocumentReaderScreen';
import NotesScreen from '../screens/classroom/NotesScreen';
import NoteReaderScreen from '../screens/classroom/NoteReaderScreen';
import SummariesScreen from '../screens/classroom/SummariesScreen';
import SummaryReaderScreen from '../screens/classroom/SummaryReaderScreen';
import ChatScreen from '../screens/classroom/ChatScreen';
import FlashcardsScreen from '../screens/classroom/FlashcardsScreen';
import QuizzesScreen from '../screens/classroom/QuizzesScreen';
import type { Classroom } from '../types';

export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  ClassroomDetail: { classroom?: Classroom; classroomId?: string; classroomName?: string };
  Documents:      { classroomId: string; classroomName: string };
  DocumentReader: { documentId: string; documentName: string };
  Notes:          { classroomId: string; classroomName: string };
  NoteReader:     { noteId: string; noteTitle: string };
  Summaries:      { classroomId: string; classroomName: string };
  SummaryReader:  { summaryId: string; summaryTitle: string };
  Chat:           { classroomId: string; classroomName: string };
  Flashcards:     { classroomId: string; classroomName: string };
  Quizzes:        { classroomId: string; classroomName: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, isLoading } = useAuth();
  const { tokens } = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: tokens.pageBg }}>
        <ActivityIndicator color={tokens.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="ClassroomDetail" component={ClassroomDetailScreen} />
            <Stack.Screen name="Documents"      component={DocumentsScreen} />
            <Stack.Screen name="DocumentReader" component={DocumentReaderScreen} />
            <Stack.Screen name="Notes"          component={NotesScreen} />
            <Stack.Screen name="NoteReader"     component={NoteReaderScreen} />
            <Stack.Screen name="Summaries"      component={SummariesScreen} />
            <Stack.Screen name="SummaryReader"  component={SummaryReaderScreen} />
            <Stack.Screen name="Chat"       component={ChatScreen} />
            <Stack.Screen name="Flashcards" component={FlashcardsScreen} />
            <Stack.Screen name="Quizzes"    component={QuizzesScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
