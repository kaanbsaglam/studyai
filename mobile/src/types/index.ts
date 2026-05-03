export type Theme = 'light' | 'dark' | 'earth';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  tier: 'free' | 'premium';
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
}

export interface Classroom {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  classroomId: string;
  name: string;
  status: 'processing' | 'ready' | 'error';
  createdAt: string;
}

export interface FlashcardSet {
  id: string;
  classroomId: string;
  title: string;
  cardCount: number;
  createdAt: string;
}

export interface QuizSet {
  id: string;
  classroomId: string;
  title: string;
  questionCount: number;
  createdAt: string;
}

export interface Note {
  id: string;
  classroomId: string;
  title: string;
  content?: string;
  type: 'text' | 'audio';
  createdAt: string;
}

export interface StudyStats {
  totalMinutes: number;
  totalSessions: number;
  streakDays: number;
}
