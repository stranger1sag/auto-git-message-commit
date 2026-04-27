import { DiffFile } from './diff';

export interface CommitCandidate {
  subject: string;
  body: string[];
  scope?: string;
}

function describeChange(f: DiffFile): string {
  if (f.changeType === 'A') return `add ${f.path}`;
  if (f.changeType === 'D') return `remove ${f.path}`;
  if (f.changeType === 'R') {
    const oldP = f.oldPath ?? 'unknown';
    const newP = f.newPath ?? f.path;
    return `rename ${oldP} -> ${newP}`;
  }
  // M or default
  return `update ${f.path}`;
}

export function generateCommitFromDiff(
  files: DiffFile[],
  options?: { includeBody?: boolean; style?: 'conventional' | 'custom' }
): CommitCandidate {
  const includeBody = options?.includeBody ?? true;
  const hasAddOrModify = files.some(f => f.changeType === 'A' || f.changeType === 'M');
  const hasDelete = files.some(f => f.changeType === 'D');
  let type: string;
  if (hasAddOrModify) type = 'feat';
  else if (hasDelete) type = 'chore';
  else type = 'chore';

  const scope = files.length === 1 ? (files[0].path.split('/')[0] ?? 'diff') : 'diff';

  let firstLine = files.map(f => describeChange(f)).slice(0, 3).join('; ');
  if (files.length > 1) {
    firstLine = `multiple changes across ${files.length} files`;
  }
  const subject = `${type}(${scope}): ${firstLine}`;

  const body: string[] = [];
  if (includeBody) {
    body.push('');
    for (const f of files) {
      const bullet = `- ${describeChange(f)}`;
      body.push(bullet);
      const extra = [] as string[];
      if (typeof f.added === 'number' && f.added > 0) extra.push(`added ${f.added} lines`);
      if (typeof f.removed === 'number' && f.removed > 0) extra.push(`removed ${f.removed} lines`);
      if (extra.length) body.push(`  - ${extra.join(', ')}`);
    }
  }

  return { subject, body, scope };
}
