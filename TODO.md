# VaultMark — Development Plan

> AI-first, local-first, cross-platform desktop knowledge manager  
> Stack: Tauri 2.0 (Rust) + React (TypeScript)

---

## 🏗️ Architecture Overview

### High-Level System Design

```
┌─────────────────────────────────────────────────────┐
│                   Desktop Window                    │
│  ┌───────────────────────────────────────────────┐  │
│  │              React Frontend (TS)              │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐   │  │
│  │  │ Sidebar  │ │  Editor  │ │   Preview    │   │  │
│  │  │ (Tree)   │ │(CodeMirr)│ │  (Markdown)  │   │  │
│  │  └──────────┘ └──────────┘ └──────────────┘   │  │
│  │  ┌──────────────────────────────────────────┐ │  │
│  │  │         Zustand State Store              │ │  │
│  │  └──────────────────────────────────────────┘ │  │
│  └────────────────────┬──────────────────────────┘  │
│                       │ Tauri IPC (invoke)          │
│  ┌────────────────────┴──────────────────────────┐  │
│  │              Rust Backend (Tauri)             │  │
│  │  ┌────────────┐ ┌──────────┐ ┌─────────────┐  │  │
│  │  │file_service│ │backup_svc│ │  ai_service │  │  │
│  │  └─────┬──────┘ └────┬─────┘ └──────┬──────┘  │  │
│  │        │              │              │        │  │
│  │  ┌─────┴──────────────┴──────────────┴─────┐  │  │
│  │  │           Local Filesystem              │  │  │
│  │  │  ~/.vaultmark/vaults/<vault>/           │  │  │
│  │  └────────────────────────────────────────-┘  │  │
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
- [x] Scaffold Tauri 2.0 project (`cargo create-tauri-app`)
- [x] Configure `tauri.conf.json` (app name, window, security)
- [x] Setup React + TypeScript + Vite
- [x] Install core dependencies (zustand, react-markdown, codemirror)
- [x] Configure ESLint + Prettier
- [x] Verify `cargo tauri dev` runs successfully
- [x] Setup Tauri 2.0 capabilities/permissions

### 🏁 Sprint 1 — Core File System (Backend)
**Goal:** Rust file operations fully functional

- [x] Create `models/file.rs` — FileEntry, FileContent structs
- [x] Create `services/file_service.rs` — CRUD operations
- [x] Create `commands/file_commands.rs` — Tauri command handlers
- [x] Implement `list_files` — recursive directory listing
- [x] Implement `read_file` — read content with metadata
- [x] Implement `write_file` — write with atomic save
- [x] Implement `delete_file` — safe delete with confirmation data
- [x] Implement `rename_file` — move/rename support
- [x] Implement `create_directory` — nested creation
- [x] Create `errors.rs` — unified error handling
- [x] Unit tests for file_service

### 🏁 Sprint 2 — Frontend Shell & File Tree
**Goal:** Navigable file tree with working CRUD

- [x] Create `AppLayout` component (sidebar + editor area)
- [x] Create `Sidebar` component
- [x] Create `FileTree` component with recursive rendering
- [x] Create `FileTreeItem` with icons and context menu
- [x] Create `fileStore` (Zustand) — tree state, selection
- [x] Wire `tauriFileService.ts` — frontend service calling IPC
- [x] Create/delete/rename files via context menu
- [x] Create new folders
- [x] Display file tree on startup (vault root)
- [x] Basic CSS layout (flexbox sidebar + main area)
- [x] Keyboard navigation in file tree

### 🏁 Sprint 3 — Markdown Editor & Preview
**Goal:** Full markdown editing experience

- [x] Integrate CodeMirror 6 with markdown mode
- [x] Create `MarkdownEditor` component
- [x] Create `Preview` component (react-markdown + remark-gfm)
- [x] Split-pane layout (editor | preview)
- [x] Toggle between edit / preview / split modes
- [x] Create `editorStore` — content, dirty state
- [x] Syntax highlighting in editor
- [x] Autosave with debounce (1.5s)
- [x] `useAutosave` hook
- [x] Tab support (multiple open files)
- [x] `EditorTabs` component
- [x] Unsaved changes indicator (dot on tab)

### 🏁 Sprint 4 — Backup System
**Goal:** Manual backup creation and restore

- [x] Create `models/backup.rs` — BackupInfo struct
- [x] Create `services/backup_service.rs`
- [x] Implement `create_backup` — timestamped copy of vault
- [x] Implement `list_backups` — enumerate backup history
- [x] Implement `restore_backup` — replace vault from snapshot
- [x] Implement `delete_backup` — cleanup old backups
- [x] Create `commands/backup_commands.rs`
- [x] Create `BackupPanel` component in sidebar
- [x] Create `backupStore` (Zustand)
- [x] Wire `tauriBackupService.ts`
- [x] Show backup history with timestamps
- [x] Confirm before restore (destructive action)

### 🏁 Sprint 5 — AI Service Stubs & Interfaces
**Goal:** AI integration points defined and stubbed

- [x] Create `models/ai.rs` — SummaryRequest, EmbeddingResult, etc.
- [x] Create `services/ai_service.rs` — trait-based design
- [x] Define `AiProvider` trait (summarize, embed, search, tag)
- [x] Create `StubAiProvider` — returns placeholder responses
- [x] Create `commands/ai_commands.rs`
- [x] Create frontend `types/ai.ts`
- [x] Create `tauriAiService.ts`
- [ ] Add "Summarize" button in editor toolbar (calls stub)
- [ ] Add "AI Search" placeholder in sidebar

### 🏁 Sprint 6 — TypeSpec API Contracts
**Goal:** Formal API definitions for all services

- [x] Install TypeSpec tooling
- [x] Define `File` model in TypeSpec
- [x] Define `Backup` model in TypeSpec
- [x] Define `AiRequest/AiResponse` models
- [x] Define `/files` routes
- [x] Define `/directories` routes
- [x] Define `/backups` routes
- [x] Define `/ai` routes
- [ ] Generate OpenAPI output for documentation

### 🏁 Sprint 7 — UX Polish & Keyboard Shortcuts
**Goal:** Professional feel, power-user ready

- [x] Global keyboard shortcuts (Cmd+S, Cmd+N, Cmd+P, etc.)
- [x] Command palette (Cmd+Shift+P)
- [x] Search files (Cmd+P quick open)
- [x] Status bar with file info (word count, line count)
- [x] Responsive sidebar (collapsible)
- [x] Dark/light theme support
- [x] Loading states and error toasts
- [x] Empty state screens

### 🏁 Sprint 8 — Testing & Quality
**Goal:** Confidence in stability

- [x] Rust unit tests for all services
- [ ] Rust integration tests for file operations
- [x] React component tests (Vitest + Testing Library)
- [ ] E2E smoke test (Tauri + WebDriver)
- [x] Linting clean (clippy + eslint)
- [x] Error boundary in React

### 🏁 Sprint 9 — Packaging & Distribution
**Goal:** Installable app on all platforms

- [x] Configure Tauri bundler (DMG, MSI, AppImage)
- [x] App icon set
- [x] First-run experience (vault creation wizard)
- [ ] Auto-updater configuration (optional)
- [x] README with installation instructions
- [x] CI pipeline (GitHub Actions: build + test + bundle)

### Sprint 10 - Adding new user features
**Goal:** Develop most wanted user features

- [x] Open an existing vault using file/directory explorer
  - Validate selected directory is a valid vault
  - Show clear error if invalid

- [x] Allow creating multiple vaults
  - Allow switching between vaults without restarting
  - Persist last opened vault

- [x] Add existing files to my vault
  - Prompt user to:
    - Copy file into vault
    - Move file into vault
  - Preserve file metadata where possible

- [x] Allow moving files in the `vaultmark` files explorer
  - Support drag-and-drop or command-based movement
  - Prevent accidental overwrite without confirmation

- [x] Setup automatic backup (local)
  - Allow users to specify:
    - Backup location
    - Backup frequency (manual / scheduled)
  - [ ] Support remote backup locations (deferred):
    - SSH (scp / sftp)
    - FTP (optional)
  - [ ] Securely store credentials (encrypted) (deferred)

- [x] Generate table of contents automatically from `markdown` contents
  - Parse headings (`#`, `##`, etc.)
  - Support inline ToC and/or sidebar navigation
  - Keep ToC updated dynamically

