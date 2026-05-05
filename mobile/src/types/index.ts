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
  _count?: { documents: number };
}

export interface GlobalStudyStats {
  todaySeconds: number;
  weekSeconds: number;
  streak: number;
  dailyData: { date: string; seconds: number }[];
}

export interface Document {
  id: string;
  classroomId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
  errorMessage?: string;
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

export interface Summary {
  id: string;
  classroomId: string;
  title: string;
  content: string;
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
