---
name: commit-recent-work
description: "Stage and commit recently modified files with a meaningful commit message. Use when the user asks to commit recent work, save progress, or create a quick commit. For the full workflow (commit + push + PR), use the ship-it skill instead."
---

# Commit recent work

## Purpose

This skill stages and commits files that were recently modified. It is the **commit-only** subset of the `/ship-it` skill. If the user also wants to push and open a PR, invoke `/ship-it` instead.

## When to use

- User asks to "commit my work"
- User mentions "recent changes"
- User wants a quick save/commit
- User explicitly does **not** want to push or open a PR

## Instructions

1. Identify recently modified files using `git status`.
2. Filter to files modified in the last working session or relevant scope.
3. Stage only relevant files (avoid unrelated changes).
4. Generate a concise commit message using **Conventional Commits** format (see the `conventional-commits` instruction for scopes/types).
   - Summarize the change in the subject line (≤ 72 chars).
   - Add a body with bullet points if multiple things changed.
5. Run the commit:
   - `git add <files>`
   - `git commit -m "<message>"`

## Escalation

If the user then says "push this" or "open a PR", hand off to the `/ship-it` skill which continues from step 3 (push) onward.

## Notes

- Do not include unrelated or generated files.
- Prefer small, focused commits.