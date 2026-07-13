---
name: scaffold-agent-ready
description: Scaffold a new TypeScript project with machine-enforced guardrails, replicating the open-agent-ready-typescript reference architecture (dependency rules as build gates, mutation testing, protected tests/specs, commit hooks, spec-first workflow, hierarchical AGENTS.md). Supports three variants — backend API/service, frontend app (React/Vite), and monorepo (pnpm workspaces). Use this whenever the user wants to start a new TypeScript project, backend, frontend, web app, or monorepo and mentions best practices, clean architecture, guardrails, agent-ready setup, "projeto novo", or asks to "use my reference repo" — even if they don't name the skill explicitly.
---

# Scaffold Agent-Ready TypeScript Project

Creates a new TypeScript project that inherits the five machine-enforced
guardrails from https://github.com/lucasgodt/open-agent-ready-typescript,
adapted to the user's domain and project shape. You are not copying an
example app — you are transplanting a guardrail system and growing a new
domain inside it.

## The five guardrails (every variant, non-negotiable)

1. **Dependency rule as a build gate** — dependency-cruiser config wired into
   `verify`, the commit hook and CI. The domain layer/package imports nothing.
2. **Mutation testing** (Stryker) on domain + application code, break < 75%.
3. **Protected tests and specs** — the PreToolUse hook blocks agent edits to
   `tests/**` and `specs/**` without a human-created `.agent/allow-test-edits`.
4. **Commit gate** — a hook runs the full verify suite on `git commit`,
   blocking on failure and feeding errors back to the agent.
5. **Spec-first workflow** — one Given/When/Then spec per use case, tests
   mirroring criteria one `it()` per criterion, hierarchical AGENTS.md.

## Step 0 — Gather what you need

Ask the user (only what's missing from context):
1. **Project name** and target directory.
2. **Shape**: backend API/service, frontend app, or monorepo? If they
   describe "an app with an API and a web client", that's a monorepo.
3. **Domain**: what the software does, in one sentence, plus the 2–5 core
   operations (these become the first use cases).
4. Anything to skip.

## Step 1 — Read the variant reference

Read exactly one file before scaffolding, and follow it:

- Backend API/service → `references/backend.md`
- Frontend app (React/Vite) → `references/frontend.md`
- Monorepo (apps + packages) → `references/monorepo.md`

Do not blend variants from memory; the monorepo reference already composes
the other two where relevant.

## Step 2 — Universal rules while scaffolding

- **Test-protection lifecycle**: the new project inherits the hook that
  blocks writes to `tests/**` and `specs/**`. At the start of scaffolding,
  ask the human to run `mkdir -p .agent && touch .agent/allow-test-edits`.
  DELETE that file before finishing — its absence is a success criterion.
- **Spec-first even during scaffolding**: for each core operation, write the
  spec, then the mirrored tests, then the implementation.
- Domain rules that carry over regardless of variant: aggregates own their
  invariants and throw `DomainError` subclasses with stable UPPER_SNAKE
  codes; money (if any) is integer cents in a value object; time and
  identity come from ports; `new Date()`/`randomUUID()` only in the
  composition root.
- Rewrite the root `AGENTS.md` for the new domain PRESERVING the reference's
  section structure (commands / architecture map / workflow / guardrails /
  conventions / ask-first / benchmark exercise), and write a new benchmark
  exercise: one extra use case an agent could implement to prove it can work
  in the repo. Update nested AGENTS.md files to the new domain. Keep
  `CLAUDE.md` as the one-line pointer.
- Record any domain-specific decision as a new ADR in `docs/adr/`.

## Step 3 — Prove it

```bash
npm run verify        # (or pnpm -r run verify in a monorepo) — must be green
npm run mutation      # must beat the 75% break threshold
grep -ri invoice . --exclude-dir=node_modules   # must return nothing
```

Do not hand the project over with any gate red or the override file present.
End by reminding the user to run `gh auth refresh -s workflow` if their first
push rejects the CI workflow file.
