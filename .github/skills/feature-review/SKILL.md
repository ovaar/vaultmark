---
name: feature-review
description: "Review a VaultMark feature for bugs, usability, UX, UI, and styling. Use when asked to review feature, review UX, audit usability, check UI, evaluate feature quality, or reevaluate a user feature."
---

# Feature Review

## When to Use

- User asks to review, reevaluate, or audit an existing feature
- Assessing polish and quality of a shipped feature
- Before marking a sprint as done — final quality gate
- User wants a UX/UI critique of a specific area

## Procedure

### 1. Identify the feature scope

Ask the user which feature to review if not obvious. Map the feature to its components:

- **Components**: which files in `src/components/` implement it?
- **Store**: which Zustand store(s) drive it?
- **Service**: which `src/services/tauri*Service.ts` and Rust service are involved?
- **Styles**: which CSS files or inline styles affect it?

Use the `Explore` subagent or search tools to locate all relevant files.

### 2. Bug audit

Inspect the code for correctness issues:

- [ ] **Error handling**: are all service calls wrapped in try-catch? Do errors surface to the user via toasts?
- [ ] **Edge cases**: empty states, undefined/null values, missing data guards
- [ ] **Race conditions**: concurrent calls (double-click, rapid toggling) — are actions debounced or guarded?
- [ ] **State consistency**: does the store stay consistent after failures? (e.g., loading flag reset in `finally`)
- [ ] **Memory leaks**: are event listeners, timers, and subscriptions cleaned up in `useEffect` return?
- [ ] **Path safety**: file operations go through `validate_path()` — no path traversal possible
- [ ] **Data loss**: destructive actions (delete, overwrite, restore) require confirmation

### 3. Usability review

Evaluate the feature from a user's perspective:

- [ ] **Discoverability**: can a new user find and use this feature without documentation?
- [ ] **Feedback**: does every user action produce visible feedback (loading spinner, success toast, error message)?
- [ ] **Confirmation**: destructive or irreversible actions require explicit confirmation
- [ ] **Undo/recovery**: can the user recover from mistakes? (e.g., backup before restore, undo after delete)
- [ ] **Progressive disclosure**: is complexity hidden until needed? Avoid overwhelming users with options
- [ ] **Keyboard support**: can the feature be operated entirely via keyboard? Are shortcuts documented in the command palette?
- [ ] **Performance perception**: do long operations show progress? Is there a loading state?

### 4. UX review

Evaluate interaction design and user flow:

- [ ] **Workflow efficiency**: how many clicks/steps to accomplish the primary task? Can it be reduced?
- [ ] **Mental model**: does the UI match how users think about the task? (e.g., file tree matches filesystem)
- [ ] **Consistency**: does the feature follow the same patterns as other features? (context menus, modals, panels)
- [ ] **Error recovery**: when something fails, does the user know what happened and what to do next?
- [ ] **State persistence**: does the feature remember user preferences across sessions? (panel sizes, last selection)
- [ ] **Offline behavior**: does the feature handle disconnected/unavailable services gracefully? (e.g., reMarkable offline)
- [ ] **Focus management**: after modals close or actions complete, is focus returned to a logical element?
- [ ] **Drag and drop**: if supported, are drop targets clearly indicated? Is there visual feedback during drag?

### 5. UI review

Evaluate visual design and layout:

- [ ] **Visual hierarchy**: is the most important information prominent? Are primary actions visually distinct?
- [ ] **Spacing and alignment**: consistent padding/margins, elements align to a grid
- [ ] **Typography**: readable font sizes, proper heading hierarchy, no text overflow or truncation issues
- [ ] **Color and contrast**: sufficient contrast ratios (WCAG AA minimum), consistent color usage
- [ ] **Responsive layout**: does the feature work at different window sizes? Does the sidebar collapse properly?
- [ ] **Icons and labels**: are icons meaningful? Do they have tooltips? Are labels clear and concise?
- [ ] **Empty states**: does the feature show a helpful message when there's no data?
- [ ] **Loading states**: skeleton screens or spinners while data loads — no layout shifts
- [ ] **Dark/light theme**: does the feature look correct in both themes?
- [ ] **Overflow handling**: long file names, deep nesting, many items — does the UI handle them gracefully?

### 6. Styling review

Evaluate CSS and styling implementation:

- [ ] **CSS organization**: styles in `src/styles/globals.css` or component-scoped — no inline styles for layout
- [ ] **CSS variables**: uses existing CSS custom properties for colors, spacing, and sizing — no hardcoded values
- [ ] **Specificity**: no `!important` without justification, no overly specific selectors
- [ ] **Hover/focus/active states**: interactive elements have visible state changes
- [ ] **Transitions**: state changes use smooth transitions (150–300ms) where appropriate
- [ ] **Scrolling**: panels with dynamic content are scrollable, scroll containers have proper overflow settings
- [ ] **Z-index management**: modals, dropdowns, and overlays layer correctly — no z-index wars
- [ ] **Cross-browser**: no webkit/moz prefixes without fallbacks, standard properties preferred

### 7. Accessibility review

Evaluate a11y compliance:

- [ ] **Semantic HTML**: correct use of `<button>`, `<nav>`, `<main>`, `<section>`, headings hierarchy
- [ ] **ARIA attributes**: interactive custom elements have `role`, `aria-label`, `aria-expanded`, etc.
- [ ] **Keyboard navigation**: Tab order follows visual order, focus is visible, no keyboard traps
- [ ] **Screen reader**: meaningful alt text, aria-live regions for dynamic content, status announcements
- [ ] **Color independence**: information is not conveyed by color alone (icons, text, patterns as supplement)

### 8. Write the sprint

After completing the review, write a new sprint in `TODO.md` with the findings.

#### Format

Append a new sprint section at the end of the sprint backlog (before the Priority Matrix section). Use the next sprint number in sequence. Follow this exact format:

```markdown
### 🏁 Sprint N — Feature Review: <Feature Name>
**Goal:** Address bugs, usability, UX, UI, and styling issues identified in <feature name> review

#### Bugs
- [ ] <description of bug> — `<file path>`
- [ ] ...

#### Usability
- [ ] <description of usability issue>
- [ ] ...

#### UX
- [ ] <description of UX issue>
- [ ] ...

#### UI
- [ ] <description of UI issue>
- [ ] ...

#### Styling
- [ ] <description of styling issue> — `<file path>`
- [ ] ...

#### Accessibility
- [ ] <description of a11y issue>
- [ ] ...
```

#### Rules

- **Only include findings that have actual issues** — skip categories with no problems
- **Be specific**: reference file paths, line numbers, component names
- **Be actionable**: each item should be a concrete fix, not a vague suggestion
- **Prioritize**: list critical bugs first, cosmetic issues last within each category
- **No false positives**: if something works correctly, don't invent issues
- **Cross-reference**: if a fix relates to an existing TODO item, note it

### 9. Summary

After writing the sprint, provide a brief summary to the user:

- Total number of issues found per category
- Top 3 most impactful issues
- Any items that should be addressed before the next release
