// ============================================================
// Diff Parser - Parse unified diff format into structured data
// ============================================================

import { 
  DiffFile, 
  DiffHunk, 
  ChangeType, 
  ParseResult, 
  DiffStats,
  ParserConfig 
} from './types';

/** Default parser configuration */
export const DEFAULT_PARSER_CONFIG: ParserConfig = {
  ignorePatterns: [],
  extractKeywords: true,
  parseHunks: false,
};

/**
 * Classify a diff line type
 */
export type LineType = 
  | 'header'      // diff --git a/... b/...
  | 'newFile'     // new file mode
  | 'deletedFile' // deleted file mode
  | 'renameFrom'  // rename from
  | 'renameTo'    // rename to
  | 'index'       // index ...
  | 'hunk'       // @@ -x,y +x,y @@
  | 'add'        // +content
  | 'remove'     // -content
  | 'context'    //  content
  | 'unknown';

export function classifyLine(line: string): LineType {
  if (line.startsWith('diff --git ')) return 'header';
  if (line.startsWith('new file mode')) return 'newFile';
  if (line.startsWith('deleted file mode')) return 'deletedFile';
  if (line.startsWith('rename from ')) return 'renameFrom';
  if (line.startsWith('rename to ')) return 'renameTo';
  if (line.startsWith('index ')) return 'index';
  if (line.startsWith('@@')) return 'hunk';
  if (line.startsWith('+') && !line.startsWith('+++')) return 'add';
  if (line.startsWith('-') && !line.startsWith('---')) return 'remove';
  if (line.startsWith(' ') || line.length === 0) return 'context';
  return 'unknown';
}

/**
 * Parse a file path from diff header line
 */
export function parseFilePath(line: string): { oldPath: string; newPath: string } {
  const parts = line.split(' ');
  const aPath = parts.find(p => p.startsWith('a/'))?.slice(2) ?? '';
  const bPath = parts.find(p => p.startsWith('b/'))?.slice(2) ?? '';
  return { oldPath: aPath, newPath: bPath };
}

/**
 * Parse hunk header (@@ -old +new @@)
 */
export function parseHunkHeader(line: string): { oldStart: number; oldLines: number; newStart: number; newLines: number } | null {
  const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
  if (!match) return null;
  return {
    oldStart: parseInt(match[1], 10),
    oldLines: match[2] ? parseInt(match[2], 10) : 1,
    newStart: parseInt(match[3], 10),
    newLines: match[4] ? parseInt(match[4], 10) : 1,
  };
}

/**
 * Extract entities (function, class, etc.) from code line
 */
export function extractEntity(line: string): string | null {
  const content = line.replace(/^[+-]/, '').trim();
  const patterns = [
    /function\s+([A-Za-z_$][\w$]*)/,
    /const\s+([A-Za-z_$][\w$]*)\s*=/,
    /let\s+([A-Za-z_$][\w$]*)\s*=/,
    /class\s+([A-Za-z_$][\w$]*)/,
    /def\s+([A-Za-z_$][\w$]*)/,
    /interface\s+([A-Za-z_$][\w$]*)/,
    /type\s+([A-Za-z_$][\w$]*)\s*=/,
  ];
  for (const p of patterns) {
    const m = content.match(p);
    if (m && m[1]) return m[1];
  }
  return null;
}

/**
 * Filter common stopwords
 */
const STOPWORDS = new Set([
  'details', 'summary', 'system', 'reminder', 'Your', 'You', 
  'from', 'build', 'plan', 'read', 'readonly', 'mode',
  'return', 'const', 'let', 'var', 'if', 'else', 'for', 'while',
]);

export function filterStopword(word: string): boolean {
  return !STOPWORDS.has(word.toLowerCase());
}

/**
 * Extract intelligent keywords from code line
 */
export function extractKeywords(line: string): string[] {
  const content = line.replace(/^[+]/, '').trim();
  const keywords = [
    'function', 'class', 'interface', 'api', 'endpoint', 'route',
    'test', 'tests', 'describe', 'it', 'mock',
    'docs', 'readme', 'markdown',
    'config', 'lint', 'eslint', 'prettier',
    'db', 'database', 'migration', 'schema',
    'add', 'remove', 'rename', 'refactor', 'update', 'fix',
  ];
  const found: string[] = [];
  const lower = content.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw)) {
      found.push(content);
      break;
    }
  }
  // Extract function calls
  const fnMatch = content.match(/([A-Za-z_$][\w$]*)\s*\(/);
  if (fnMatch && fnMatch[1]) {
    found.push(fnMatch[1]);
  }
  return [...new Set(found)];
}

