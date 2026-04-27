# commit-diff2msg
A minimal MVP to generate git commit messages from diff text using a rule-based approach with extensibility for LLM and external APIs.

Usage:
- CLI: `node dist/cli.js <diff-file>` or pipe a diff to stdin when no file is provided.
- It outputs a Conventional Commits style subject and an optional body describing per-file changes.

Architecture outline (MVP):
- core-lib: diff parser, commit generator
- cli: input handling and orchestrating core-lib
- vscode extension path: optional, uses same core-lib APIs

Next steps:
- Add tests for diff parsing and commit generation
- Add configuration options and templating
- Prepare VSCode extension scaffold
