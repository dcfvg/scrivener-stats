import { WritingDayStat, ProcessedStats } from '../types';
import Papa from 'papaparse';

// TSV format constants
const TSV_MIN_COLUMNS = 4; // Date, Added, Subtracted, Net

// Function to parse the TSV format from "Writing History..."
function parseTsvFormat(lines: string[]): WritingDayStat[] {
  const stats: WritingDayStat[] = [];
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const columns = lines[i].split('\t');
    if (columns.length < TSV_MIN_COLUMNS) {
      console.warn(`Row ${i + 1}: Expected at least ${TSV_MIN_COLUMNS} columns, got ${columns.length}`);
      continue;
    }

    // Parse date in UTC to match CSV format behavior
    const dateStr = columns[0].trim();
    const parsedDate = new Date(dateStr);
    if (isNaN(parsedDate.getTime())) {
      console.warn(`Skipping invalid date format in TSV row ${i + 1}: ${dateStr}`);
      continue;
    }
    
    // Convert to UTC for consistency
    const date = new Date(Date.UTC(
      parsedDate.getFullYear(),
      parsedDate.getMonth(),
      parsedDate.getDate()
    ));

    const wordsAdded = parseInt(columns[1], 10);
    const wordsSubtracted = parseInt(columns[2], 10);
    const wordsNet = parseInt(columns[3], 10);

    if (!isNaN(wordsAdded) && !isNaN(wordsSubtracted) && !isNaN(wordsNet)) {
      stats.push({ date, wordsAdded, wordsSubtracted, wordsNet });
    } else {
      console.warn(`Row ${i + 1}: Invalid numeric values - Added: ${columns[1]}, Subtracted: ${columns[2]}, Net: ${columns[3]}`);
    }
  }
  return stats;
}

// Function to parse the CSV format from "Project Statistics" or similar exports
function parseCsvFormat(fileContent: string): WritingDayStat[] {
  const stats: WritingDayStat[] = [];
  
  // Use PapaParse to parse CSV properly
  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim().toLowerCase()
  });

  if (parsed.errors.length > 0) {
    console.warn('CSV parsing warnings:', parsed.errors);
  }

  // Find the word count column with multiple possible names
  const possibleWordColumns = ['words (total)', 'words', 'total words', 'word count'];
  let wordColumn: string | undefined;
  
  if (parsed.data.length > 0) {
    const firstRow = parsed.data[0] as any;
    const columns = Object.keys(firstRow);
    
    for (const colName of possibleWordColumns) {
      if (columns.includes(colName)) {
        wordColumn = colName;
        break;
      }
    }
  }

  if (!wordColumn) {
    throw new Error("CSV file must contain a word count column like 'Words (Total)', 'Words', or 'Total Words'.");
  }

  // Parse each row
  parsed.data.forEach((row: any, index: number) => {
    if (!row.date) {
      console.warn(`CSV row ${index + 2}: Missing date, skipping`);
      return;
    }

    const dateStr = row.date.trim();
    const parts = dateStr.split('/');
    if (parts.length !== 3) {
      console.warn(`CSV row ${index + 2}: Invalid date format '${dateStr}', expected DD/MM/YYYY`);
      return;
    }

    // Parse DD/MM/YYYY format - use UTC to avoid timezone issues
    const [day, month, year] = parts.map((p: string) => parseInt(p, 10));
    const date = new Date(Date.UTC(year, month - 1, day));

    if (isNaN(date.getTime())) {
      console.warn(`CSV row ${index + 2}: Failed to parse date from '${dateStr}'`);
      return;
    }

    const wordsNet = parseInt(row[wordColumn], 10);
    if (isNaN(wordsNet)) {
      console.warn(`CSV row ${index + 2}: Invalid word count '${row[wordColumn]}'`);
      return;
    }

    stats.push({
      date,
      wordsNet: wordsNet,
      wordsAdded: wordsNet > 0 ? wordsNet : 0,
      wordsSubtracted: wordsNet < 0 ? -wordsNet : 0,
    });
  });

  return stats;
}


function parseScrivenerStats(fileContent: string): WritingDayStat[] {
  const lines = fileContent.trim().split(/\r?\n/).filter(line => line.trim() !== '');
  
  if (lines.length <= 1) {
    throw new Error("File is empty or contains only a header.");
  }
  
  const headerLine = lines[0].toLowerCase();
  
  // Try TSV format first (Writing History export)
  if (headerLine.includes('\t') && (headerLine.includes('added') || headerLine.includes('subtracted'))) {
    return parseTsvFormat(lines).sort((a, b) => a.date.getTime() - b.date.getTime());
  }
  
  // Try CSV format (Project Statistics export)
  if (headerLine.includes(',') && (headerLine.includes('words (total)') || headerLine.includes('words'))) {
    return parseCsvFormat(fileContent).sort((a, b) => a.date.getTime() - b.date.getTime());
  }
  
  // Fallback: Try to detect based on data line separator
  if (lines.length > 1) {
    if (lines[1].includes('\t')) {
      try {
        return parseTsvFormat(lines).sort((a, b) => a.date.getTime() - b.date.getTime());
      } catch (error) {
        console.error('TSV parsing failed:', error);
      }
    }
    
    if (lines[1].includes(',')) {
      try {
        return parseCsvFormat(fileContent).sort((a, b) => a.date.getTime() - b.date.getTime());
      } catch (error) {
        console.error('CSV parsing failed:', error);
      }
    }
  }
  
  throw new Error(
    "Unrecognized file format. Please provide:\n" +
    "- A tab-separated export from 'Writing History...' with columns: Date, Added, Subtracted, Net\n" +
    "- A comma-separated export from 'Project Statistics' with Date and word count columns"
  );
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
