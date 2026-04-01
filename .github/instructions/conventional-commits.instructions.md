---
description: "Use when writing git commit messages, generating conventional commits, or reviewing commit history. Defines the project's commit types, scopes, and formatting rules."
applyTo: ""
---

# Conventional Commits

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

## Format

```
<type>(<scope>): <subject>

<body>
```

- **Subject**: imperative mood, lowercase, no period, ≤ 72 chars
- **Body**: optional, bullet points for multiple changes

## Types

| Type | When to use |
|------|-------------|
| `feat` | New feature or user-facing capability |
| `fix` | Bug fix |
| `refactor` | Code restructuring without behavior change |
| `chore` | Build, tooling, dependency updates |
| `docs` | Documentation only |
| `style` | Formatting, whitespace (no logic change) |
| `test` | Adding or updating tests |
| `perf` | Performance improvement |
| `ci` | CI/CD configuration |

## Scopes

| Scope | Area |
|-------|------|
| `editor` | CodeMirror editor, tabs, preview |
| `files` | File tree, file operations |
| `backup` | Backup/restore functionality |
| `ai` | AI service integration |
| `layout` | Sidebar, status bar, app shell |
| `ux` | Keyboard shortcuts, command palette, toasts, theming |
| `tauri` | Rust backend, Tauri commands/services |
| `api` | TypeSpec API definitions |

## Examples

```
feat(editor): add split-pane markdown preview
fix(files): prevent crash when opening empty directory
refactor(tauri): extract backup service into separate module
chore: update dependencies
```
