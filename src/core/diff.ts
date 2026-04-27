export type ChangeType = 'A'|'M'|'D'|'R';
export interface DiffFile {
  path: string;
  oldPath?: string;
  newPath?: string;
  changeType: ChangeType;
  added?: number;
  removed?: number;
}

/** Very lightweight diff parser for unified diff text.
 *  - Detects per-file changes (A/M/D/R)
 *  - Counts added/removed lines per file (approximate)
 *  - Ignores per-hunk details for MVP simplicity
 */
export function parseDiff(text: string): DiffFile[] {
  const lines = text.split(/\r?\n/);
  const files: DiffFile[] = [];
  let current: Partial<DiffFile> | null = null;
  let added = 0;
  let removed = 0;

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      // push previous file if any
      if (current && current.path) {
        current.added = added;
        current.removed = removed;
        files.push(current as DiffFile);
      }
      // reset for new file
      current = { path: '', changeType: 'M' };
      added = 0;
      removed = 0;
      // parse a/<path> and b/<path>
      const parts = line.split(' ');
      const aPath = parts.find(p => p.startsWith('a/'))?.slice(2) ?? '';
      const bPath = parts.find(p => p.startsWith('b/'))?.slice(2) ?? '';
      current!.path = bPath || aPath || '';
      current!.oldPath = aPath || undefined;
      current!.newPath = bPath || undefined;
    } else if (line.startsWith('new file mode')) {
      if (current) current.changeType = 'A';
    } else if (line.startsWith('deleted file mode')) {
      if (current) current.changeType = 'D';
    } else if (line.startsWith('rename from ')) {
      if (current) {
        current.changeType = 'R';
        current.oldPath = line.substring('rename from '.length).trim();
      }
    } else if (line.startsWith('rename to ')) {
      if (current) {
        current.changeType = 'R';
        current.newPath = line.substring('rename to '.length).trim();
        if (current.oldPath) current.path = current.newPath!;
      }
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      if (current) added++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      if (current) removed++;
    }
  }

  if (current && current.path) {
    current.added = added;
    current.removed = removed;
    files.push(current as DiffFile);
  }

  return files;
}
