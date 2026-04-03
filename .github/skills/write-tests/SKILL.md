---
name: write-tests
description: "Write tests for VaultMark code. Use when asked to write tests, add tests, test this, increase coverage, or add test coverage for frontend or Rust backend code."
---

# Write Tests

## When to Use

- User asks to test a component, store, hook, or Rust module
- User wants to increase test coverage
- After implementing a new feature

## Frontend Tests (Vitest + React Testing Library)

Test files go in `src/test/<Name>.test.tsx` (or `.test.ts` for non-component code).

1. **Mock Tauri APIs** at the top with `vi.mock()` — mock `@tauri-apps/api/core`, `@tauri-apps/plugin-dialog`, or any service module the component uses
2. **Mock stores** when testing components that depend on them — use `vi.mock()` on the store module or `useStore.setState()` for direct state injection
3. **Render** with `render(<Component />)` from `@testing-library/react`
4. **Query** with accessible queries: `getByRole`, `getByText`, `getByDisplayValue` — prefer ARIA roles (`tree`, `treeitem`, `button`)
5. **Interact** with `userEvent.click()`, `fireEvent.dragStart()`, etc.
6. **Assert** with `jest-dom` matchers: `.toBeInTheDocument()`, `.toHaveClass()`, `.toHaveStyle()`

### Store tests

- Set state: `useStore.setState({ ...initial })`
- Call actions: `useStore.getState().someAction()`
- Assert state: `expect(useStore.getState().field).toBe(value)`
- Time-dependent: `vi.useFakeTimers()` / `vi.advanceTimersByTime()`
- See `src/test/toastStore.test.ts` for the pattern

### Reference files

- `src/test/FileTree.test.tsx` — component with mocking, drag events, context menus
- `src/test/FileTreeItem.test.tsx` — item-level interactions, state-driven rendering
- `src/test/ErrorBoundary.test.tsx` — error boundary with dynamic imports

## Rust Tests

Tests go inline inside each module as `#[cfg(test)] mod tests { ... }`.

1. **Create temp dirs** with `tempfile::TempDir` for filesystem isolation
2. **Call service functions** directly (not commands) — they return `Result<T, AppError>`
3. **Assert results** with `assert!()`, `assert_eq!()`, pattern matching on `Err` variants
4. **Test security** — verify `validate_path()` blocks traversal attacks (`../`, symlinks)

### Reference files

- `src-tauri/src/services/file_service.rs` — 14 tests: path validation, CRUD, tree building
- `src-tauri/src/services/backup_service.rs` — 10 tests: create, list, restore, delete

## Run

- Frontend: `npm test` (single run) or `npm run test:watch`
- Rust: `cd src-tauri && cargo test`
