# Spec: record-payment

## Intent
Record money received against a sent invoice; fully paid invoices become "paid".

## Input
`{ invoiceId, amountCents: int >= 1 }`

## Acceptance criteria
1. GIVEN a sent invoice, WHEN a partial payment is recorded, THEN the balance decreases and status stays "sent".
2. GIVEN a sent invoice, WHEN payments reach the exact total, THEN status becomes "paid".
3. GIVEN a payment greater than the outstanding balance, THEN it fails with PAYMENT_EXCEEDS_BALANCE (no overpayment/credit — see ADR 0003).
4. GIVEN a draft or paid invoice, THEN it fails with INVOICE_NOT_PAYABLE.
5. GIVEN an unknown invoiceId, THEN it fails with INVOICE_NOT_FOUND.
