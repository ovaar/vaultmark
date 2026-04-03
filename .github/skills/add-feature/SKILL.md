---
name: add-feature
description: "Scaffold a full-stack Tauri feature across Rust and TypeScript. Use when asked to add feature, new feature, scaffold feature, full-stack feature, or implement a new capability end-to-end."
---

# Add Feature (Full-Stack Scaffold)

## When to Use

- Adding a new capability that spans backend and frontend
- User asks to scaffold or implement a feature end-to-end

## Procedure

Work through these layers in dependency order. Skip layers that already exist.

### Backend (Rust)

1. **Model** — Create `src-tauri/src/models/<name>.rs` with structs deriving `Serialize, Deserialize, Clone, Debug`. Register in `models/mod.rs`
2. **Error variant** — Add variant to `AppError` in `src-tauri/src/errors.rs` if the feature has unique failure modes. Add matching `Display` and `Serialize` arms
3. **Service** — Create `src-tauri/src/services/<name>_service.rs` with business logic functions returning `Result<T, AppError>`. Register in `services/mod.rs`
4. **Commands** — Create `src-tauri/src/commands/<name>_commands.rs` with `#[tauri::command]` thin wrappers that delegate to service functions. Register in `commands/mod.rs`
5. **Register** — Add all new commands to the `invoke_handler![]` macro in `src-tauri/src/lib.rs`

### Frontend (TypeScript)

6. **Types** — Create `src/types/<name>.ts` with interfaces matching Rust models. Use `snake_case` field names (Serde default)
7. **Service** — Create `src/services/tauri<Name>Service.ts` with functions wrapping `invoke("command_name", { params })` from `@tauri-apps/api/core`
8. **Store** — Create `src/stores/<name>Store.ts` with Zustand. Define interface with state + actions, call service in actions, wrap in try-catch, set error/loading state
9. **Component** — Create `src/components/<name>/` with React components. Use fine-grained Zustand selectors. See `create-component` skill for patterns

### Conventions

- Rust: `snake_case` for all identifiers. Commands named `<verb>_<noun>` (e.g., `list_backups`)
- TypeScript: `camelCase` for functions, `PascalCase` for components/types. Interface fields stay `snake_case` to match Rust
- IPC: `invoke("exact_command_name", { exact_param_name: value })`— names must match exactly between TS and Rust

### Reference features

- **Files**: `models/file.rs` → `file_service.rs` → `file_commands.rs` → `file.ts` → `tauriFileService.ts` → `fileStore.ts` → `FileTree.tsx`
- **Backup**: same pattern under `backup` namespace
- **AI**: same pattern under `ai` namespace
