# Variant: Frontend App (React + Vite)

Same guardrail system, adapted to a UI codebase. The core insight carries
over intact: business logic lives in a pure domain layer that imports
nothing, and the framework (React) is an adapter around it — not the other
way around.

## 1. Layer map (replaces the backend's map)

```
src/domain/          Entities, value objects, domain errors. Pure TS.
                     IMPORTS NOTHING. No react, no browser APIs, no fetch.
src/application/     Use cases + ports. Imports domain only.
                     Ports here include ApiClient, LocalStore, Clock —
                     anything the UI needs from the outside world.
src/infrastructure/  Adapters: HTTP client implementing ApiClient (fetch),
                     browser storage implementing LocalStore, etc.
src/ui/              React components, pages, hooks. May import application
                     (use cases, via context) and domain (types/entities for
                     rendering). NEVER imports infrastructure directly.
src/main/            Composition root: main.tsx wires adapters into ports
                     and provides use cases to the tree via a single context.
```

Rules for `.dependency-cruiser.cjs` (adapt the reference's file — same
mechanism, new layer set):
- `domain` → nothing outside itself (not even react)
- `application` → domain only
- `ui` → application + domain only (violation to import infrastructure)
- `infrastructure` → application + domain (never ui, never main)
- no circular deps

## 2. Scaffold

Do NOT clone the backend reference as the base — generate a Vite app and
transplant the guardrails into it:

```bash
npm create vite@latest <project-name> -- --template react-ts
cd <project-name> && git init
```

Then copy/adapt from the reference repo (fetch raw files from GitHub):
- `.claude/settings.json` + both hooks (unchanged)
- `.dependency-cruiser.cjs` (rewrite rules per the layer map above)
- `stryker.config.json` — mutate `src/domain` and `src/application` ONLY.
  Never mutate components: UI mutants are noise, domain mutants are signal.
- `specs/_TEMPLATE.md`, `docs/adr/0001` and `0004`, `.gitignore` additions
- `.github/workflows/ci.yml` (same four gates)
- tsconfig: merge the reference's strict flags into Vite's tsconfig
  (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `verbatimModuleSyntax`)

Add dev deps: `vitest`, `@vitest/coverage-v8`, `@testing-library/react`,
`@testing-library/user-event`, `jsdom`, `dependency-cruiser`,
`@stryker-mutator/core`, `@stryker-mutator/vitest-runner`,
`typescript-eslint`. Reproduce the reference's `scripts` block including
`verify`.

## 3. Testing strategy (differs from backend)

- `tests/unit/domain` + `tests/unit/application` — pure Vitest, no DOM,
  fakes for ports. This is where mutation testing bites. Same spec-first
  mirroring: one `it()` per acceptance criterion.
- `tests/ui/` — Testing Library component tests for behavior-critical
  components only, running use cases against in-memory fakes through the
  real context provider. Test what the user sees, not implementation detail.
- Coverage thresholds apply to `src/domain` + `src/application` (90%);
  UI coverage is reported but not gated — gating UI coverage incentivizes
  test tourism, exactly what guardrail #2 exists to prevent.
- E2E (Playwright) is out of scope by default; offer it, don't assume it.

## 4. Frontend-specific conventions (into the new AGENTS.md)

- No `fetch` in components or hooks — data flows through the ApiClient port.
- Server state and caching live behind ports; if the user wants React Query,
  it wraps the port's adapter in infrastructure, never appears in ui/.
- Specs describe user-visible behavior ("GIVEN an empty cart WHEN ...") —
  not component structure.
- The benchmark exercise must be a full vertical slice: spec → domain →
  use case → adapter → component, verify green.
