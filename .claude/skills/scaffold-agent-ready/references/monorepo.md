# Variant: Monorepo (pnpm workspaces)

The monorepo is where the guardrail system pays off most: layer boundaries
become **physical package boundaries**, enforced twice — by package.json
dependency declarations AND by dependency-cruiser. An illegal import doesn't
just fail lint; it fails module resolution.

## 1. Structure

```
<project>/
├── pnpm-workspace.yaml        # packages: ["apps/*", "packages/*"]
├── AGENTS.md                  # root: global conventions + workspace map
├── CLAUDE.md                  # pointer, one line
├── .claude/                   # hooks apply repo-wide (paths are relative)
├── .dependency-cruiser.cjs    # root config, cross-package rules
├── .github/workflows/ci.yml
├── specs/                     # specs stay at the root: they describe the
│                              # product, and one spec may span api + web
├── docs/adr/
├── packages/
│   ├── domain/                # @<scope>/domain — THE pure package.
│   │   ├── AGENTS.md          #   "dependencies": {} in package.json is the
│   │   └── package.json       #   loudest guardrail in the whole repo.
│   └── application/           # @<scope>/application — depends on domain only
│       └── AGENTS.md
└── apps/
    ├── api/                   # backend variant, minus domain/application
    │   └── AGENTS.md          # (imports them from packages/)
    └── web/                   # frontend variant, minus domain/application
        └── AGENTS.md
```

Domain and application exist ONCE, as packages, consumed by both apps. That
is the monorepo's reason to exist — if the api and web don't share domain
logic, ask the user whether two separate repos serve them better.

## 2. Scaffold order

1. Root: `pnpm init`, `pnpm-workspace.yaml`, git init, copy guardrails from
   the reference repo (hooks, workflow, root configs, `specs/_TEMPLATE.md`,
   ADRs 0001/0004).
2. `packages/domain`: pure TS package. `"dependencies": {}` — and add a CI
   assertion for it (script that fails if that object is ever non-empty).
3. `packages/application`: depends on `@<scope>/domain` via `workspace:*`.
4. `apps/api`: follow `references/backend.md` for its internal shape, except
   domain/application are imported from packages, so the app keeps only
   `infrastructure/` and `main/`.
5. `apps/web`: follow `references/frontend.md` the same way — the app keeps
   `ui/`, `infrastructure/`, `main/`.

## 3. Tooling adaptations

- **Scripts**: every package/app has its own `verify`; the root's is
  `pnpm -r run verify`. The commit hook and CI call the root script. Turborepo
  is an optional optimization — do not add it unless the user asks; guardrails
  first, build caching later.
- **dependency-cruiser** at the root enforces cross-package direction:
  packages never import apps; `packages/domain` imports nothing; apps never
  import each other. Within each app, replicate the per-variant layer rules.
- **Stryker**: one config at the root mutating `packages/domain` and
  `packages/application` only. One place, the highest-value target.
- **TypeScript**: project references (`composite: true` in packages, root
  `tsconfig` with `references`) so `tsc -b` typechecks in dependency order.
- **Hooks**: the reference's hooks work unchanged from the root — they match
  on `tests/` and `specs/` path segments anywhere in the tree.

## 4. Hierarchical AGENTS.md (this variant's superpower)

Agents read the nearest AGENTS.md automatically. Use that:
- Root: workspace map, cross-package rules, commands, spec-first workflow.
- `packages/domain/AGENTS.md`: purity invariants ("dependencies stays empty").
- Each app: its variant-specific conventions (backend adapter rules, frontend
  no-fetch-in-components rule).
Keep every file under ~80 lines; local files carry local invariants only,
never repeat the root.

## 5. Variant-specific success criteria (besides the universal ones)

- `pnpm -r run verify` green from the root.
- `packages/domain/package.json` has an empty `dependencies` object.
- A single spec demonstrably drives both apps (e.g., one use case consumed
  by api endpoint AND web component) — otherwise the monorepo isn't earning
  its complexity, and you should say so to the user.
