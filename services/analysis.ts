import { WritingDayStat, ProcessedStats } from '../types';

// Helper for CSV format
interface DailyTotal {
  date: Date;
  totalWords: number;
}

// Function to parse the TSV format from "Writing History..."
function parseTsvFormat(lines: string[]): WritingDayStat[] {
  const stats: WritingDayStat[] = [];
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const columns = lines[i].split('\t');
    if (columns.length < 4) continue;

    const date = new Date(columns[0]);
    if (isNaN(date.getTime())) {
      console.warn(`Skipping invalid date format in TSV: ${columns[0]}`);
      continue;
    }

    const wordsAdded = parseInt(columns[1], 10);
    const wordsSubtracted = parseInt(columns[2], 10);
    const wordsNet = parseInt(columns[3], 10);

    if (!isNaN(wordsAdded) && !isNaN(wordsSubtracted) && !isNaN(wordsNet)) {
      stats.push({ date, wordsAdded, wordsSubtracted, wordsNet });
    }
  }
  return stats;
}

// Function to parse the CSV format from "Project Statistics" or similar exports
function parseCsvFormat(lines: string[]): WritingDayStat[] {
  const stats: WritingDayStat[] = [];
  
  // Find column index for Date and Words (Total) from header, removing potential quotes
  const headerColumns = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const dateIndex = headerColumns.indexOf('date');
  let wordsNetIndex = headerColumns.indexOf('words (total)');
  // Fallback for different header naming conventions
  if (wordsNetIndex === -1) {
    wordsNetIndex = headerColumns.indexOf('words');
  }


  if (dateIndex === -1 || wordsNetIndex === -1) {
    throw new Error("CSV file must contain 'Date' and a word count column like 'Words (Total)'.");
  }

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const columns = lines[i].split(',');
    if (columns.length <= Math.max(dateIndex, wordsNetIndex)) continue;

    const dateStr = columns[dateIndex].replace(/"/g, '').trim();
    const parts = dateStr.split('/');
    if (parts.length !== 3) {
      console.warn(`Skipping invalid date format in CSV: ${dateStr}`);
      continue;
    }
    // Parse DD/MM/YYYY format - use UTC to avoid timezone issues
    const [day, month, year] = parts.map(p => parseInt(p, 10));
    const date = new Date(Date.UTC(year, month - 1, day));

    if (isNaN(date.getTime())) {
      console.warn(`Skipping invalid date from parsed parts: ${dateStr}`);
      continue;
    }

    const wordsNet = parseInt(columns[wordsNetIndex], 10);
    if (!isNaN(wordsNet)) {
      stats.push({
        date,
        wordsNet: wordsNet,
        wordsAdded: wordsNet > 0 ? wordsNet : 0,
        wordsSubtracted: wordsNet < 0 ? -wordsNet : 0,
      });
    }
  }
  return stats;
}


function parseScrivenerStats(fileContent: string): WritingDayStat[] {
  // Trim content and filter out empty lines
  const lines = fileContent.trim().split(/\r?\n/).filter(line => line.trim() !== '');
  
  if (lines.length <= 1) {
    throw new Error("File is empty or contains only a header.");
  }
  
  const headerLine = lines[0].toLowerCase();
  
  let stats: WritingDayStat[];

  // Detect format based on header content
  if (headerLine.includes('\t') && (headerLine.includes('added') || headerLine.includes('subtracted'))) {
    stats = parseTsvFormat(lines);
  } else if (headerLine.includes(',') && (headerLine.includes('words (total)') || headerLine.includes('words'))) {
    stats = parseCsvFormat(lines);
  } else {
    // Fallback detection based on separator in first data line
    if (lines.length > 1 && lines[1].includes('\t')) {
        stats = parseTsvFormat(lines);
    } else if (lines.length > 1 && lines[1].includes(',')) {
        // Assume CSV if header is non-standard but data is comma-separated
        try {
            stats = parseCsvFormat(lines);
        } catch(e) {
             throw new Error("Unrecognized file format. Please provide a tab-separated export from 'Writing History...' or a comma-separated export with 'Date' and a word count column.");
        }
    } else {
        throw new Error("Unrecognized file format. Please provide a tab-separated export from 'Writing History...' or a comma-separated export with 'Date' and a word count column.");
    }
  }

  // Sort by date ascending (final sort after parsing)
  return stats.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function calculateLongestStreak(stats: WritingDayStat[]): { length: number; startDate: Date | null; endDate: Date | null; } {
  if (stats.length === 0) return { length: 0, startDate: null, endDate: null };

  let longestStreak = 0;
  let currentStreak = 0;
  let longestStreakStartDate: Date | null = null;
  let longestStreakEndDate: Date | null = null;
  let currentStreakStartDate: Date | null = null;
  
  const uniqueDates = Array.from(new Set(stats.map(s => s.date.toDateString())));
  uniqueDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  if (uniqueDates.length > 0) {
      const firstDate = new Date(uniqueDates[0]);
      longestStreak = 1;
      currentStreak = 1;
      longestStreakStartDate = firstDate;
      longestStreakEndDate = firstDate;
      currentStreakStartDate = firstDate;
  }

  for (let i = 1; i < uniqueDates.length; i++) {
    const currentDate = new Date(uniqueDates[i]);
    const prevDate = new Date(uniqueDates[i - 1]);
    
    const diffTime = currentDate.getTime() - prevDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak++;
      // Update longest if current streak is now longer
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
        longestStreakStartDate = currentStreakStartDate;
        longestStreakEndDate = currentDate;
      }
    } else {
      currentStreak = 1;
      currentStreakStartDate = currentDate;
    }
  }

  return { length: longestStreak, startDate: longestStreakStartDate, endDate: longestStreakEndDate };
}

