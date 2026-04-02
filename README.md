# VaultMark

A cross-platform desktop app built with **Tauri 2.0** (Rust) and **React** (TypeScript) for managing notes. Features full filesystem control, local backups, and an extensible, AI-first architecture.

## Features

- **Markdown Editor** — CodeMirror 6 with syntax highlighting and live preview
- **File Management** — Create, edit, delete, move, and organize files in folders
- **Local-First** — All data stored on your filesystem, no cloud required
- **Backup System** — Create and restore timestamped vault snapshots
- **AI-Ready** — Pluggable AI provider interface for summarization, search, and tagging
- **Split View** — Edit and preview markdown side-by-side
- **Autosave** — Changes saved automatically after 1.5s of inactivity
- **Command Palette** — Quick access to all actions via `Cmd+Shift+P`
- **Quick Open** — Fuzzy file search with `Cmd+P`
- **Dark / Light Theme** — Catppuccin Mocha and Latte themes
- **Error Boundary** — Graceful error recovery in the UI

## Tech Stack

| Layer    | Technology              |
|----------|-------------------------|
| Backend  | Rust + Tauri 2.0        |
| Frontend | React 19 + TypeScript   |
| Editor   | CodeMirror 6            |
| State    | Zustand 5               |
| Build    | Vite 7                  |
| Testing  | Vitest + Testing Library (frontend), cargo test (backend) |
| Linting  | ESLint 9 + Clippy       |

## Getting Started

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (1.75+)
- [Node.js](https://nodejs.org/) (v18+)
- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

### Development

```bash
npm install
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

Bundles are output to `src-tauri/target/release/bundle/`.

### Testing

```bash
# Rust unit tests (40 tests)
cd src-tauri && cargo test

# Frontend tests (14 tests)
npm test

# Linting
cd src-tauri && cargo clippy
npx eslint src/
```

## Keyboard Shortcuts

| Shortcut       | Action             |
|----------------|--------------------|
| `Cmd+S`        | Save file          |
| `Cmd+N`        | New file           |
| `Cmd+W`        | Close file         |
| `Cmd+B`        | Toggle sidebar     |
| `Cmd+P`        | Quick open         |
| `Cmd+Shift+P`  | Command palette    |
| `Cmd+Shift+E`  | Edit mode          |
| `Cmd+Shift+V`  | Preview mode       |

## Project Structure

```
vaultmark/
├── src-tauri/          # Rust backend (Tauri)
│   ├── src/
│   │   ├── commands/   # IPC command handlers
│   │   ├── services/   # Business logic
│   │   ├── models/     # Data structures
│   │   └── errors.rs   # Error types
├── src/                # React frontend
│   ├── components/     # UI components
│   ├── stores/         # Zustand state stores
│   ├── services/       # Tauri IPC wrappers
│   ├── hooks/          # React hooks
│   ├── types/          # TypeScript types
│   ├── test/           # Vitest test suites
│   └── styles/         # CSS
├── api/                # TypeSpec API contracts
└── TODO.md             # Development plan
```

## License

MIT — see [LICENSE](LICENSE)
