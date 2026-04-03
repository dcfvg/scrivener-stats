import { WritingDayStat, ProcessedStats } from '../types';
import Papa from 'papaparse';

// TSV format constants
const TSV_MIN_COLUMNS = 4; // Date, Added, Subtracted, Net

type RawEntry = {
  date: Date;
  added?: number;
  subtracted?: number;
  net?: number;
  total?: number;
};

/**
 * Parse a number from a string that may include commas or spaces.
 */
function parseNumber(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  const cleaned = raw.toString().replace(/,/g, '').trim();
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/**
 * Normalize a date to a UTC date-only value.
 */
function toUtcDate(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

/**
 * Parse common date formats (ISO or DD/MM/YYYY) and normalize to UTC.
 */
function parseFlexibleDate(raw: string): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  if (!trimmed) return null;

  // ISO like 2020-07-07
  if (trimmed.includes('-')) {
    const iso = new Date(trimmed);
    if (!isNaN(iso.getTime())) {
      return toUtcDate(iso);
    }
  }

  // Slash-separated formats
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      const [p1, p2, p3] = parts;
      const n1 = parseInt(p1, 10);
      const n2 = parseInt(p2, 10);
      const n3 = parseInt(p3, 10);

      if (!Number.isNaN(n1) && !Number.isNaN(n2) && !Number.isNaN(n3)) {
        // YYYY/MM/DD
        if (p1.length === 4) {
          return toUtcDate(new Date(Date.UTC(n1, n2 - 1, n3)));
        }

        // Prefer DD/MM/YYYY, but allow MM/DD/YYYY if the month is unambiguous
        const dayFirst = n1 > 12 || n2 <= 12;
        const day = dayFirst ? n1 : n2;
        const month = dayFirst ? n2 : n1;
        return toUtcDate(new Date(Date.UTC(n3, month - 1, day)));
      }
    }
  }

  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? null : toUtcDate(fallback);
}

/**
 * Create a stable UTC date key for merging stats.
 */
function getUtcDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Return sorted unique UTC dates from a set of stats.
 */
function getUniqueUtcDates(stats: WritingDayStat[]): Date[] {
  const uniqueKeys = Array.from(new Set(stats.map((stat) => getUtcDateKey(stat.date))));
  return uniqueKeys
    .map((key) => {
      const [year, month, day] = key.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day));
    })
    .sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Convert cumulative totals into daily net stats.
 */
function buildDailyStatsFromTotals(entries: Array<{ date: Date; total: number }>): WritingDayStat[] {
  const sorted = [...entries].sort((a, b) => a.date.getTime() - b.date.getTime());
  const totals = sorted.map((entry) => entry.total);
  const hasNegative = totals.some((total) => total < 0);

  if (hasNegative) {
    return sorted.map((entry) => {
      const net = entry.total;
      return {
        date: entry.date,
        wordsNet: net,
        wordsAdded: Math.max(net, 0),
        wordsSubtracted: Math.max(-net, 0)
      };
    });
  }

  let previousTotal: number | null = null;
  return sorted.map((entry) => {
    const net = previousTotal === null ? entry.total : entry.total - previousTotal;
    previousTotal = entry.total;
    return {
      date: entry.date,
      wordsNet: net,
      wordsAdded: Math.max(net, 0),
      wordsSubtracted: Math.max(-net, 0)
    };
  });
}

/**
 * Merge raw XML-derived entries by date, preferring totals as maxima and summing daily changes.
 */