- [x] Add html accessibility
  - Use semantic HTML structure
  - Add ARIA roles where needed
  - Ensure keyboard navigation support

### 🏁 Sprint 11 — Bug Fixes
**Goal:** Fix bugs

- [x] When creating a new vault, the `~` is not converted to a canonical path, therefore creating the vault in `src-tauri/~/VaultMark`
- [x] Items in the Files navigation treeview are still not draggable
- [x] The opened file tab name text should not be selectable
- [x] Iterate on the html 5 drag and drop feature to make it feature complete
- [x] When dragging files onto a folder they don't move to the destination folder.

### 🏁 Sprint 12 — Usability
**Goal:** Improve UX

- [x] Always open welcome screen so that the user is able to create a new `vault` or select any existing(known) `vault`(s)
- [x] Replace icons in the files list view with `carret-down` when open and `carret-right` when closed, like in vscode.
- [x] Right click the empty space of the Files nav should show a context menu with the same options as in the toolbar (create file, create folder, import)
- [x] Allow opening multiple files next to eachother like vscode, where you drag a file to a corner that it snaps to that segment.
- [x] Add window context menu's


### Sprint 13 - Integration with reMarkable e-Paper tablet
**Goal:** Connect with reMarkable 1, 2 or Pro

- read: 
  - https://remarkable.guide/guide/access/ssh.html#finding-your-device-password-and-ip-addresses
  - https://github.com/rM-self-serve/webinterface-wifi

- [x] Allow users to connect to their reMarkable via ssh
  - Required inputs:
    - IP address
    - Username
    - Password
  - Test connection before saving
  - Remember device connection details (securely)
  - Add toolbar option to connect to recent devices
  - Purpose: enable 2-way sync with `vaultmark` files

- [x] Add connection guide workflow to visually guide the user with connecting to their reMarkable.

- [ ] Allow users to connect to their reMarkable via USB
  - Detect device automatically when connected
  - Provide fallback if SSH is unavailable
  - Handle platform-specific differences

- [ ] Implement 2-way file synchronization
  - Sync new, updated, and deleted files
  - Handle conflicts:
    - Option: last-write-wins or manual resolution
  - Allow selective sync (entire vault or specific files/folders)

- [ ] reMarkable does not natively support the `markdown` file format
  - Implement markdown → reMarkable format conversion
  - Reference:
    - https://github.com/ricklupton/rmc
    - https://www.davisr.me/projects/rcu/
  - Preserve basic formatting:
    - Headings
    - Lists
    - Text styles
  - Gracefully degrade unsupported features

- [ ] (Optional) Support reverse conversion
  - Convert reMarkable documents back to markdown where possible

- [ ] Improve UX and reliability
  - Show sync status (idle, syncing, error)
  - Provide logs for debugging
  - Handle offline scenarios gracefully

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
