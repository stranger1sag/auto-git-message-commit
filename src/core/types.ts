// ============================================================
// Core Types - Domain models for diff and commit
// ============================================================

/** Change type in git diff */
export type ChangeType = 'A' | 'M' | 'D' | 'R';

/** Parsed file change from diff */
export interface DiffFile {
  path: string;
  oldPath?: string;
  newPath?: string;
  changeType: ChangeType;
  added: number;
  removed: number;
  hunks: DiffHunk[];
  notes: string[];
}

/** A hunk in unified diff */
export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string[];
}

/** Commit message candidate */
export interface CommitMessage {
  subject: string;
  body: string[];
  scope?: string;
  type: string;
}

/** Parsing result with metadata */
export interface ParseResult {
  files: DiffFile[];
  stats: DiffStats;
  warnings: string[];
}

/** Overall diff statistics */
export interface DiffStats {
  totalFiles: number;
  addedFiles: number;
  modifiedFiles: number;
  deletedFiles: number;
  renamedFiles: number;
  totalAdditions: number;
  totalDeletions: number;
}

/** Parser configuration */
export interface ParserConfig {
  ignorePatterns?: RegExp[];
  extractKeywords?: boolean;
  parseHunks?: boolean;
}

/** Commit builder configuration */
export interface BuilderConfig {
  style: 'conventional' | 'simple' | 'custom';
  includeBody: boolean;
  includeStats: boolean;
  maxFilesInSubject?: number;
  scopeStrategy?: 'first' | 'all' | 'auto';
}

/** Combined configuration */
export interface Config {
  parser: ParserConfig;
  builder: BuilderConfig;
  intelligent: boolean;
}