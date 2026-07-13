# Spec: send-invoice

## Intent
Freeze a draft and issue it to the customer with a payment due date.

## Input
`{ invoiceId, dueDate: Date }`

## Acceptance criteria
1. GIVEN a draft invoice with at least one line item and a future due date, WHEN sent, THEN status becomes "sent" and the due date is stored.
2. GIVEN a draft invoice with zero line items, WHEN sent, THEN it fails with EMPTY_INVOICE.
3. GIVEN a due date in the past (or equal to now), THEN it fails with INVALID_DUE_DATE. "Now" comes from the Clock port, never from `new Date()` inside domain or application code.
4. GIVEN an invoice that is already sent or paid, THEN it fails with INVOICE_NOT_EDITABLE.
5. GIVEN an unknown invoiceId, THEN it fails with INVOICE_NOT_FOUND.
