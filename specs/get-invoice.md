# Spec: get-invoice

## Intent
Read model: everything the UI needs to render one invoice, derived fields included.

## Input
`invoiceId`

## Acceptance criteria
1. Returns id, customerName, currency, status, dueDate, line items, totalCents, amountPaidCents, balanceCents.
2. `overdue` is true only when status is "sent" AND now > dueDate. Overdue is derived at read time, never stored (ADR 0002).
3. GIVEN an unknown invoiceId, THEN it fails with INVOICE_NOT_FOUND.
