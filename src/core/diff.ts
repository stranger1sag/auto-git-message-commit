export type ChangeType = 'A'|'M'|'D'|'R';
export interface DiffFile {
  path: string;
  oldPath?: string;
  newPath?: string;
  changeType: ChangeType;
  added?: number;
  removed?: number;
  notes?: string[];
}

function extractEntityFromLine(line: string): string | null {
  const l = line.replace(/^[+-]/, '').trim();
  const patterns = [
    /function\s+([A-Za-z_$][\w$]*)/,
    /const\s+([A-Za-z_$][\w$]*)\s*=\s*/,
    /let\s+([A-Za-z_$][\w$]*)\s*=\s*/,
    /class\s+([A-Za-z_$][\w$]*)/,
    /def\s+([A-Za-z_$][\w$]*)/
  ];
  for (const p of patterns) {
    const m = l.match(p);
    if (m && m[1]) return m[1];
  }
  // Fallback: return first token-like word, with simple stopword filtering
  const m = l.match(/([A-Za-z_$][\w$]*)/);
  const candidate = m ? m[1] : null;
  if (!candidate) return null;
  const stop = new Set([
    'details','summary','system','reminder','system-reminder','Your','You','from','build','plan','read','readonly','mode'
  ].map(s => s.toLowerCase()));
  if (stop.has(candidate.toLowerCase())) return null;
  return candidate;
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
  // Quick system-reminder extractor: capture notes inside <system-reminder> blocks
  // This helps users annotate diffs with executable reminders that we can surface as notes.
  let systemNotesBuffer: string[] = [];
  let inSystemReminder = false;
  // Note collection per file

  for (const line of lines) {
    // Lightweight handling for HTML-like system-reminder blocks embedded in diffs
    if (line.includes('<system-reminder>')) {
      const openIdx = line.indexOf('<system-reminder>') + '<system-reminder>'.length;
      const endIdx = line.indexOf('</system-reminder>');
      if (endIdx > -1) {
        const content = line.substring(openIdx, endIdx).trim();
        if (current && content) {
          if (!current.notes) current.notes = [];
          current.notes.push(content);
        }
        inSystemReminder = false;
      } else {
        const content = line.substring(openIdx).trim();
        systemNotesBuffer.push(content);
        inSystemReminder = true;
      }
      // skip further processing of this line for diff parsing
      continue;
    }
    if (inSystemReminder) {
      // Accumulate until we hit the closing tag
      const endIdx = line.indexOf('</system-reminder>');
      if (endIdx > -1) {
        const content = line.substring(0, endIdx).trim();
        systemNotesBuffer.push(content);
        if (current) {
          if (!current.notes) current.notes = [];
          if (systemNotesBuffer.length) current.notes.push(...systemNotesBuffer);
        }
        systemNotesBuffer = [];
        inSystemReminder = false;
      } else {
        systemNotesBuffer.push(line.trim());
      }
      continue;
    }
    if (line.startsWith('diff --git ')) {
      // push previous file if any
      if (current && current.path) {
        current.added = added;
        current.removed = removed;
        files.push(current as DiffFile);
      }
      // reset for new file
      current = { path: '', changeType: 'M', added: 0, removed: 0, notes: [] };
      added = 0;
      removed = 0;
      // parse a/<path> and b/<path>
      const parts = line.split(' ');
      const aPath = parts.find(p => p.startsWith('a/'))?.slice(2) ?? '';
      const bPath = parts.find(p => p.startsWith('b/'))?.slice(2) ?? '';
      current!.path = bPath || aPath || '';
      current!.oldPath = aPath || undefined;
      current!.newPath = bPath || undefined;
      if (current!.notes) current!.notes = [];
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
      if (current) {
        added++;
        const ent = extractEntityFromLine(line);
        if (ent && current.notes) current.notes.push(ent);
        // Intelligence: extract additional notes from added lines
        const intel = extractIntelligentNotesFromLine(line);
        if (intel.length && current.notes) current.notes.push(...intel);
      }
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

// Intelligent note extractor: tries to surface semantic hints from an added line
function extractIntelligentNotesFromLine(line: string): string[] {
  const notes: string[] = [];
  const raw = line.replace(/^[+]/, '').trim();
  if (!raw) return notes;
  const lower = raw.toLowerCase();
  // Simple keyword-driven heuristics
  const keywords = [
    'function','class','interface','api','endpoint','route','test','tests','describe','it','mock','docs','readme','markdown','config','lint','eslint','prettier','db','database','migration','schema','update','add','remove','rename','refactor'
  ];
  for (const kw of keywords) {
    if (lower.includes(kw)) {
      notes.push(raw);
      break;
    }
  }
  // Capture a potential identifier function/class name if present
  const m = raw.match(/([A-Za-z_$][\w$]*)\s*\(/);
  if (m && m[1]) notes.push(m[1]);
  // Deduplicate and return
  return Array.from(new Set(notes.map(n => n.trim()).filter(Boolean)));
}