function calculateStreakDistribution(stats: WritingDayStat[]): { [length: string]: number } {
    const distribution: { [length: string]: number } = {};
    if (stats.length === 0) return distribution;

    const uniqueDates = Array.from(new Set(stats.map(s => s.date.toDateString())));
    uniqueDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    if (uniqueDates.length === 0) return {};

    let currentStreak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
        const currentDate = new Date(uniqueDates[i]);
        const prevDate = new Date(uniqueDates[i - 1]);
        const diffDays = Math.round((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            currentStreak++;
        } else {
            if (currentStreak > 1) {
                const key = `${currentStreak}-day streak`;
                distribution[key] = (distribution[key] || 0) + 1;
            }
            currentStreak = 1;
        }
    }
    
    // account for the final streak
    if (currentStreak > 1) {
        const key = `${currentStreak}-day streak`;
        distribution[key] = (distribution[key] || 0) + 1;
    }

    return distribution;
}


export function parseAndProcessScrivenerStats(fileContent: string): ProcessedStats {
  const dailyStats = parseScrivenerStats(fileContent);

  if (dailyStats.length === 0) {
    return {
      dailyStats: [],
      totalWords: 0,
      averageWordsPerDay: 0,
      longestStreak: { length: 0, startDate: null, endDate: null },
      mostProductiveDay: null,
      firstDay: null,
      lastDay: null,
      effectiveEndDate: null,
      writingDays: 0,
      productivityRate: 0,
      calendarData: {},
      streakDistribution: {},
    };
  }

  // Count all days with any writing activity (including negative net words from editing/deleting)
  // All days in the export represent active writing sessions
  const writingDays = dailyStats.length;
  
  const totalWords = dailyStats.reduce((sum, day) => sum + day.wordsNet, 0);
  const averageWordsPerDay = writingDays > 0 ? Math.round(totalWords / writingDays) : 0;
  
  // Use all days for streak calculation, not just positive word days
  const longestStreak = calculateLongestStreak(dailyStats);
  const streakDistribution = calculateStreakDistribution(dailyStats);

  const mostProductiveDay = [...dailyStats].sort((a, b) => b.wordsNet - a.wordsNet)[0] || null;

  const firstDay = dailyStats[0]?.date || null;
  const lastDay = dailyStats[dailyStats.length - 1]?.date || null;
  
  // Build calendar data using UTC dates for consistency
  const calendarData: { [key: string]: number } = {};
  dailyStats.forEach(day => {
    const date = day.date;
    const dateKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    calendarData[dateKey] = (calendarData[dateKey] || 0) + day.wordsNet;
  });

  // Calculate productivity rate (percentage of days with writing activity)
  // For the current period, only count days up to today if still writing
  const today = new Date();
  const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const effectiveEndDate = (lastDay && lastDay > todayUTC) ? todayUTC : lastDay;
  
  const totalDays = firstDay && effectiveEndDate
    ? Math.ceil((effectiveEndDate.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;
  const productivityRate = totalDays > 0 ? Math.round((writingDays / totalDays) * 100) : 0;

  return {
    dailyStats,
    totalWords,
    averageWordsPerDay,
    longestStreak,
    mostProductiveDay,
    firstDay,
    lastDay,
    effectiveEndDate,
    writingDays,
    productivityRate,
    calendarData,
    streakDistribution,
  };
}