function mergeRawEntries(entries: RawEntry[]): RawEntry[] {
  const merged = new Map<string, RawEntry>();

  entries.forEach((entry) => {
    const key = getUtcDateKey(entry.date);
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, { ...entry, date: toUtcDate(entry.date) });
      return;
    }

    if (entry.added !== undefined) {
      existing.added = (existing.added ?? 0) + entry.added;
    }

    if (entry.subtracted !== undefined) {
      existing.subtracted = (existing.subtracted ?? 0) + entry.subtracted;
    }

    if (entry.net !== undefined) {
      existing.net = (existing.net ?? 0) + entry.net;
    }

    if (entry.total !== undefined) {
      if (existing.total === undefined || entry.total > existing.total) {
        existing.total = entry.total;
      }
    }
  });

  return Array.from(merged.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Build daily stats from mixed raw entries with net/additions or totals.
 */
function buildDailyStatsFromRawEntries(entries: RawEntry[]): WritingDayStat[] {
  const merged = mergeRawEntries(entries);
  const hasNetOrParts = merged.some((entry) => entry.net !== undefined || entry.added !== undefined || entry.subtracted !== undefined);
  const totalEntries = merged.filter((entry) => entry.total !== undefined) as Array<{ date: Date; total: number }>;

  if (!hasNetOrParts && totalEntries.length > 0) {
    return buildDailyStatsFromTotals(totalEntries);
  }

  return merged.map((entry) => {
    const net = entry.net ?? (entry.added ?? 0) - (entry.subtracted ?? 0);
    const wordsAdded = entry.added ?? Math.max(net, 0);
    const wordsSubtracted = entry.subtracted ?? Math.max(-net, 0);

    return {
      date: entry.date,
      wordsAdded,
      wordsSubtracted,
      wordsNet: net
    };
  });
}

/**
 * Parse the TSV format exported by Scrivener "Writing History".
 */
function parseTsvFormat(lines: string[]): WritingDayStat[] {
  const stats: WritingDayStat[] = [];
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const columns = lines[i].split('\t');
    if (columns.length < TSV_MIN_COLUMNS) {
      console.warn(`Row ${i + 1}: Expected at least ${TSV_MIN_COLUMNS} columns, got ${columns.length}`);
      continue;
    }

    const dateStr = columns[0].trim();
    const date = parseFlexibleDate(dateStr);
    if (!date) {
      console.warn(`Skipping invalid date format in TSV row ${i + 1}: ${dateStr}`);
      continue;
    }

    const wordsAdded = parseNumber(columns[1]);
    const wordsSubtracted = parseNumber(columns[2]);
    const wordsNet = parseNumber(columns[3]);

    if (wordsAdded !== null && wordsSubtracted !== null && wordsNet !== null) {
      stats.push({ date, wordsAdded, wordsSubtracted, wordsNet });
    } else {
      console.warn(`Row ${i + 1}: Invalid numeric values - Added: ${columns[1]}, Subtracted: ${columns[2]}, Net: ${columns[3]}`);
    }
  }
  return stats;
}

/**
 * Parse the CSV format exported from Scrivener "Project Statistics".
 */
function parseCsvFormat(fileContent: string): WritingDayStat[] {
  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim().toLowerCase()
  });

  if (parsed.errors.length > 0) {
    console.warn('CSV parsing warnings:', parsed.errors);
  }

  const possibleWordColumns = ['words (total)', 'words', 'words total', 'total words', 'word count'];
  const possibleDateColumns = ['date', 'day'];
  let wordColumn: string | undefined;
  let dateColumn: string | undefined;

  if (parsed.data.length > 0) {
    const firstRow = parsed.data[0] as Record<string, unknown>;
    const columns = Object.keys(firstRow);

    for (const colName of possibleWordColumns) {
      if (columns.includes(colName)) {
        wordColumn = colName;
        break;
      }
    }

    for (const colName of possibleDateColumns) {
      if (columns.includes(colName)) {
        dateColumn = colName;
        break;
      }
    }
  }

  if (!wordColumn) {
    throw new Error("CSV file must contain a word count column like 'Words (Total)', 'Words', or 'Total Words'.");
  }

  if (!dateColumn) {
    throw new Error("CSV file must contain a date column like 'Date'.");
  }

  const totals: Array<{ date: Date; total: number }> = [];

  parsed.data.forEach((row: Record<string, unknown>, index: number) => {
    const dateValue = row[dateColumn];
    if (!dateValue) {
      console.warn(`CSV row ${index + 2}: Missing date, skipping`);
      return;
    }

    const dateStr = String(dateValue).trim();
    const date = parseFlexibleDate(dateStr);
    if (!date) {
      console.warn(`CSV row ${index + 2}: Invalid date format '${dateStr}', expected DD/MM/YYYY or ISO`);
      return;
    }

    const totalValue = parseNumber(row[wordColumn] as string);
    if (totalValue === null) {
      console.warn(`CSV row ${index + 2}: Invalid word count '${row[wordColumn]}'`);
      return;
    }

    totals.push({ date, total: totalValue });
  });

  return buildDailyStatsFromTotals(totals);
}

/**
 * Parse writing history embedded in a Scrivener project XML file.
 */
