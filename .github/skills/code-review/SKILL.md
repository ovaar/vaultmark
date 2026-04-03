---
name: code-review
description: "Review VaultMark code for quality, security, and conventions. Use when asked to review this, code review, check my changes, review before shipping, or audit code quality."
---

# Code Review

## When to Use

- Before shipping changes (pre-PR quality gate)
- User asks for a review of recent work
- After a large refactor or new feature

## Procedure

### 1. Automated checks

Run all three and report results:

- `npx tsc --noEmit` — type errors
- `npx eslint src/` — lint violations
- `cd src-tauri && cargo clippy -- -D warnings` — Rust lint (warnings = errors)

### 2. Security

- [ ] File paths go through `validate_path()` — no raw user input reaches the filesystem
- [ ] No `unsafe` Rust without justification
- [ ] No secrets or credentials in code

### 3. Architecture conventions

- [ ] **Service layer**: components never call `invoke()` directly — always through `src/services/tauri*Service.ts`
- [ ] **Zustand selectors**: `useStore((s) => s.field)` per field, not `useStore()` (full store causes re-renders)
- [ ] **Store actions**: side effects use `useStore.getState().action()`, not hooks in callbacks
- [ ] **Rust commands**: thin wrappers that delegate to service functions, return `Result<T, AppError>`

### 4. Error handling

- [ ] Rust: uses `AppError` variants from `src-tauri/src/errors.rs`, no `.unwrap()` in production paths
- [ ] Frontend: store actions wrap service calls in try-catch, set `error` state, show toast for user-facing errors

### 5. Type safety

- [ ] TS interfaces match Rust structs — `snake_case` fields (Serde serialization)
- [ ] No `any` without a `// eslint-disable` comment explaining why
- [ ] New types added to `src/types/` and used in both service and store

### 6. Patterns

- [ ] Post-mutation refresh: file operations call `loadFileTree()` after changes
- [ ] Conventional commit message follows `.github/instructions/conventional-commits.instructions.md`
- [ ] Tests added for new behavior (see `write-tests` skill)
