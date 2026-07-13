# ADR 0002 — "Overdue" is derived state, never stored

## Status
Accepted

## Context
An invoice becomes overdue by time passing, with no user action. Storing
`status = "overdue"` requires a scheduler to flip statuses, invites clock
drift bugs, and creates an update race with payments.

## Decision
`InvoiceStatus` is only `draft | sent | paid` (and terminal states added
later). Overdue is computed at read time: `status === "sent" && now > dueDate`,
with `now` injected via the Clock port.

## Consequences
- No background jobs, no stored state that can go stale.
- Every read model that shows overdue must receive a Clock. That's the point:
  time is an input, so tests never sleep and never flake.
