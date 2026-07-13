# ADR 0005 — Spec-driven development is machine-enforced

## Status
Accepted

## Context
Four of the five guardrails were mechanical; spec-first was prose. The repo's
own thesis says prose rules don't survive agentic development — the rule
"a diff that changes behavior without touching specs/ is wrong by definition"
was exactly the kind of instruction agents forget.

## Decision
`scripts/check-spec-coverage.mjs` runs inside `verify` (hence the commit hook
and CI) and fails on: use case without spec, orphan spec, or any numbered
acceptance criterion without a mirrored `it("N. ...")` in a
`describe("spec: <name>")` block. `npm run new -- <name>` scaffolds the
golden path with matching names. `it.todo` stubs deliberately do NOT satisfy
the gate: scaffolding leaves verify red until the contract is fulfilled or
reverted, so half-done contracts cannot be committed.

## Consequences
- The mirroring convention (numbered its inside spec-named describes) is now
  load-bearing, not stylistic. The checker's parsing depends on it.
- Granularity is the use case: domain-only refactors that change no use-case
  behavior pass without spec changes. Accepted; invariants surface through
  use cases.
- WIP of a new use case blocks all commits until finished or reverted. This
  is the ratchet working as intended: small, complete increments.
