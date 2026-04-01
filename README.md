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

## Tech Stack

| Layer    | Technology              |
|----------|-------------------------|
| Backend  | Rust + Tauri 2.0        |
| Frontend | React + TypeScript      |
| Editor   | CodeMirror 6            |
| State    | Zustand                 |
| Build    | Vite                    |

## Getting Started

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install)
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
│   └── styles/         # CSS
├── api/                # TypeSpec API contracts
└── TODO.md             # Development plan
```

## License

MIT — see [LICENSE](LICENSE)
