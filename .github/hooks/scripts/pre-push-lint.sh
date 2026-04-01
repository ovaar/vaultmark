#!/bin/bash
# Pre-push lint check for Copilot agent hooks.
# Triggered via PreToolUse on run_in_terminal calls containing "git push".
# Runs tsc and cargo clippy; blocks the push if either fails.
# Uses uv-managed Python (.venv) so we don't depend on the host python.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Bootstrap uv-managed venv if it doesn't exist yet
if command -v uv &>/dev/null; then
  if [[ ! -d "$REPO_ROOT/.venv" ]]; then
    uv venv "$REPO_ROOT/.venv" --quiet 2>/dev/null || true
  fi
  PYTHON="$REPO_ROOT/.venv/bin/python"
  # Fallback if venv python doesn't exist
  if [[ ! -x "$PYTHON" ]]; then
    PYTHON="$(uv python find 2>/dev/null || echo python3)"
  fi
else
  PYTHON="python3"
fi

INPUT=$(cat)

# Extract the tool name and command from the hook JSON input
TOOL_NAME=$(echo "$INPUT" | "$PYTHON" -c "import sys,json; print(json.load(sys.stdin).get('toolName',''))" 2>/dev/null || echo "")
COMMAND=$(echo "$INPUT" | "$PYTHON" -c "import sys,json; print(json.load(sys.stdin).get('toolInput',{}).get('command',''))" 2>/dev/null || echo "")

# Only intercept run_in_terminal calls that contain "git push"
if [[ "$TOOL_NAME" != "run_in_terminal" ]] || [[ "$COMMAND" != *"git push"* ]]; then
  echo '{"decision":"continue"}'
  exit 0
fi

ERRORS=""

# TypeScript type checking
if command -v npx &>/dev/null && [[ -f "tsconfig.json" ]]; then
  if ! npx tsc --noEmit 2>&1; then
    ERRORS="${ERRORS}\n- TypeScript type check failed"
  fi
fi

# Rust clippy
if command -v cargo &>/dev/null && [[ -f "src-tauri/Cargo.toml" ]]; then
  if ! cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings 2>&1; then
    ERRORS="${ERRORS}\n- Cargo clippy found warnings/errors"
  fi
fi

if [[ -n "$ERRORS" ]]; then
  REASON="Lint checks failed before push:${ERRORS}"
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"${REASON}\"}}"
  exit 0
fi

echo '{"decision":"continue"}'
exit 0
