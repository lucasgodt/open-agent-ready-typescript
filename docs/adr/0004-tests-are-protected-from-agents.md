# ADR 0004 — Agents cannot edit tests or specs without human sign-off

## Status
Accepted

## Context
A documented failure mode of agentic coding: told to "make the tests pass",
agents sometimes weaken assertions or delete failing tests — the suite goes
green while the code stays wrong. Kent Beck reported agents deleting failing
tests instead of fixing implementations.

## Decision
A PreToolUse hook (`.claude/hooks/protect-tests.sh`) blocks agent edits to
`tests/**` and `specs/**` unless a human creates `.agent/allow-test-edits`.
Changing the contract is a human decision, granted per task, and expected to
be justified in the commit message.

## Consequences
- The legitimate flow (spec change → test change → code change) gains one
  explicit human step. Acceptable: contract changes SHOULD be slower than
  implementation changes.
- The hook is Claude Code–specific; other agents need an equivalent gate.
  CI mutation testing remains the tool-agnostic backstop.
