# ADR 0003 — Deliberately boring persistence: JSON files, no ORM

## Status
Accepted

## Context
This repo demonstrates boundaries and guardrails, not database engineering.
ORMs add magic (lazy loading, identity maps, decorators) that blurs exactly
the layer line this repo exists to make sharp — and agents reason worse
through magic than through explicit code.

## Decision
Persistence is a port (`InvoiceRepository`) with two adapters: in-memory
(tests, reference) and JSON-file-per-invoice with atomic writes (runtime).
Serialization crosses the boundary only via `snapshot()/restore()`.
Related simplifications: customers are a plain string (no Customer entity),
and overpayment is rejected rather than modeled as credit.

## Consequences
- Swapping in Postgres later means one new adapter + one line in the
  composition root, which is precisely the demonstration.
- File storage is not concurrent-safe across processes. Out of scope, stated
  honestly.
