# src/application — local invariants

- Imports: src/domain and this layer only. No infrastructure, no libraries.
- One use case per file, named after the intent (verb-noun), with a matching
  spec in specs/ and a test block in tests/unit/application/. Keep the
  execute() body a short orchestration: load → call domain → save.
- Business rules do NOT live here. If you're writing an `if` about invoice
  state in a use case, move it into the Invoice aggregate.
- Ports are interfaces owned by this layer. Adapters implement them; use cases
  never know which adapter is behind the port. Need time or ids? Take Clock or
  IdGenerator via constructor — never import node:crypto or call new Date().
