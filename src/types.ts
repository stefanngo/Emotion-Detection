export interface EmotionData {
  angry: number;
  disgusted: number;
  fearful: number;
  happy: number;
  neutral: number;
  sad: number;
  surprised: number;
}

export interface DiaryEntry {
  id: string;
  startTime: string;
  endTime: string;
  averageEmotions: EmotionData;
  annotation: string;
  timestamp: number;
}

export interface AppSettings {
  scanFrequency: number; // in seconds
  reportFrequency: number; // in minutes
  detectionSensitivity: number; // 0.1 to 0.9
}
