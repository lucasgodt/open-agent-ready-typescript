#!/usr/bin/env bash
# PreToolUse hook on Edit|Write.
# Guardrail #3: agents may not modify test files or specs unless a human
# has explicitly granted it by creating .agent/allow-test-edits.
# Rationale: agents under pressure to "make tests pass" sometimes weaken
# or delete the tests instead of fixing the code. This makes that path
# require a human decision.
set -euo pipefail
INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"//; s/"$//')

case "$FILE" in
  */tests/*|tests/*|*/specs/*|specs/*)
    if [ ! -f ".agent/allow-test-edits" ]; then
      echo "BLOCKED: '$FILE' is a test or spec file." >&2
      echo "Tests and specs are the contract. If the task legitimately requires changing them," >&2
      echo "ask the human to run: mkdir -p .agent && touch .agent/allow-test-edits" >&2
      echo "and explain in the PR why the contract changed." >&2
      exit 2
    fi
    ;;
esac
exit 0
