# open-agent-ready-typescript

**A reference TypeScript codebase engineered so AI agents produce good code
in it — architecture as guardrails, not as documentation.**

Most AI-assisted codebases degrade the same way: productivity jumps, and three
months later there's duplicated logic in three files, tests that assert
nothing, and an agent that breaks the code it wrote when asked to change it.
That's not a model problem — it's a workflow problem. Prose conventions don't
survive contact with agents (or with tired humans). Rules that are *machines*
do.

This repo is a small but real invoicing API (draft → send → pay, money as
integer cents, a proper state machine) built to demonstrate one thesis:

> **Every rule that matters must be enforced by a tool the agent cannot
> argue with.**

## The five guardrails

1. **The dependency rule is a build failure, not a diagram.**
   `dependency-cruiser` fails `verify`, the commit hook and CI on any illegal
   import. `src/domain` imports *nothing* — not even node builtins. The agent
   doesn't need to remember the architecture; violating it is impossible to merge.

2. **Mutation testing catches tests that don't test.**
   Coverage says a line ran. [Stryker](https://stryker-mutator.io) says the
   tests would *notice if the line broke*. CI breaks below 75% mutation score;
   the application layer currently scores 100%.

3. **Tests and specs are protected from the agent.**
   A Claude Code `PreToolUse` hook blocks agent edits to `tests/**` and
   `specs/**` unless a human explicitly grants an override. "Make the tests
   pass" can no longer be satisfied by deleting the tests (ADR 0004).

4. **Commits are gated on the full verify suite.**
   A hook runs `typecheck + lint + deps + test` on every `git commit` and
   feeds failures back to the agent — feedback loop, not just a wall.

5. **Specs are the contract, and the workflow starts there.**
   One markdown spec per use case with Given/When/Then acceptance criteria;
   tests mirror them one `it()` per criterion. A behavior change that doesn't
   touch `specs/` is wrong by definition.

## Agent-native structure

- [`AGENTS.md`](AGENTS.md) at the root (the [open standard](https://agents.md)),
  under 300 lines, imperative, with exact commands — plus **nested AGENTS.md**
  files in `src/domain`, `src/application` and `src/infrastructure` carrying
  each layer's local invariants.
- `CLAUDE.md` is one line pointing at AGENTS.md (portable across tools).
- [`docs/adr/`](docs/adr) records the *why* behind decisions, so agents stop
  relitigating them.
- Deterministic seams everywhere: time and identity are ports (`Clock`,
  `IdGenerator`); `new Date()` and `randomUUID()` exist only in the
  composition root. Tests never sleep, never flake.

## The benchmark exercise

The end of [`AGENTS.md`](AGENTS.md) contains a self-contained task
(`cancel-invoice`) designed to verify whether *any* coding agent can work in
this repo correctly: spec → tests → domain → use case → HTTP, `verify` green,
nothing else touched. Point your agent at it and grade the diff. That's the
whole point of this repository — it's not just an example, it's a test bench.

## Start your next project from this one

This repo doubles as a template, and ships a [Claude Code skill](.claude/skills/scaffold-agent-ready/SKILL.md) that does the transplant for
you: it keeps the guardrail system (configs, hooks, CI, layer structure),
removes the invoicing example, and grows your new domain spec-first inside it.

One-time install (user-wide):

```bash
mkdir -p ~/.claude/skills/scaffold-agent-ready
curl -sL https://raw.githubusercontent.com/lucasgodt/open-agent-ready-typescript/main/.claude/skills/scaffold-agent-ready/SKILL.md \
  -o ~/.claude/skills/scaffold-agent-ready/SKILL.md
```

Then from any empty directory, in Claude Code:

> Scaffold a new agent-ready project for [your domain]

Prefer doing it by hand? The recipe is the same one the skill follows:
clone, keep every config/hook/workflow file plus the layer skeleton, delete
`src` domain contents + specs + tests of the example, and rebuild your domain
following the spec-first workflow in AGENTS.md. GitHub's "Use this template"
button also works for the mechanical copy.

## Run it

```bash
npm install
npm run verify        # typecheck + lint + dependency rules + tests
npm run dev           # API on :3000
npm run mutation      # Stryker (slower)
```

```bash
curl -s -X POST :3000/invoices -H 'content-type: application/json' \
  -d '{"customerName":"ACME Ltda","currency":"BRL"}'
```

## Honest limitations

- The test-protection hook is Claude Code–specific; other agents need an
  equivalent gate. Mutation testing in CI is the tool-agnostic backstop.
- JSON-file persistence is deliberately boring and not concurrent-safe across
  processes (ADR 0003). Swapping in a real database is one adapter + one line
  in the composition root — which is precisely the demonstration.
- Mutation survivors that remain are error-message string mutants; the
  contract is the error `code`, asserted everywhere, not the prose.

## License

MIT
