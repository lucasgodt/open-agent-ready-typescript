# src/domain — local invariants

- This layer imports NOTHING outside src/domain. No node builtins, no libraries,
  no other layers. `npm run deps` enforces it; don't fight the rule, fix the design.
- All state transitions go through Invoice methods. Never mutate line items,
  payments or status from outside the aggregate. If a new operation is needed,
  it becomes a method that enforces its own invariants and throws a DomainError.
- New domain errors: extend DomainError, add a stable UPPER_SNAKE `code`, then
  map the code to an HTTP status in src/infrastructure/http/app.ts.
- Money: always integer cents, always through the Money value object. If you
  are about to write `price * quantity` on raw numbers, stop.
- No `Date.now()` / `new Date()` here. Methods that need "now" take it as a
  parameter (see Invoice.send, Invoice.isOverdue).
