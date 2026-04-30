#!/usr/bin/env node
// ============================================================
// CLI - Command Line Interface
// ============================================================

import * as fs from 'fs';
import { parseDiff, buildCommitMessage, formatMessage } from './core';
import { ParserConfig, BuilderConfig } from './core/types';

interface CliFlags {
  intelligent: boolean;
  style: 'conventional' | 'simple';
  json: boolean;
  stats: boolean;
  body: boolean;
  maxFiles?: number;
  output?: string;
  help: boolean;
}

const DEFAULT_FLAGS: CliFlags = {
  intelligent: true,
  style: 'conventional',
  json: false,
  stats: true,
  body: true,
  help: false,
};

function parseArgs(args: string[]): { flags: CliFlags; files: string[] } {
  const flags: CliFlags = { ...DEFAULT_FLAGS };
  const files: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '-h':
      case '--help':
        flags.help = true;
        break;
      case '--no-intelligent':
        flags.intelligent = false;
        break;
      case '--intelligent':
        flags.intelligent = true;
        break;
      case '--json':
        flags.json = true;
        break;
      case '--no-stats':
        flags.stats = false;
        break;
      case '--no-body':
        flags.body = false;
        break;
      case '--simple':
        flags.style = 'simple';
        break;
      case '--conventional':
        flags.style = 'conventional';
        break;
      case '-m':
      case '--max-files':
        const val = args[++i];
        if (val) flags.maxFiles = parseInt(val, 10);
        break;
      case '-o':
      case '--output':
        const outFile = args[++i];
        if (outFile) flags.output = outFile;
        break;
      default:
        if (!arg.startsWith('-')) {
          files.push(arg);
        }
    }
  }

  return { flags, files };
}

function readStdin(): string {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function showHelp() {
  console.log(`
commit-gen - Generate git commit messages from diff

Usage: commit-gen [options] [diff-file]

Options:
  -h, --help              Show this help message
  --intelligent           Enable intelligent parsing (default)
  --no-intelligent       Disable intelligent parsing
  --json                  Output as JSON
  --conventional         Use conventional commit style (default)
  --simple               Use simple commit style
  --no-stats            Don't include line stats
  --no-body             Don't include body
  -m, --max-files N     Max files in subject line
  -o, --output FILE    Write to file instead of stdout

Examples:
  commit-gen path/to/diff.txt
  cat diff.txt | commit-gen
  git diff | commit-gen --json
`.trim());
}

function main() {
  const { flags, files } = parseArgs(process.argv.slice(2));

  if (flags.help) {
    showHelp();
    process.exit(0);
  }

  // Read input
  let input = '';
  if (files.length > 0) {
    input = fs.readFileSync(files[0], 'utf8');
  } else {
    input = readStdin();
  }

  if (!input || input.trim().length === 0) {
    console.error('Error: No diff input. Provide a diff via file or stdin.');
    process.exit(1);
  }

  // Configure parser
  const parserConfig: ParserConfig = {
    extractKeywords: flags.intelligent,
    parseHunks: false,
  };

  // Parse diff
  const result = parseDiff(input, parserConfig);

  // Configure builder
  const builderConfig: BuilderConfig = {
    style: flags.style,
    includeBody: flags.body,
    includeStats: flags.stats,
    maxFilesInSubject: flags.maxFiles,
    scopeStrategy: 'first',
  };

  // Build commit message
  const message = buildCommitMessage(result.files, result.stats, builderConfig);

  // Format output
  let output: string;
  if (flags.json) {
    output = JSON.stringify({
      subject: message.subject,
      body: message.body,
      scope: message.scope,
      type: message.type,
      stats: result.stats,
    }, null, 2);
  } else {
    output = [message.subject, ...message.body].join('\n');
  }

  // Write output
  if (flags.output) {
    fs.writeFileSync(flags.output, output, 'utf8');
    console.log(`Written to ${flags.output}`);
  } else {
    console.log(output);
  }
}

if (require.main === module) {
  main();
}

export { main, parseArgs, readStdin, showHelp };