# commit-diff2msg

A minimal MVP to generate git commit messages from diff text using a rule-based approach with extensibility for LLM and external APIs.

## Quick Start
- Prerequisites: Node.js 18+ and npm
- Install: `npm install`
- Build: `npm run build`
- Run with a diff file: `node dist/cli.js path/to/diff.txt`
- Run with diff from stdin: `cat path/to/diff.txt | node dist/cli.js`

## Usage
- The CLI reads a git diff in unified format and outputs a single commit message.
- Output follows Conventional Commits style by default:
  Subject: <type>(<scope>): <description>
  Body: optional bullet points describing changes per file

## Architecture (MVP)
- core-lib: diff parser and commit generator
- cli: input handling and orchestration of core-lib
- vscode extension: planned path reusing core-lib APIs

## Data Models (simplified)
- DiffFile: { path, changeType, added, removed }
- CommitCandidate: { subject, body[] }

## Extensibility
- Core library API exposes parsing and commit generation for reuse by IDEs or CI.
- Provides an LLMAdapter interface for optional local/remote model integration.
- Output formats can be extended (JSON, Markdown) and templates configurable.

## Contributing
- See the repo for contribution guidelines and test coverage.

## Roadmap
- Phase 1: MVP CLI (done)
- Phase 2: library/API and richer outputs
- Phase 3: LLM integration and IDE plugins

## License
MIT
