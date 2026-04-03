---
name: create-component
description: "Create a React component following VaultMark patterns. Use when asked to create component, new component, add component, add UI, or build a new panel/view."
---

# Create Component

## When to Use

- Adding a new UI panel, view, or interactive element
- User asks to create or scaffold a component

## Procedure

### 1. Create the file

Place in `src/components/<area>/<Name>.tsx` where area matches the feature domain (editor, files, backup, layout, remarkable).

### 2. State management

- **Zustand store data**: use one selector per field — `const files = useFileStore((s) => s.files)`
- **UI-only state**: use `useState` for local concerns (input values, toggles, open/closed menus, hover state)
- **Side effects in callbacks**: use `useStore.getState().action()` instead of binding the action through a selector

### 3. Tauri integration

If the component needs backend data:

- Create or extend a service in `src/services/tauri<Name>Service.ts` wrapping `invoke()`
- Call the service from a Zustand store action, not from the component directly
- The component reads store state and calls store actions

### 4. Event cleanup

For listeners (Tauri events, window events, timers):

- Set up in `useEffect` with cleanup function
- See `AppLayout.tsx` for Tauri `listen()` pattern with unlisten
- See `useKeyboardShortcuts.ts` for window event listener pattern

### 5. Integrate

- Add to parent: `AppLayout.tsx` (main areas), `Sidebar.tsx` (sidebar panels), or feature-specific parent
- Wire up any keyboard shortcuts in `useKeyboardShortcuts.ts`

### Reference components

- `FileTree.tsx` — interactive tree: drag-and-drop, context menus, inline editing, recursive rendering
- `BackupPanel.tsx` — service + store integration: load on mount, action buttons, loading/error states
- `MarkdownEditor.tsx` — external library: ref-based lifecycle, `EditorView` setup/teardown, update listeners
- `CommandPalette.tsx` — modal overlay: keyboard navigation, filtered lists
- `ToastContainer.tsx` — ephemeral UI: auto-removal, toast store subscription
