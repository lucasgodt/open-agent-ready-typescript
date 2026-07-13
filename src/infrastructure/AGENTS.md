# src/infrastructure — local invariants

- Adapters have two jobs: translate the outside world into use-case inputs,
  and translate domain outcomes back out. Zero business rules. If an `if`
  about invoices appears here, it belongs in the domain.
- HTTP: Zod validates shape at the boundary; DomainError.code maps to status
  via the ERROR_STATUS table in http/app.ts. New codes must be added there.
- Persistence adapters serialize via Invoice.snapshot()/restore() only. Never
  reach into aggregate internals or persist live object references.
- New adapters implement an existing port from src/application/ports. If no
  port fits, propose the port first (it belongs to application, not here).
