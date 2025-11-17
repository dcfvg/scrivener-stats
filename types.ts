export interface WritingDayStat {
  date: Date;
  wordsAdded: number;
  wordsSubtracted: number;
  wordsNet: number;
}

export interface ProcessedStats {
  dailyStats: WritingDayStat[];
  totalWords: number;
  averageWordsPerDay: number;
  longestStreak: {
    length: number;
    startDate: Date | null;
    endDate: Date | null;
  };
  currentStreak: {
    length: number;
    startDate: Date | null;
    endDate: Date | null;
  };
  mostProductiveDay: WritingDayStat | null;
  firstDay: Date | null;
  lastDay: Date | null;
  effectiveEndDate: Date | null; // For productivity calculation (today if period is ongoing)
  writingDays: number;
  productivityRate: number;
  calendarData: { [key: string]: number };
  streakDistribution: { [length: string]: number };
}
