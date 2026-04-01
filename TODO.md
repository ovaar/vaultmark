# VaultMark — Development Plan

> AI-first, local-first, cross-platform desktop knowledge manager  
> Stack: Tauri 2.0 (Rust) + React (TypeScript)

---

## 🏗️ Architecture Overview

### High-Level System Design

```
┌─────────────────────────────────────────────────────┐
│                   Desktop Window                     │
│  ┌───────────────────────────────────────────────┐  │
│  │              React Frontend (TS)              │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │ Sidebar  │ │  Editor  │ │   Preview    │  │  │
│  │  │ (Tree)   │ │(CodeMirr)│ │  (Markdown)  │  │  │
│  │  └──────────┘ └──────────┘ └──────────────┘  │  │
│  │  ┌──────────────────────────────────────────┐ │  │
│  │  │         Zustand State Store              │ │  │
│  │  └──────────────────────────────────────────┘ │  │
│  └────────────────────┬──────────────────────────┘  │
│                       │ Tauri IPC (invoke)           │
│  ┌────────────────────┴──────────────────────────┐  │
│  │              Rust Backend (Tauri)              │  │
│  │  ┌────────────┐ ┌──────────┐ ┌─────────────┐ │  │
│  │  │file_service│ │backup_svc│ │  ai_service  │ │  │
│  │  └─────┬──────┘ └────┬─────┘ └──────┬──────┘ │  │
│  │        │              │              │        │  │
│  │  ┌─────┴──────────────┴──────────────┴─────┐  │  │
│  │  │           Local Filesystem              │  │  │
│  │  │  ~/.vaultmark/vaults/<vault>/           │  │  │
│  │  └────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Component Breakdown

| Layer       | Technology         | Responsibility                          |
|-------------|--------------------|-----------------------------------------|
| Frontend    | React + TypeScript | UI, editor, preview, state management   |
| IPC         | Tauri Commands     | Bridge between frontend and backend     |
| Backend     | Rust               | File ops, backup, AI orchestration      |
| Storage     | Local filesystem   | Markdown files, config, backups         |
| AI (future) | Local models       | Summarization, search, tagging          |

---

## 📁 Folder Structure

```
vaultmark/
├── src-tauri/                    # Rust backend
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/             # Tauri 2.0 permissions
│   │   └── default.json
│   ├── src/
│   │   ├── main.rs               # Entry point
│   │   ├── lib.rs                # Library root
│   │   ├── commands/             # Tauri IPC command handlers
│   │   │   ├── mod.rs
│   │   │   ├── file_commands.rs
│   │   │   ├── backup_commands.rs
│   │   │   └── ai_commands.rs
│   │   ├── services/             # Business logic
│   │   │   ├── mod.rs
│   │   │   ├── file_service.rs
│   │   │   ├── backup_service.rs
│   │   │   └── ai_service.rs
│   │   ├── models/               # Data structures
│   │   │   ├── mod.rs
│   │   │   ├── file.rs
│   │   │   ├── backup.rs
│   │   │   └── ai.rs
│   │   └── errors.rs             # Error types
│   └── icons/
├── src/                          # React frontend
│   ├── main.tsx                  # Entry point
│   ├── App.tsx
│   ├── App.css
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── StatusBar.tsx
│   │   ├── editor/
│   │   │   ├── MarkdownEditor.tsx
│   │   │   ├── EditorTabs.tsx
│   │   │   └── Preview.tsx
│   │   ├── files/
│   │   │   ├── FileTree.tsx
│   │   │   └── FileTreeItem.tsx
│   │   └── backup/
│   │       └── BackupPanel.tsx
│   ├── stores/
│   │   ├── fileStore.ts
│   │   ├── editorStore.ts
│   │   └── backupStore.ts
│   ├── hooks/
│   │   ├── useFileSystem.ts
│   │   ├── useBackup.ts
│   │   └── useAutosave.ts
│   ├── services/
│   │   ├── tauriFileService.ts
│   │   ├── tauriBackupService.ts
│   │   └── tauriAiService.ts
│   ├── types/
│   │   ├── file.ts
│   │   ├── backup.ts
│   │   └── ai.ts
│   └── styles/
│       └── globals.css
├── api/                          # TypeSpec API definitions
│   ├── main.tsp
│   ├── models/
│   │   ├── file.tsp
│   │   ├── backup.tsp
│   │   └── ai.tsp
│   └── routes/
│       ├── files.tsp
│       ├── backups.tsp
│       └── ai.tsp
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── TODO.md
├── README.md
└── LICENSE
```

---

## 🔌 TypeSpec API Definitions

Contracts defined in `api/` directory. See implementation files for full specs.

### Resources

| Resource    | Operations                        |
|-------------|-----------------------------------|
| `/files`    | list, get, create, update, delete |
| `/directories` | list, create, delete, move    |
| `/backups`  | list, create, restore, delete     |
| `/ai/summarize` | POST — summarize document    |
| `/ai/embed` | POST — generate embeddings        |
| `/ai/search`| POST — semantic search            |
| `/ai/tags`  | POST — auto-tag document          |

---

## 🦀 Rust Backend Design

### Modules

| Module           | Responsibility                                          |
|------------------|---------------------------------------------------------|
| `file_service`   | CRUD files/dirs, read/write markdown, directory tree    |
| `backup_service` | Snapshot vaults, restore, list history, prune old        |
| `ai_service`     | Placeholder: summarize, embed, search, tag              |

### Key Tauri Commands

```rust
// File commands
#[tauri::command] fn list_files(path: &str) -> Result<Vec<FileEntry>>
#[tauri::command] fn read_file(path: &str) -> Result<FileContent>
#[tauri::command] fn write_file(path: &str, content: &str) -> Result<()>
#[tauri::command] fn delete_file(path: &str) -> Result<()>
#[tauri::command] fn rename_file(from: &str, to: &str) -> Result<()>
#[tauri::command] fn create_directory(path: &str) -> Result<()>

