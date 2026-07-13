# Spec: create-invoice

## Intent
Start a new draft invoice for a customer, in a single currency.

## Input
`{ customerName: string (1..200), currency: ISO-4217 code }`

## Acceptance criteria
1. GIVEN a valid customer name and currency, WHEN the use case executes, THEN a draft invoice is persisted and its id is returned.
2. GIVEN an invalid currency code, WHEN the use case executes, THEN it fails with INVALID_MONEY and nothing is persisted.
3. The created invoice starts with status "draft", no line items, no payments and no due date.

## Out of scope
Customer entity/registry (customerName is a plain string by design — see ADR 0003).