function parseXmlFormat(fileContent: string): WritingDayStat[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(fileContent, 'application/xml');

  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Invalid XML in project file.');
  }

  const entries: RawEntry[] = [];
  const dateKeys = ['date', 'day', 'timestamp'];
  const addedKeys = ['added', 'wordsadded', 'additions'];
  const subtractedKeys = ['subtracted', 'deleted', 'removed', 'wordssubtracted', 'subtractions'];
  const netKeys = ['net', 'delta', 'change'];
  const totalKeys = ['total', 'words', 'wordcount', 'totalwords', 'wordstotal'];
  const numericKeyPattern = /(added|subtracted|deleted|removed|net|delta|change|total|words|count)/i;

  const getAttrMap = (element: Element): Record<string, string> => {
    const map: Record<string, string> = {};
    Array.from(element.attributes).forEach((attr) => {
      map[attr.name.toLowerCase()] = attr.value;
    });
    return map;
  };

  const getChildTextValue = (element: Element, keys: string[]): string | null => {
    const keySet = new Set(keys);
    for (const child of Array.from(element.children)) {
      const name = child.tagName.toLowerCase();
      if (keySet.has(name)) {
        return child.textContent?.trim() ?? null;
      }
    }
    return null;
  };

  const getDateValue = (element: Element, attrs: Record<string, string>): string | null => {
    for (const key of dateKeys) {
      if (attrs[key]) {
        return attrs[key];
      }
    }
    return getChildTextValue(element, dateKeys);
  };

  const getNumberValue = (element: Element, attrs: Record<string, string>, keys: string[]): number | null => {
    for (const key of keys) {
      if (attrs[key]) {
        const value = parseNumber(attrs[key]);
        if (value !== null) return value;
      }
    }

    const childText = getChildTextValue(element, keys);
    return childText ? parseNumber(childText) : null;
  };

  const elements = Array.from(doc.querySelectorAll('*'));

  elements.forEach((element) => {
    const attrs = getAttrMap(element);
    const name = element.tagName.toLowerCase();
    const parentName = element.parentElement?.tagName.toLowerCase() ?? '';
    const grandParentName = element.parentElement?.parentElement?.tagName.toLowerCase() ?? '';
    const context = `${name} ${parentName} ${grandParentName}`;

    const hasNumericSignal = Object.keys(attrs).some((key) => numericKeyPattern.test(key)) ||
      Array.from(element.children).some((child) => numericKeyPattern.test(child.tagName.toLowerCase()));

    const isLikelyHistory = /history|stat|statistics|writing/.test(context);
    const isEntryNode = /day|entry|record/.test(name);

    if (!hasNumericSignal || (!isLikelyHistory && !isEntryNode)) {
      return;
    }

    const dateValue = getDateValue(element, attrs);
    const date = dateValue ? parseFlexibleDate(dateValue) : null;
    if (!date) return;

    const added = getNumberValue(element, attrs, addedKeys);
    const subtracted = getNumberValue(element, attrs, subtractedKeys);
    const net = getNumberValue(element, attrs, netKeys);
    const total = getNumberValue(element, attrs, totalKeys);

    if (added === null && subtracted === null && net === null && total === null) {
      return;
    }

    entries.push({
      date,
      added: added ?? undefined,
      subtracted: subtracted ?? undefined,
      net: net ?? undefined,
      total: total ?? undefined
    });
  });

  if (entries.length === 0) {
    throw new Error('No writing history entries found in the project file.');
  }

  return buildDailyStatsFromRawEntries(entries);
}

/**
 * Detect and parse Scrivener exports (TSV/CSV) or project XML content.
 */
function parseScrivenerStats(fileContent: string): WritingDayStat[] {
  const sanitized = fileContent.replace(/^\uFEFF/, '');
  const trimmed = sanitized.trim();

  if (trimmed.startsWith('<')) {
    return parseXmlFormat(sanitized).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  const lines = trimmed.split(/\r?\n/).filter(line => line.trim() !== '');

  if (lines.length <= 1) {
    throw new Error('File is empty or contains only a header.');
  }

  const headerLine = lines[0].toLowerCase();

  if (headerLine.includes('\t') && (headerLine.includes('added') || headerLine.includes('subtracted'))) {
    return parseTsvFormat(lines).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  if (headerLine.includes(',') && (headerLine.includes('words (total)') || headerLine.includes('words'))) {
    return parseCsvFormat(sanitized).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

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
        return parseCsvFormat(sanitized).sort((a, b) => a.date.getTime() - b.date.getTime());
      } catch (error) {
        console.error('CSV parsing failed:', error);
      }
    }
  }

  throw new Error(
    'Unrecognized file format. Please provide:\n' +
    "- A tab-separated export from 'Writing History...' with columns: Date, Added, Subtracted, Net\n" +
    "- A comma-separated export from 'Project Statistics' with Date and word count columns\n" +
    '- Or a Scrivener project (.scriv) that contains writing history'
  );
}

/**
 * Compute the longest consecutive-day streak.
 */
