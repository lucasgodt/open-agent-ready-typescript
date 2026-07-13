#!/usr/bin/env bash
# PreToolUse hook on Bash.
# Closes the bypass found by the benchmark's first run: the agent creating
# .agent/allow-test-edits itself via bash, and bash-level writes to tests/
# or specs/ that sidestep the Edit/Write hook.
# Removing the override (rm) is always allowed — turning protection back on
# never needs permission.
set -uo pipefail
INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1)

if printf '%s' "$CMD" | grep -q "allow-test-edits"; then
  if ! printf '%s' "$CMD" | grep -qE "rm[^&|;]*allow-test-edits"; then
    echo "BLOCKED: .agent/allow-test-edits must be created by a HUMAN, not by the agent." >&2
    echo "If the task requires changing tests or specs, ask the human to run:" >&2
    echo "  mkdir -p .agent && touch .agent/allow-test-edits" >&2
    exit 2
  fi
fi

if [ ! -f ".agent/allow-test-edits" ]; then
  if printf '%s' "$CMD" | grep -qE "(>|>>|\btee\b|\btouch\b|\bcp\b|\bmv\b|sed .*-i|\btruncate\b)[^&|;]*((^|[ /\"'])tests/|(^|[ /\"'])specs/)"; then
    echo "BLOCKED: bash-level writes to tests/ or specs/ are protected, same as Edit/Write." >&2
    echo "Ask the human for .agent/allow-test-edits if the contract must change." >&2
    exit 2
  fi
fi
exit 0
