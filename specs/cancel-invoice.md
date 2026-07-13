# Spec: cancel-invoice

## Intent
Void an invoice that will not be collected, before it is paid.

## Input
`{ invoiceId }`

## Acceptance criteria
1. GIVEN a draft invoice, WHEN cancelled, THEN status becomes "cancelled".
2. GIVEN a sent invoice, WHEN cancelled, THEN status becomes "cancelled".
3. GIVEN a paid invoice, WHEN cancelled, THEN it fails with INVOICE_NOT_CANCELABLE.
4. GIVEN a cancelled invoice, WHEN cancelled again, THEN it fails with INVOICE_NOT_CANCELABLE — cancelled is terminal.
5. GIVEN a cancelled invoice, WHEN a line item is added, it is sent, or a payment is recorded, THEN each fails (INVOICE_NOT_EDITABLE / INVOICE_NOT_PAYABLE) — no edits, sends or payments after cancellation.
6. GIVEN a cancelled invoice whose due date is in the past, THEN it is never reported overdue.
7. GIVEN an unknown invoiceId, THEN it fails with INVOICE_NOT_FOUND.

## Out of scope
Refunds of partial payments already recorded, cancellation reasons/audit trail,
and un-cancelling (reactivation) — cancellation is permanent.
