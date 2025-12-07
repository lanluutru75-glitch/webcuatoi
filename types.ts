export type QuestionType = 'single' | 'multiple' | 'short' | 'fill' | 'essay';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: number;
  type: QuestionType;
  difficulty: Difficulty;
  question: string;
  options?: string[];
  correct_answer: string;
  points: number;
}

export interface User {
  ho_ten: string;
  cap_bac: string;
  chuc_vu: string;
  don_vi: string;
  sdt?: string;
}

export interface ExamResult {
  id: number;
  timestamp: string;
  user: User;
  score: number;
  totalScore: number;
  detailAnswers: Record<string, string>;
}

export interface SavedExam {
  id: number;
  name: string;
  questions: Question[];
  createdAt: string;
}

export interface SystemConfig {
  adminPassword: string;
  adminEmail: string;
  adminPhone: string;
  examDuration: number;
  maxAttempts: number;
  apiKey: string;
  publicUrl: string;
  useGoogleSearch: boolean;
  thinkingMode: boolean;
  fastMode: boolean;
  // Cloud Sync Fields
  cloudBinId?: string;
  cloudApiKey?: string;
  autoSync?: boolean;
}

export interface TopicConfig {
  subject: string;
  lesson: string;
  difficulty: 'mixed' | Difficulty;
  diffCounts: {
    easy: number;
    medium: number;
    hard: number;
  };
  typeCounts: Record<QuestionType, number>;
  typePoints: Record<QuestionType, number>;
}

// Extend Window for non-standard APIs
declare global {
  interface Window {
    html2pdf: any;
    webkitSpeechRecognition: any;
  }
}