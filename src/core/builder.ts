// ============================================================
// Commit Builder - Generate commit messages from parsed diffs
// ============================================================

import {
  DiffFile,
  CommitMessage,
  BuilderConfig,
  DiffStats,
} from './types';

/** Default builder configuration */
export const DEFAULT_BUILDER_CONFIG: BuilderConfig = {
  style: 'conventional',
  includeBody: true,
  includeStats: true,
  maxFilesInSubject: 3,
  scopeStrategy: 'first',
};

/**
 * Describe a file change in human-readable form
 */
export function describeChange(file: DiffFile): string {
  const { changeType, path, oldPath, newPath } = file;
  
  switch (changeType) {
    case 'A':
      return `add ${path}`;
    case 'D':
      return `remove ${path}`;
    case 'R':
      return `rename ${oldPath || 'unknown'} -> ${newPath || path}`;
    case 'M':
    default:
      return `update ${path}`;
  }
}

/**
 * Determine commit type based on changes
 */
export function determineType(files: DiffFile[]): string {
  const hasAdd = files.some(f => f.changeType === 'A');
  const hasModify = files.some(f => f.changeType === 'M');
  const hasDelete = files.some(f => f.changeType === 'D');
  const hasRename = files.some(f => f.changeType === 'R');

  // Priority: feat > fix > chore
  if (hasAdd || hasModify) return 'feat';
  if (hasDelete || hasRename) return 'fix';
  return 'chore';
}

/**
 * Determine scope based on files
 */
export function determineScope(files: DiffFile[], strategy: BuilderConfig['scopeStrategy']): string {
  if (files.length === 0) return 'diff';
  
  switch (strategy) {
    case 'first':
      return files[0].path.split('/')[0] || 'diff';
    case 'all':
      const scopes = [...new Set(files.map(f => f.path.split('/')[0]))];
      return scopes.length === 1 ? scopes[0] : 'multiple';
    case 'auto':
    default:
      return files.length === 1 ? files[0].path.split('/')[0] : 'diff';
  }
}

/**
 * Build subject line
 */
export function buildSubject(
  files: DiffFile[],
  config: BuilderConfig
): string {
  const type = determineType(files);
  const scope = determineScope(files, config.scopeStrategy);

  let description: string;
  if (files.length === 1) {
    description = describeChange(files[0]);
  } else if (files.length <= (config.maxFilesInSubject || 3)) {
    description = files.map(f => describeChange(f)).slice(0, config.maxFilesInSubject).join('; ');
  } else {
    description = `multiple changes across ${files.length} files`;
  }

  if (config.style === 'conventional') {
    return `${type}(${scope}): ${description}`;
  }
  
  return `${type}: ${description}`;
}

/**
 * Build body lines
 */
export function buildBody(
  files: DiffFile[],
  stats: DiffStats,
  config: BuilderConfig
): string[] {
  if (!config.includeBody) return [];

  const body: string[] = [''];

  for (const file of files) {
    const change = describeChange(file);
    const line = `- ${change}`;
    body.push(line);

    const extras: string[] = [];

    if (config.includeStats) {
      if (file.added > 0) extras.push(`+${file.added}`);
      if (file.removed > 0) extras.push(`-${file.removed}`);
    }

    if (file.notes && file.notes.length) {
      const uniqueNotes = [...new Set(file.notes.map(n => n.toString().trim()))];
      extras.push(`[${uniqueNotes.join(', ')}]`);
    }

    if (extras.length) {
      body.push(`  ${extras.join(' ')}`);
    }
  }

  return body;
}

/**
 * Main commit builder function
 */
export function buildCommitMessage(
  files: DiffFile[],
  stats: DiffStats,
  config: BuilderConfig = DEFAULT_BUILDER_CONFIG
): CommitMessage {
  const type = determineType(files);
  const scope = determineScope(files, config.scopeStrategy);
  const subject = buildSubject(files, config);
  const body = config.includeBody ? buildBody(files, stats, config) : [];

  return {
    subject,
    body,
    scope,
    type,
  };
}

/**
 * Format commit message to string
 */
export function formatMessage(message: CommitMessage): string {
  const parts = [message.subject];
  if (message.body.length > 0) {
    parts.push('');
    parts.push(...message.body);
  }
  return parts.join('\n');
}

/**
 * Format as JSON
 */
export function formatJson(message: CommitMessage): string {
  return JSON.stringify({
    subject: message.subject,
    body: message.body,
    scope: message.scope,
    type: message.type,
  }, null, 2);
}