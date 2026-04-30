# commit-gen

Generate git commit messages from diff text. Modular, extensible, and ready for CI/CD.

## Quick Start

```bash
npm install
npm run build
node dist/cli.js <diff-file>
```

Or pipe diff from stdin:

```bash
git diff | node dist/cli.js
cat diff.txt | node dist/cli.js
```

## Installation

### Local (project)

```bash
npm install
npm run build
node dist/cli.js path/to/diff.txt
```

### Global

```bash
npm install -g commit-gen
commit-gen path/to/diff.txt
```

### As npm script

```json
{
  "scripts": {
    "commit-msg": "commit-gen"
  }
}
```

```bash
git diff > /tmp/commit.diff
npm run commit -- /tmp/commit.diff
```

## Usage

### Basic

```bash
commit-gen diff.txt
```

Input: A git diff in unified format:

```diff
diff --git a/src/index.ts b/src/index.ts
index 1111111..2222222 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,4 @@
+export function newFeature() {
   export function hello() {
     return 'hello';
   }
```

Output:

```
feat(src): update src/index.ts

- update src/index.ts
  +4 -1 [export function newFeature() {]
```

### Multi-file diff

```bash
git diff > /tmp/changes.diff
commit-gen /tmp/changes.diff
```

### JSON output

```bash
commit-gen diff.txt --json
```

```json
{
  "subject": "feat(src): update src/index.ts; add src/utils.ts",
  "body": [
    "",
    "- update src/index.ts",
    "  +4 -1 [newFeature]",
    "- add src/utils.ts",
    "  +10 [class Utils]"
  ],
  "scope": "src",
  "type": "feat",
  "stats": {
    "totalFiles": 2,
    "addedFiles": 1,
    "modifiedFiles": 1,
    "deletedFiles": 0,
    "renamedFiles": 0,
    "totalAdditions": 14,
    "totalDeletions": 1
  }
}
```

## CLI Options

| Option | Description | Default |
|--------|-------------|----------|
| `-h, --help` | Show help message | - |
| `--intelligent` | Enable intelligent parsing (detect functions/classes) | true |
| `--no-intelligent` | Disable intelligent parsing | - |
| `--json` | Output as JSON | false |
| `--conventional` | Use conventional commit style | conventional |
| `--simple` | Use simple commit style | - |
| `--no-stats` | Don't include line stats (+/-) | - |
| `--no-body` | Don't include body | - |
| `-m, --max-files N` | Max files in subject line | 3 |
| `-o, --output FILE` | Write to file | stdout |

## Examples

### From git diff

```bash
git diff --staged | commit-gen
```

### From a specific file

```bash
commit-gen path/to/my-changes.diff
```

### Save to file

```bash
commit-gen diff.txt -o COMMIT_MSG.txt
```

### Simple style

```bash
commit-gen diff.txt --simple
```

Output:

```
feat: update src/index.ts

- update src/index.ts
  +4 -1
```

## Programmatic Use (Library API)

```typescript
import { parseDiff, buildCommitMessage, formatMessage } from 'commit-gen';

// Parse diff text
const diffText = require('fs').readFileSync('diff.txt', 'utf8');
const result = parseDiff(diffText);

// Build commit message
const message = buildCommitMessage(result.files, result.stats, {
  style: 'conventional',
  includeBody: true,
  includeStats: true,
});

// Format to string
console.log(formatMessage(message));
```

### Quick generate

```typescript
import { generate } from 'commit-gen';

const message = generate(diffText, {
  style: 'conventional',
  includeBody: true,
});

console.log(message.subject);
console.log(message.body.join('\n'));
```

## Architecture

```
src/
├── core/
���   ├── types.ts       # Domain models
│   ├── parser.ts    # Diff parser
│   └── builder.ts   # Commit builder
├── lib/
│   └── index.ts     # Library exports
├── cli.ts          # CLI entry
└── index.ts        # Main entry
```

## Extensibility

- **Parser**: Custom `ParserConfig` for ignore patterns, hunk parsing
- **Builder**: Custom `BuilderConfig` for style, scope strategy
- **Strategy**: Swap builders for LLM or custom APIs

## License

MIT