// Backup commands
#[tauri::command] fn create_backup(vault: &str) -> Result<BackupInfo>
#[tauri::command] fn list_backups(vault: &str) -> Result<Vec<BackupInfo>>
#[tauri::command] fn restore_backup(backup_id: &str) -> Result<()>

// AI commands (placeholder)
#[tauri::command] fn ai_summarize(content: &str) -> Result<String>
#[tauri::command] fn ai_search(query: &str) -> Result<Vec<SearchResult>>
```

---

## ⚛️ React Frontend Design

### Component Hierarchy

```
App
├── AppLayout
│   ├── Sidebar
│   │   ├── FileTree
│   │   │   └── FileTreeItem (recursive)
│   │   └── BackupPanel
│   ├── EditorArea
│   │   ├── EditorTabs
│   │   ├── MarkdownEditor (CodeMirror 6)
│   │   └── Preview (react-markdown)
│   └── StatusBar
```

### State Management (Zustand)

| Store          | State                                       |
|----------------|---------------------------------------------|
| `fileStore`    | fileTree, selectedFile, openFiles            |
| `editorStore`  | content, dirty flags, cursor position        |
| `backupStore`  | backupList, lastBackup, restoring status     |

### Editor

- **CodeMirror 6** with `@codemirror/lang-markdown`
- Split-pane with `react-markdown` preview
- Autosave via debounced write (1.5s after last keystroke)

---

## 🤖 AI Integration Plan

### Hook Points

| Feature             | Hook Location                    | Interface                    |
|---------------------|----------------------------------|------------------------------|
| Document summary    | Editor toolbar / sidebar         | `ai_summarize(content)`      |
| Smart search        | Global search bar                | `ai_search(query, vault)`    |
| Auto-tagging        | On file save                     | `ai_suggest_tags(content)`   |
| Embeddings index    | Background on file change        | `ai_embed(content)`          |
| Context retrieval   | Editor / search                  | `ai_retrieve(query, top_k)`  |

### Suggested Architecture (Future)

- Rust-side: `candle` or `llama.cpp` bindings for local inference
- Embedding store: `sqlite-vss` or `hnswlib` via FFI
- All AI features optional — app works fully without them

---

## 📋 Sprint Backlog — Scrum TODO

### 🏁 Sprint 0 — Project Setup & Scaffolding
**Goal:** Runnable skeleton with Tauri + React

- [x] Initialize Git repository
- [ ] Scaffold Tauri 2.0 project (`cargo create-tauri-app`)
- [ ] Configure `tauri.conf.json` (app name, window, security)
- [ ] Setup React + TypeScript + Vite
- [ ] Install core dependencies (zustand, react-markdown, codemirror)
- [ ] Configure ESLint + Prettier
- [ ] Verify `cargo tauri dev` runs successfully
- [ ] Setup Tauri 2.0 capabilities/permissions

### 🏁 Sprint 1 — Core File System (Backend)
**Goal:** Rust file operations fully functional

- [ ] Create `models/file.rs` — FileEntry, FileContent structs
- [ ] Create `services/file_service.rs` — CRUD operations
- [ ] Create `commands/file_commands.rs` — Tauri command handlers
- [ ] Implement `list_files` — recursive directory listing
- [ ] Implement `read_file` — read content with metadata
- [ ] Implement `write_file` — write with atomic save
- [ ] Implement `delete_file` — safe delete with confirmation data
- [ ] Implement `rename_file` — move/rename support
- [ ] Implement `create_directory` — nested creation
- [ ] Create `errors.rs` — unified error handling
- [ ] Unit tests for file_service

### 🏁 Sprint 2 — Frontend Shell & File Tree
**Goal:** Navigable file tree with working CRUD

- [ ] Create `AppLayout` component (sidebar + editor area)
- [ ] Create `Sidebar` component
- [ ] Create `FileTree` component with recursive rendering
- [ ] Create `FileTreeItem` with icons and context menu
- [ ] Create `fileStore` (Zustand) — tree state, selection
- [ ] Wire `tauriFileService.ts` — frontend service calling IPC
- [ ] Create/delete/rename files via context menu
- [ ] Create new folders
- [ ] Display file tree on startup (vault root)
- [ ] Basic CSS layout (flexbox sidebar + main area)
- [ ] Keyboard navigation in file tree

### 🏁 Sprint 3 — Markdown Editor & Preview
**Goal:** Full markdown editing experience

- [ ] Integrate CodeMirror 6 with markdown mode
- [ ] Create `MarkdownEditor` component
- [ ] Create `Preview` component (react-markdown + remark-gfm)
- [ ] Split-pane layout (editor | preview)
- [ ] Toggle between edit / preview / split modes
- [ ] Create `editorStore` — content, dirty state
- [ ] Syntax highlighting in editor
- [ ] Autosave with debounce (1.5s)
- [ ] `useAutosave` hook
- [ ] Tab support (multiple open files)
- [ ] `EditorTabs` component
- [ ] Unsaved changes indicator (dot on tab)

### 🏁 Sprint 4 — Backup System
**Goal:** Manual backup creation and restore

- [ ] Create `models/backup.rs` — BackupInfo struct
- [ ] Create `services/backup_service.rs`
- [ ] Implement `create_backup` — timestamped copy of vault
- [ ] Implement `list_backups` — enumerate backup history
- [ ] Implement `restore_backup` — replace vault from snapshot
- [ ] Implement `delete_backup` — cleanup old backups
- [ ] Create `commands/backup_commands.rs`
- [ ] Create `BackupPanel` component in sidebar
- [ ] Create `backupStore` (Zustand)
- [ ] Wire `tauriBackupService.ts`
- [ ] Show backup history with timestamps
- [ ] Confirm before restore (destructive action)

### 🏁 Sprint 5 — AI Service Stubs & Interfaces
**Goal:** AI integration points defined and stubbed

- [ ] Create `models/ai.rs` — SummaryRequest, EmbeddingResult, etc.
- [ ] Create `services/ai_service.rs` — trait-based design
- [ ] Define `AiProvider` trait (summarize, embed, search, tag)
- [ ] Create `StubAiProvider` — returns placeholder responses
- [ ] Create `commands/ai_commands.rs`
- [ ] Create frontend `types/ai.ts`
- [ ] Create `tauriAiService.ts`
- [ ] Add "Summarize" button in editor toolbar (calls stub)
- [ ] Add "AI Search" placeholder in sidebar

### 🏁 Sprint 6 — TypeSpec API Contracts
**Goal:** Formal API definitions for all services

- [ ] Install TypeSpec tooling
- [ ] Define `File` model in TypeSpec
- [ ] Define `Backup` model in TypeSpec
- [ ] Define `AiRequest/AiResponse` models
- [ ] Define `/files` routes
- [ ] Define `/directories` routes
- [ ] Define `/backups` routes
- [ ] Define `/ai` routes
- [ ] Generate OpenAPI output for documentation

### 🏁 Sprint 7 — UX Polish & Keyboard Shortcuts
**Goal:** Professional feel, power-user ready

- [ ] Global keyboard shortcuts (Cmd+S, Cmd+N, Cmd+P, etc.)
- [ ] Command palette (Cmd+Shift+P)
- [ ] Search files (Cmd+P quick open)
- [ ] Status bar with file info (word count, line count)
- [ ] Responsive sidebar (collapsible)
- [ ] Dark/light theme support
- [ ] Loading states and error toasts
- [ ] Empty state screens

### 🏁 Sprint 8 — Testing & Quality
**Goal:** Confidence in stability

- [ ] Rust unit tests for all services
- [ ] Rust integration tests for file operations
- [ ] React component tests (Vitest + Testing Library)
- [ ] E2E smoke test (Tauri + WebDriver)
- [ ] Linting clean (clippy + eslint)
- [ ] Error boundary in React

### 🏁 Sprint 9 — Packaging & Distribution
**Goal:** Installable app on all platforms

- [ ] Configure Tauri bundler (DMG, MSI, AppImage)
- [ ] App icon set
- [ ] First-run experience (vault creation wizard)
- [ ] Auto-updater configuration (optional)
- [ ] README with installation instructions
- [ ] CI pipeline (GitHub Actions: build + test + bundle)

---

## 📊 Priority Matrix

| Priority | Items                                    |
|----------|------------------------------------------|
| P0       | Sprint 0–1 (setup, file system)          |
| P0       | Sprint 2–3 (file tree, editor)           |
| P1       | Sprint 4 (backups)                       |
| P1       | Sprint 7 (UX polish)                     |
| P2       | Sprint 5–6 (AI stubs, TypeSpec)          |
| P3       | Sprint 8–9 (testing, packaging)          |
