/**
 * Every domain error extends DomainError so adapters can map
 * "business rule violated" to an HTTP 4xx in one place.
 * Each carries a stable `code` — adapters must switch on `code`,
 * never on message text.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
}

export class InvalidMoneyError extends DomainError {
  readonly code = "INVALID_MONEY";
}

export class InvoiceNotEditableError extends DomainError {
  readonly code = "INVOICE_NOT_EDITABLE";
  constructor(status: string) {
    super(`invoice can only be modified while draft, current status: ${status}`);
  }
}

export class EmptyInvoiceError extends DomainError {
  readonly code = "EMPTY_INVOICE";
  constructor() {
    super("an invoice needs at least one line item before it can be sent");
  }
}

export class InvoiceNotPayableError extends DomainError {
  readonly code = "INVOICE_NOT_PAYABLE";
  constructor(status: string) {
    super(`payments can only be recorded on sent invoices, current status: ${status}`);
  }
}

export class PaymentExceedsBalanceError extends DomainError {
  readonly code = "PAYMENT_EXCEEDS_BALANCE";
  constructor(balanceCents: number, attemptedCents: number) {
    super(`payment of ${attemptedCents} cents exceeds outstanding balance of ${balanceCents} cents`);
  }
}

export class InvalidLineItemError extends DomainError {
  readonly code = "INVALID_LINE_ITEM";
}

export class InvalidDueDateError extends DomainError {
  readonly code = "INVALID_DUE_DATE";
  constructor() {
    super("due date must be in the future at the moment the invoice is sent");
  }
}

export class InvoiceNotCancelableError extends DomainError {
  readonly code = "INVOICE_NOT_CANCELABLE";
  constructor(status: string) {
    super(`only draft or sent invoices can be cancelled, current status: ${status}`);
  }
}

export class InvoiceNotFoundError extends DomainError {
  readonly code = "INVOICE_NOT_FOUND";
  constructor(id: string) {
    super(`invoice not found: ${id}`);
  }
}
