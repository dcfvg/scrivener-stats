import { ProcessedStats } from '../types';
import { parseAndProcessScrivenerStats } from './analysis';

export type InputSourceType = 'export' | 'project';

export interface FileProcessingResult {
  stats: ProcessedStats;
  sourceName: string;
  sourceType: InputSourceType;
}

const MAX_PROJECT_SCAN_BYTES = 2 * 1024 * 1024;
const CANDIDATE_EXTENSIONS = ['.csv', '.tsv', '.txt', '.scrivx', '.xml', '.plist'];
const CANDIDATE_NAME_HINTS = ['history', 'statistics', 'stats', 'writing'];

/**
 * Detect whether a set of files looks like a Scrivener project folder.
 */
function hasScrivenerProjectSignature(files: File[]): boolean {
  return files.some((file) => {
    const name = file.name.toLowerCase();
    if (name.endsWith('.scrivx')) return true;
    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
    if (relativePath && relativePath.toLowerCase().includes('.scriv/')) return true;
    return false;
  });
}

/**
 * Try to derive a friendly project label from a list of files.
 */
function getProjectLabel(files: File[]): string | null {
  for (const file of files) {
    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
    if (!relativePath) continue;
    const normalized = relativePath.replace(/\\/g, '/');
    const parts = normalized.split('/');
    const scrivIndex = parts.findIndex((part) => part.toLowerCase().endsWith('.scriv'));
    if (scrivIndex >= 0) {
      return parts[scrivIndex];
    }
  }

  const scrivxFile = files.find((file) => file.name.toLowerCase().endsWith('.scrivx'));
  if (scrivxFile) {
    return scrivxFile.name.replace(/\.scrivx$/i, '.scriv');
  }

  return null;
}

/**
 * Decide whether a file is a likely candidate for stats data.
 */
function isLikelyStatsFile(file: File): boolean {
  const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  const name = (relativePath || file.name).toLowerCase();
  if (CANDIDATE_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return true;
  }
  return CANDIDATE_NAME_HINTS.some((hint) => name.includes(hint));
}

function getCandidateScore(file: File): number {
  const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  const name = (relativePath || file.name).toLowerCase();
  let score = 0;

  if (name.includes('writing history') || name.includes('writing_history')) score += 8;
  if (name.includes('project statistics') || name.includes('project_statistics')) score += 6;
  if (name.includes('history')) score += 3;
  if (name.includes('statistics') || name.includes('stats')) score += 2;
  if (name.includes('writing')) score += 2;

  if (name.endsWith('.scrivx')) score += 5;
  if (name.endsWith('.csv')) score += 3;
  if (name.endsWith('.tsv')) score += 2;
  if (name.endsWith('.txt')) score += 2;
  if (name.endsWith('.xml')) score += 1;

  const depth = Math.max(0, name.split('/').length - 1);
  return score - Math.min(depth, 4);
}

/**
 * Find and parse the best stats file from a Scrivener project selection.
 */
async function findBestStatsFile(files: File[]): Promise<{ stats: ProcessedStats; file: File } | null> {
  const candidates = files
    .filter((file) => {
      if (!isLikelyStatsFile(file)) return false;
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
      const name = (relativePath || file.name).toLowerCase();
      const isScrivx = name.endsWith('.scrivx');
      return isScrivx || file.size <= MAX_PROJECT_SCAN_BYTES;
    })
    .map((file) => ({ file, score: getCandidateScore(file) }))
    .sort((a, b) => b.score - a.score || a.file.name.localeCompare(b.file.name))
    .map((entry) => entry.file);

  for (const file of candidates) {
    try {
      const content = await file.text();
      const stats = parseAndProcessScrivenerStats(content);
      if (stats.dailyStats.length === 0) continue;
      return { stats, file };
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Process a selection of Scrivener exports or project files into stats.
 */
export async function processScrivenerFiles(files: File[]): Promise<FileProcessingResult> {
  if (!files.length) {
    throw new Error('No files provided.');
  }

  if (files.length === 1) {
    const file = files[0];
    if (file.name.toLowerCase().endsWith('.scriv')) {
      throw new Error('Scrivener projects are folders. Use the project folder picker or drag the .scriv folder.');
    }

    if (!hasScrivenerProjectSignature(files)) {
      const content = await file.text();
      const stats = parseAndProcessScrivenerStats(content);
      return { stats, sourceName: file.name, sourceType: 'export' };
    }
  }

  const best = await findBestStatsFile(files);
  if (!best) {
    throw new Error('No Scrivener statistics were found. Export Writing History or Project Statistics and try again.');
  }

  const projectLabel = getProjectLabel(files);
  return {
    stats: best.stats,
    sourceName: projectLabel ?? best.file.name,
    sourceType: 'project'
  };
}
