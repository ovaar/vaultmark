---
name: ship-it
description: "Commit, push, open a PR, and summarize. Use when the user says ship it, open a PR, push and PR, land this, or wants to commit + push + create a pull request in one go."
argument-hint: "Optional: PR title or branch description"
---

# Ship It — Commit, Push, PR, Summary

## When to Use

- User says "ship it", "open a PR", "push and create PR"
- User wants to commit current work AND open a pull request
- End-of-session workflow to land changes

## Prerequisites

- `gh` CLI installed and authenticated (`gh auth status`)
- User is on the correct branch (not `main`/`master`)

## Procedure

### 1. Pre-flight checks

1. Run `gh auth status` to confirm the user is authenticated.
2. Run `git status` and `git diff --stat` to understand what changed.
3. Confirm the current branch is **not** the default branch (`main`/`master`). If it is, **stop and ask** the user which branch to use.

### 2. Stage and commit

1. Stage relevant changed files with `git add`. Exclude generated files, build artifacts, and lockfiles unless they are meaningful.
2. Generate a commit message using **Conventional Commits** format:
   - Summarize the change in the subject line (≤ 72 chars).
   - Add a body with bullet points if multiple things changed.
3. Run `git commit`.

### 3. Push

1. Push the branch upstream: `git push -u origin HEAD`.
2. If the push fails due to divergence, **stop and ask** the user before force-pushing.

### 4. Create pull request

1. Generate a PR title from the commit message or the user's argument.
2. Generate a PR body in markdown with:
   - **Summary**: 1-2 sentence overview of the change.
   - **Changes**: Bullet list of what was modified and why.
   - **Testing**: How the changes were verified (if known).
3. Run: `gh pr create --title "<title>" --body "<body>"`.
4. Capture the PR URL from the output.

### 5. Summarize

Print a recap to chat:

```
## Shipped 🚀

- **Branch**: `<branch>`
- **Commit**: `<short-sha>` — <commit subject>
- **PR**: <pr-url>

### What changed
- <bullet summary of changes>
```

## Error Handling

| Problem | Action |
|---------|--------|
| On default branch | Ask user to create/switch to a feature branch |
| No changes to commit | Inform user, skip to PR creation if commits exist |
| `gh` cli not installed | Tell user to install: `gh` |
| Push rejected | Ask user before `--force-with-lease` |
| PR already exists | Show existing PR URL, ask if user wants to update |

## Notes

- Never force-push without explicit user approval.
- Prefer small, well-scoped PRs over large ones.
- If the user provides a PR title as an argument, use it directly.
