#!/usr/bin/env bash
# PreToolUse hook on Bash, matched to git commit commands.
# Guardrail #4: nothing gets committed unless the full verify suite is
# green. Exit 2 blocks the commit and feeds stderr back to the agent so
# it can fix and retry — feedback, not just a gate.
set -uo pipefail
INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1)
if printf '%s' "$CMD" | grep -q "git commit"; then
  if ! OUTPUT=$(npm run verify 2>&1); then
    echo "COMMIT BLOCKED: verify failed. Fix the issues below, then retry the commit." >&2
    printf '%s\n' "$OUTPUT" | tail -40 >&2
    exit 2
  fi
fi
exit 0