/**
 * Main diff parser function
 */
export function parseDiff(text: string, config: ParserConfig = DEFAULT_PARSER_CONFIG): ParseResult {
  const lines = text.split(/\r?\n/);
  const files: DiffFile[] = [];
  const warnings: string[] = [];
  
  let currentFile: Partial<DiffFile> | null = null;
  let currentHunk: DiffHunk | null = null;
  let added = 0;
  let removed = 0;
  let inSystemReminder = false;
  let systemNotes: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineType = classifyLine(line);

    // Handle system-reminder blocks (special metadata)
    if (line.includes('<system-reminder>')) {
      const openIdx = line.indexOf('<system-reminder>') + '<system-reminder>'.length;
      const endIdx = line.indexOf('</system-reminder>');
      if (endIdx > -1) {
        const content = line.substring(openIdx, endIdx).trim();
        if (currentFile && content) {
          currentFile.notes = currentFile.notes || [];
          currentFile.notes.push(content);
        }
      } else {
        systemNotes.push(line.substring(openIdx).trim());
        inSystemReminder = true;
      }
      continue;
    }

    if (inSystemReminder) {
      const endIdx = line.indexOf('</system-reminder>');
      if (endIdx > -1) {
        systemNotes.push(line.substring(0, endIdx).trim());
        if (currentFile) {
          currentFile.notes = currentFile.notes || [];
          currentFile.notes.push(...systemNotes.filter(Boolean));
        }
        systemNotes = [];
        inSystemReminder = false;
      } else {
        systemNotes.push(line.trim());
      }
      continue;
    }

    // File header
    if (lineType === 'header') {
      // Save previous file
      if (currentFile && currentFile.path) {
        currentFile.added = added;
        currentFile.removed = removed;
        files.push(currentFile as DiffFile);
      }
      // Parse new file
      const { oldPath, newPath } = parseFilePath(line);
      currentFile = {
        path: newPath || oldPath,
        oldPath,
        newPath,
        changeType: 'M' as ChangeType,
        added: 0,
        removed: 0,
        hunks: [],
        notes: [],
      };
      added = 0;
      removed = 0;
      currentHunk = null;
      continue;
    }

    // File status indicators
    if (!currentFile) continue;

    if (lineType === 'newFile') {
      currentFile.changeType = 'A';
    } else if (lineType === 'deletedFile') {
      currentFile.changeType = 'D';
    } else if (lineType === 'renameFrom') {
      currentFile.changeType = 'R';
      currentFile.oldPath = line.substring('rename from '.length).trim();
    } else if (lineType === 'renameTo') {
      currentFile.changeType = 'R';
      currentFile.newPath = line.substring('rename to '.length).trim();
      if (currentFile.oldPath) currentFile.path = currentFile.newPath!;
    }

    // Count additions/deletions
    if (lineType === 'add' && config.extractKeywords) {
      added++;
      const entity = extractEntity(line);
      if (entity && filterStopword(entity)) {
        currentFile.notes = currentFile.notes || [];
        currentFile.notes.push(entity);
      }
      const keywords = extractKeywords(line);
      if (keywords.length) {
        currentFile.notes = currentFile.notes || [];
        currentFile.notes.push(...keywords);
      }
    } else if (lineType === 'remove') {
      removed++;
    }

    // Parse hunks if enabled
    if (config.parseHunks && lineType === 'hunk') {
      const hunkInfo = parseHunkHeader(line);
      if (hunkInfo) {
        currentHunk = {
          ...hunkInfo,
          content: [],
        };
        currentFile.hunks = currentFile.hunks || [];
        currentFile.hunks.push(currentHunk);
      }
    } else if (currentHunk && (lineType === 'add' || lineType === 'remove' || lineType === 'context')) {
      currentHunk.content.push(line);
    }
  }

  // Push last file
  if (currentFile && currentFile.path) {
    currentFile.added = added;
    currentFile.removed = removed;
    files.push(currentFile as DiffFile);
  }

  // Calculate stats
  const stats: DiffStats = {
    totalFiles: files.length,
    addedFiles: files.filter(f => f.changeType === 'A').length,
    modifiedFiles: files.filter(f => f.changeType === 'M').length,
    deletedFiles: files.filter(f => f.changeType === 'D').length,
    renamedFiles: files.filter(f => f.changeType === 'R').length,
    totalAdditions: files.reduce((sum, f) => sum + f.added, 0),
    totalDeletions: files.reduce((sum, f) => sum + f.removed, 0),
  };

  return { files, stats, warnings };
}