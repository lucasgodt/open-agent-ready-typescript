# AGENTS.md

Instructions for AI coding agents working in this repository. Read this before
planning any change. Humans: see README.md for the why; this file is the how.

## What this repository is

A small invoicing API (create invoice → add line items → send → record
payments) built as a **reference for agent-native engineering**: the
architecture, tests and tooling are designed so that an AI agent produces
good code here *mechanically*, not by being asked nicely. Every rule in this
file that matters is also enforced by a machine (linter, dependency rules,
hooks, CI). If you find a rule that is prose-only, treat it as equally binding.

## Commands

```bash
npm install            # install (Node >= 22)
npm run dev            # run the API locally on :3000
npm run typecheck      # tsc --noEmit (strict mode)
npm run lint           # eslint
npm run deps           # dependency-cruiser — THE ARCHITECTURE, ENFORCED
npm run test           # vitest, all suites
npm run test:coverage  # tests + coverage thresholds (90% lines)
npm run mutation       # Stryker mutation testing (slow; CI runs it)
npm run verify         # typecheck + lint + deps + test — must pass before any commit
```

Run `npm run verify` before every commit. A hook blocks commits when it fails.

## Architecture map

```
src/domain/          Entities, value objects, domain errors.
                     IMPORTS NOTHING outside src/domain. Not even node builtins.
src/application/     Use cases + ports (interfaces). Imports domain only.
                     One use case = one file = one spec = one test block.
src/infrastructure/  Adapters: HTTP (Hono+Zod) and persistence.
                     Implements ports. May import domain, application, libraries.
src/main/            Composition root. The ONLY place adapters meet ports.
specs/               One markdown spec per use case. The contract.
tests/               unit/ (domain + use cases via fakes), integration/ (HTTP+files).
docs/adr/            Architecture decision records. Read before disagreeing
                     with a design choice — it may already be decided, with reasons.
```

The dependency rule (`npm run deps`) makes illegal imports a build failure.
Do not attempt to work around it with dynamic imports, type-only tricks or
re-exports through allowed layers. If a task seems to require breaking a
boundary, stop and ask the human — the task is probably mis-specified.

## The workflow: spec first

For any new behavior (new use case, changed business rule):

1. Write or update the spec in `specs/<use-case>.md` using `specs/_TEMPLATE.md`.
   Acceptance criteria must be concrete Given/When/Then statements.
2. Write tests that mirror the criteria — one `it()` per criterion, in order,
   in `tests/unit/application/`. Domain invariants get tests in `tests/unit/domain/`.
3. Implement: domain first (invariants live on the aggregate), then the use
   case, then adapter wiring if a new endpoint is needed.
4. `npm run verify`. Fix until green. Then commit.

Never skip step 1. A diff that changes behavior without touching `specs/`
is wrong by definition, even if all checks pass.

## Guardrails you will hit (by design)

- **Test/spec protection**: a PreToolUse hook blocks edits to `tests/` and
  `specs/` unless a human creates `.agent/allow-test-edits`. If your task is
  "make the tests pass", the tests are right and the code is wrong. If the
  contract itself must change, ask the human to grant the override and say so
  in the commit message.
- **Commit gate**: a hook runs `npm run verify` on every `git commit` and
  blocks on failure, feeding the errors back to you. Fix and retry.
- **Coverage thresholds** (90% lines) and **mutation testing** (break < 75%)
  run in CI. Tests that execute code without asserting behavior will fail
  the mutation gate — write assertions, not tourism.

## Conventions

- TypeScript strict; `any` is a lint error. Use `unknown` and narrow.
- ESM with explicit `.js` extensions in relative imports (NodeNext resolution).
- Money is integer cents inside a `Money` value object — never floats, never
  raw numbers crossing layer boundaries with implicit currency.
- Domain errors carry a stable `code`; adapters map `code` → HTTP status in
  `src/infrastructure/http/app.ts`. Never match on error message text.
- Time comes from the `Clock` port and ids from `IdGenerator`. `new Date()`
  and `randomUUID()` appear ONLY in `src/main/composition-root.ts`.
- Validation at the boundary is Zod (HTTP adapter). Invariants live in the
  domain. Do not duplicate domain rules into Zod schemas beyond basic shape.
- No new runtime dependencies without asking a human first. The smallness of
  this dependency tree is a feature.
- Prefer editing existing files over creating new ones. Before writing a new
  helper, search for an existing one — duplication is the primary failure
  mode of AI-generated code, and it is reviewed for.

## Ask a human first

- Adding any runtime dependency.
- Changing anything in `.claude/`, `.github/`, `.dependency-cruiser.cjs`,
  `eslint.config.js`, `stryker.config.json` — the guardrails themselves.
- Changing `specs/` or `tests/` (see test protection above).
- Deleting more than the task explicitly covers.

## Reusing this repo as a template (the scaffold skill)

This repository ships a Claude Code skill at
`.claude/skills/scaffold-agent-ready/` that scaffolds a NEW project with
these same guardrails, adapted to a different domain, in three shapes:
**backend API** (this repo's own structure), **frontend app** (React/Vite,
with the UI as an adapter around a pure domain) and **monorepo**
(pnpm workspaces, where layers become physical packages). The variant
playbooks live in `references/` next to the SKILL.md.

- **Agents**: if the user asks to "start a new project like this one",
  "use my reference repo", or wants a TypeScript project with these
  guardrails, read that SKILL.md and follow it step by step. Do not
  improvise your own scaffolding procedure.
- **Humans**: install it user-wide so it works from any directory:

  ```bash
  BASE=https://raw.githubusercontent.com/lucasgodt/open-agent-ready-typescript/main/.claude/skills/scaffold-agent-ready
  mkdir -p ~/.claude/skills/scaffold-agent-ready/references
  curl -sL $BASE/SKILL.md -o ~/.claude/skills/scaffold-agent-ready/SKILL.md
  for f in backend frontend monorepo; do
    curl -sL $BASE/references/$f.md -o ~/.claude/skills/scaffold-agent-ready/references/$f.md
  done
  ```

  Then, in Claude Code, from any empty directory:
  `"Scaffold a new agent-ready project for <your domain>"`.

## Verify yourself: the benchmark exercise

To test whether an agent (you) can work in this codebase correctly, implement
the following without further human input:

> **Add a `cancel-invoice` use case.** A draft or sent invoice can be
> cancelled; a paid invoice cannot (fails with `INVOICE_NOT_CANCELABLE`).
> Cancelled is a terminal status: no edits, sends or payments afterwards.
> Cancelled invoices are never overdue. Expose `POST /invoices/:id/cancel`
> (204 on success). Follow the workflow above: spec → tests → domain →
> use case → HTTP. `npm run verify` green at the end.

A correct run touches: `specs/cancel-invoice.md`, domain (`InvoiceStatus`,
transitions, an error), one new use-case file, the HTTP adapter, the
composition root, and tests mirroring the spec — and nothing else.
