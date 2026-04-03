---
name: fix-bug
description: "Debug and fix issues in VaultMark. Use when asked to fix bug, debug this, something is broken, not working, diagnose issue, troubleshoot, or investigate an error."
---

# Fix Bug

## When to Use

- User reports something broken, an error, or unexpected behavior
- Diagnosing why a feature isn't working

## Procedure

### 1. Reproduce

- Get exact steps, error messages, or screenshots
- Check browser DevTools console (frontend errors) and terminal output (Rust panics/errors)
- If the error mentions `invoke`, it's likely an IPC issue between frontend and backend

### 2. Isolate the layer

| Symptom | Layer | Where to look |
|---------|-------|---------------|
| UI doesn't render/update | Frontend | Component + store selectors |
| `invoke` error / "command not found" | IPC | Command registration in `lib.rs` |
| Rust panic or `AppError` | Backend | Service function logic |
| Data shape mismatch | Serialization | Rust struct ↔ TS interface |

### 3. Common issues checklist

- [ ] **Command not registered** — new command missing from `invoke_handler![]` in `src-tauri/src/lib.rs`
- [ ] **Param name mismatch** — `invoke("cmd", { fileName })` vs `fn cmd(file_name: String)` — names must match exactly (Tauri auto-converts camelCase ↔ snake_case)
- [ ] **Path validation** — `validate_path()` in `file_service.rs` rejects paths outside vault root. Check canonicalization and vault root setup
- [ ] **Stale file tree** — forgot to call `loadFileTree()` after a file mutation (create, rename, delete, move)
- [ ] **Selector re-render loop** — `useStore((s) => ({ a: s.a, b: s.b }))` creates new object each render. Use separate selectors per field
- [ ] **Missing error handling** — store action without try-catch silently fails. Check for unhandled promise rejections

### 4. Fix and verify

1. Apply the fix
2. Run `npm test` and `cd src-tauri && cargo test`
3. Test in dev mode: `npm run tauri dev`
4. If the fix touches file operations, verify `validate_path()` still blocks `../` traversal
