# Spec: add-line-item

## Intent
Add a billable line (description × unit price × quantity) to a draft invoice.

## Input
`{ invoiceId, description: string (non-empty), unitPriceCents: int >= 0, quantity: int >= 1 }`

## Acceptance criteria
1. GIVEN a draft invoice, WHEN a valid line item is added, THEN the invoice total reflects unitPrice × quantity and the change is persisted.
2. GIVEN a sent or paid invoice, WHEN adding a line item, THEN it fails with INVOICE_NOT_EDITABLE.
3. GIVEN an empty/whitespace description, THEN it fails with INVALID_LINE_ITEM.
4. GIVEN quantity < 1 or non-integer, THEN it fails with INVALID_LINE_ITEM.
5. GIVEN an unknown invoiceId, THEN it fails with INVOICE_NOT_FOUND.