function calculateLongestStreak(stats: WritingDayStat[]): { length: number; startDate: Date | null; endDate: Date | null; } {
  if (stats.length === 0) return { length: 0, startDate: null, endDate: null };

  let longestStreak = 0;
  let currentStreak = 0;
  let longestStreakStartDate: Date | null = null;
  let longestStreakEndDate: Date | null = null;
  let currentStreakStartDate: Date | null = null;

  const uniqueDates = getUniqueUtcDates(stats);

  if (uniqueDates.length > 0) {
    const firstDate = uniqueDates[0];
    longestStreak = 1;
    currentStreak = 1;
    longestStreakStartDate = firstDate;
    longestStreakEndDate = firstDate;
    currentStreakStartDate = firstDate;
  }

  for (let i = 1; i < uniqueDates.length; i++) {
    const currentDate = uniqueDates[i];
    const prevDate = uniqueDates[i - 1];

    const diffTime = currentDate.getTime() - prevDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak++;
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

/**
 * Compute the current streak ending on the latest activity date.
 */
function calculateCurrentStreak(stats: WritingDayStat[]): { length: number; startDate: Date | null; endDate: Date | null; } {
  if (stats.length === 0) return { length: 0, startDate: null, endDate: null };

  const uniqueDates = getUniqueUtcDates(stats);

  let streakLength = 1;
  let streakEnd = uniqueDates[uniqueDates.length - 1];
  let streakStart = streakEnd;

  for (let i = uniqueDates.length - 2; i >= 0; i--) {
    const currentDate = uniqueDates[i];
    const nextDate = uniqueDates[i + 1];
    const diffDays = Math.round((nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      streakLength++;
      streakStart = currentDate;
    } else {
      break;
    }
  }

  return { length: streakLength, startDate: streakStart, endDate: streakEnd };
}

/**
 * Count how many streaks exist for each length.
 */
function calculateStreakDistribution(stats: WritingDayStat[]): { [length: string]: number } {
  const distribution: { [length: string]: number } = {};
  if (stats.length === 0) return distribution;

  const uniqueDates = getUniqueUtcDates(stats);

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

  if (currentStreak > 1) {
    const key = `${currentStreak}-day streak`;
    distribution[key] = (distribution[key] || 0) + 1;
  }

  return distribution;
}

/**
 * Build aggregate statistics for the dashboard.
 */
function buildProcessedStats(dailyStats: WritingDayStat[]): ProcessedStats {
  if (!dailyStats || dailyStats.length === 0) {
    return {
      dailyStats: [],
      totalWords: 0,
      averageWordsPerDay: 0,
      longestStreak: { length: 0, startDate: null, endDate: null },
      currentStreak: { length: 0, startDate: null, endDate: null },
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

  const writingDays = dailyStats.length;

  const totalWords = dailyStats.reduce((sum, day) => sum + day.wordsNet, 0);
  const averageWordsPerDay = writingDays > 0 ? Math.round(totalWords / writingDays) : 0;

  const longestStreak = calculateLongestStreak(dailyStats);
  const currentStreak = calculateCurrentStreak(dailyStats);
  const streakDistribution = calculateStreakDistribution(dailyStats);

  const mostProductiveDay = [...dailyStats].sort((a, b) => b.wordsNet - a.wordsNet)[0] || null;

  const firstDay = dailyStats[0]?.date || null;
  const lastDay = dailyStats[dailyStats.length - 1]?.date || null;

  const calendarData: { [key: string]: number } = {};
  dailyStats.forEach(day => {
    const date = day.date;
    const dateKey = getUtcDateKey(date);
    calendarData[dateKey] = (calendarData[dateKey] || 0) + day.wordsNet;
  });

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
    currentStreak,
    calendarData,
    streakDistribution,
  };
}

/**
 * Parse raw file content and compute Scrivener statistics.
 */
export function parseAndProcessScrivenerStats(fileContent: string): ProcessedStats {
  const dailyStats = parseScrivenerStats(fileContent);
  return buildProcessedStats(dailyStats);
}

/**
 * Normalize incoming stats to UTC dates and rebuild aggregates.
 */
export function processWritingDayStats(dailyStats: WritingDayStat[]): ProcessedStats {
  if (!Array.isArray(dailyStats) || dailyStats.length === 0) {
    return buildProcessedStats([]);
  }
  const normalizedStats: WritingDayStat[] = dailyStats
    .map((stat) => {
      const normalizedDate = normalizeStatDate(stat.date);
      if (!normalizedDate) return null;
      return {
        date: normalizedDate,
        wordsAdded: Number.isFinite(stat.wordsAdded) ? stat.wordsAdded : Math.max(0, stat.wordsNet || 0),
        wordsSubtracted: Number.isFinite(stat.wordsSubtracted) ? stat.wordsSubtracted : Math.max(0, -(stat.wordsNet || 0)),
        wordsNet: Number.isFinite(stat.wordsNet)
          ? stat.wordsNet
          : (Number.isFinite(stat.wordsAdded) ? stat.wordsAdded : 0) - (Number.isFinite(stat.wordsSubtracted) ? stat.wordsSubtracted : 0)
      };
    })
    .filter((stat): stat is WritingDayStat => Boolean(stat))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  return buildProcessedStats(normalizedStats);
}

function normalizeStatDate(dateValue: Date | string): Date | null {
  if (!dateValue) return null;
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (isNaN(date.getTime())) return null;
  return toUtcDate(date);
}
