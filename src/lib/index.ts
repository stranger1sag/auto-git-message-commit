// ============================================================
// Library API - Expose core functionality for programmatic use
// ============================================================

// Re-export all from core modules
export * from '../core/index';
import { CommitMessage, BuilderConfig } from '../core/types';
import { parseDiff } from '../core/parser';
import { buildCommitMessage, formatMessage, formatJson } from '../core/builder';

/**
 * Quick helper: generate commit message from diff text
 */
export function generate(
  diffText: string,
  options?: {
    intelligent?: boolean;
    style?: BuilderConfig['style'];
    includeBody?: boolean;
    includeStats?: boolean;
  }
): CommitMessage {
  const parserConfig = {
    extractKeywords: options?.intelligent ?? true,
    parseHunks: false,
  };
  
  const builderConfig: BuilderConfig = {
    style: options?.style ?? 'conventional',
    includeBody: options?.includeBody ?? true,
    includeStats: options?.includeStats ?? true,
  };
  
  const result = parseDiff(diffText, parserConfig);
  return buildCommitMessage(result.files, result.stats, builderConfig);
}

export default {
  parse: parseDiff,
  build: buildCommitMessage,
  format: formatMessage,
  formatJson: formatJson,
};