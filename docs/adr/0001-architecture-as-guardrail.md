# ADR 0001 — Architecture is enforced by machines, not by discipline

## Status
Accepted

## Context
AI agents (and tired humans) violate architectural boundaries not out of
malice but because nothing stops them. Prose conventions in READMEs have
near-zero compliance under agentic development; a rule an agent can't break
is worth ten it's asked to remember.

## Decision
Clean/hexagonal layering (domain → application → infrastructure → main) with
the dependency rule encoded in `.dependency-cruiser.cjs` and run as a build
gate (`npm run deps`, wired into `verify`, the commit hook and CI). The domain
imports nothing — not even node builtins — so it stays portable and trivially
testable.

## Consequences
- Illegal imports are build failures, reviewable as config diffs.
- The cost is indirection: ports, adapters and snapshot mapping. Accepted;
  this repo exists to demonstrate the boundary, and the boundary is cheap at
  this size.
