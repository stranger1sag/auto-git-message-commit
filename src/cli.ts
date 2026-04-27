#!/usr/bin/env node
import * as fs from 'fs';
import { parseDiff } from './core/diff';
import { generateCommitFromDiff } from './core/commit';

function readStdin(): string {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function main() {
  const argPath = process.argv[2];
  let input = '';
  if (argPath) {
    input = fs.readFileSync(argPath, 'utf8');
  } else {
    input = readStdin();
  }

  if (!input || input.trim().length === 0) {
    console.error('No diff input provided. Provide a diff via file path or stdin.');
    process.exit(2);
  }

  const files = parseDiff(input);
  const commit = generateCommitFromDiff(files, { includeBody: true, style: 'conventional' });

  // Output
  console.log(commit.subject);
  if (commit.body && commit.body.length > 0) {
    console.log('');
    console.log(commit.body.filter(line => line.length > 0).join('\n'));
  }
}

if (require.main === module) {
  main();
}

export { parseDiff };
