
export enum Mood {
  Sad = 'sad',
  Neutral = 'neutral',
  Happy = 'happy',
  VeryHappy = 'very-happy',
  Amazing = 'amazing'
}

export const MoodEmojis: Record<Mood, string> = {
  [Mood.Sad]: '😫',
  [Mood.Neutral]: '😐',
  [Mood.Happy]: '🙂',
  [Mood.VeryHappy]: '😊',
  [Mood.Amazing]: '🤩'
};

export type SyncStatus = 'synced' | 'pending' | 'error';

export interface JournalEntry {
  id: string;
  user_id: string;
  weekNumber: number;
  year: number;
  date: string;
  mood: Mood;
  title: string;
  content: string;
  photos: string[];
  updated_at: string;
  deleted_at?: string; // 软删除标记
  syncStatus: SyncStatus;
}

export interface UserProfile {
  id: string;
  email: string;
  nickname: string;
  birthday: string;
  target_age: number;
  avatar_url?: string;
  updated_at?: string;
}

export type AppView = 'welcome' | 'onboarding' | 'dashboard';
