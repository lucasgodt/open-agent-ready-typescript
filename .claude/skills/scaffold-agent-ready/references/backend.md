# Variant: Backend API / Service

The reference implementation itself. Scaffolding = clone, strip the example
domain, grow the new one.

## 1. Obtain the reference

```bash
git clone --depth 1 https://github.com/lucasgodt/open-agent-ready-typescript <project-name>
cd <project-name>
rm -rf .git && git init
```

If the network blocks cloning, recreate the guardrail files from the
reference's raw files on GitHub; do not improvise their content from memory.

## 2. Keep the skeleton, remove the example domain

KEEP unchanged (the guardrail system):
- `.dependency-cruiser.cjs`, `eslint.config.js`, `tsconfig.json`,
  `stryker.config.json`, `vitest.config.ts`
- `.claude/settings.json` and `.claude/hooks/` (both hooks)
- `.github/workflows/ci.yml`
- `specs/_TEMPLATE.md`, `docs/adr/0001` and `docs/adr/0004` (they describe
  the guardrails, which carry over), `.gitignore`, `LICENSE` (confirm the
  license choice with the user)
- The four-layer folder structure under `src/` and the `tests/` split
- `scripts/` (spec-coverage checker + use-case scaffolder) and the `specs`
  entry in the `verify` script
- `.claude/skills/` may be deleted in the new project (the skill belongs to
  the reference repo, not to its offspring)

DELETE (the invoicing example):
- All files inside `src/domain/`, `src/application/use-cases/`,
  `src/infrastructure/http/`, `src/infrastructure/persistence/` — keep
  `in-memory-invoice-repository.ts` open in context as a naming/pattern
  reference while writing the new one, then delete it
- `specs/*.md` except `_TEMPLATE.md`
- `tests/unit/**` and `tests/integration/**` contents (keep `tests/helpers.ts`,
  adapting the fakes to the new ports)
- `docs/adr/0002` and `0003` (invoicing-specific decisions)
- Update `name` and `description` in `package.json`

Keep the ports pattern: `Clock`, `IdGenerator`, one repository port per
aggregate, renamed to the new domain's aggregate.

## 3. Grow the new domain

Per core operation, follow the reference workflow strictly: spec →
mirrored tests → domain → use case → HTTP adapter → composition root.
The HTTP adapter keeps its two-job shape: Zod validates shape at the
boundary; `DomainError.code` maps to HTTP status via the `ERROR_STATUS`
table. Business rules never live in adapters.

## 4. Variant-specific checks

- `npm run deps` — 4-layer rules already match this structure; only adjust
  paths if the user renamed layers (discourage renaming).
- Integration tests: real HTTP adapter + real file/DB adapter on a temp dir,
  as in the reference.
