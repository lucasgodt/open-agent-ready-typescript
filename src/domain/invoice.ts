import {
  EmptyInvoiceError,
  InvalidDueDateError,
  InvalidLineItemError,
  InvoiceNotEditableError,
  InvoiceNotPayableError,
  PaymentExceedsBalanceError,
} from "./errors.js";
import { Money } from "./money.js";

export type InvoiceStatus = "draft" | "sent" | "paid";

export interface LineItem {
  readonly description: string;
  readonly unitPrice: Money;
  readonly quantity: number;
}

export interface Payment {
  readonly amount: Money;
  readonly paidAt: Date;
}

/**
 * Invoice is the aggregate root. All state transitions go through
 * methods that enforce the invariants; there is no way to construct
 * an invalid Invoice from outside this file.
 *
 * State machine:  draft --send()--> sent --recordPayment() until balance 0--> paid
 * "Overdue" is intentionally NOT a status: it is derived from
 * (status === "sent" && now > dueDate). See docs/adr/0002.
 */
export class Invoice {
  private constructor(
    readonly id: string,
    readonly customerName: string,
    readonly currency: string,
    private _status: InvoiceStatus,
    private _lineItems: LineItem[],
    private _payments: Payment[],
    private _dueDate: Date | null,
  ) {}

  // ── Factories ────────────────────────────────────────────────

  static createDraft(id: string, customerName: string, currency: string): Invoice {
    // Money.of validates the currency code; reuse it instead of duplicating the rule.
    Money.zero(currency);
    return new Invoice(id, customerName, currency, "draft", [], [], null);
  }

  /** Rehydrate from persistence. Trusts stored data; adapters own serialization. */
  static restore(snapshot: InvoiceSnapshot): Invoice {
    return new Invoice(
      snapshot.id,
      snapshot.customerName,
      snapshot.currency,
      snapshot.status,
      snapshot.lineItems.map((li) => ({
        description: li.description,
        unitPrice: Money.of(li.unitPriceCents, snapshot.currency),
        quantity: li.quantity,
      })),
      snapshot.payments.map((p) => ({
        amount: Money.of(p.amountCents, snapshot.currency),
        paidAt: new Date(p.paidAt),
      })),
      snapshot.dueDate ? new Date(snapshot.dueDate) : null,
    );
  }

  // ── Queries ──────────────────────────────────────────────────

  get status(): InvoiceStatus {
    return this._status;
  }

  get lineItems(): readonly LineItem[] {
    return this._lineItems;
  }

  get payments(): readonly Payment[] {
    return this._payments;
  }

  get dueDate(): Date | null {
    return this._dueDate;
  }

  total(): Money {
    return this._lineItems.reduce(
      (sum, item) => sum.add(item.unitPrice.multiply(item.quantity)),
      Money.zero(this.currency),
    );
  }

  amountPaid(): Money {
    return this._payments.reduce((sum, p) => sum.add(p.amount), Money.zero(this.currency));
  }

  balance(): Money {
    return this.total().subtract(this.amountPaid());
  }

  isOverdue(now: Date): boolean {
    return this._status === "sent" && this._dueDate !== null && now.getTime() > this._dueDate.getTime();
  }

  // ── Commands (state transitions) ─────────────────────────────

  addLineItem(description: string, unitPrice: Money, quantity: number): void {
    this.assertDraft();
    if (description.trim().length === 0) {
      throw new InvalidLineItemError("line item description must not be empty");
    }
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      throw new InvalidLineItemError(`quantity must be a positive integer, got ${quantity}`);
    }
    // Money's constructor already guarantees unitPrice is same-currency-safe;
    // still, an invoice must not mix currencies:
    Money.zero(this.currency).add(unitPrice.multiply(0));
    this._lineItems.push({ description: description.trim(), unitPrice, quantity });
  }

  removeLineItem(index: number): void {
    this.assertDraft();
    if (!Number.isSafeInteger(index) || index < 0 || index >= this._lineItems.length) {
      throw new InvalidLineItemError(`no line item at index ${index}`);
    }
    this._lineItems.splice(index, 1);
  }

  send(dueDate: Date, now: Date): void {
    this.assertDraft();
    if (this._lineItems.length === 0) {
      throw new EmptyInvoiceError();
    }
    if (dueDate.getTime() <= now.getTime()) {
      throw new InvalidDueDateError();
    }
    this._dueDate = dueDate;
    this._status = "sent";
  }

  recordPayment(amount: Money, paidAt: Date): void {
    if (this._status !== "sent") {
      throw new InvoiceNotPayableError(this._status);
    }
    const balance = this.balance();
    if (amount.isGreaterThan(balance)) {
      throw new PaymentExceedsBalanceError(balance.cents, amount.cents);
    }
    if (amount.isZero()) {
      throw new InvalidLineItemError("payment amount must be greater than zero");
    }
    this._payments.push({ amount, paidAt });
    if (this.balance().isZero()) {
      this._status = "paid";
    }
  }

  // ── Serialization boundary ───────────────────────────────────

  snapshot(): InvoiceSnapshot {
    return {
      id: this.id,
      customerName: this.customerName,
      currency: this.currency,
      status: this._status,
      dueDate: this._dueDate ? this._dueDate.toISOString() : null,
      lineItems: this._lineItems.map((li) => ({
        description: li.description,
        unitPriceCents: li.unitPrice.cents,
        quantity: li.quantity,
      })),
      payments: this._payments.map((p) => ({
        amountCents: p.amount.cents,
        paidAt: p.paidAt.toISOString(),
      })),
    };
  }

  private assertDraft(): void {
    if (this._status !== "draft") {
      throw new InvoiceNotEditableError(this._status);
    }
  }
}

/** Plain-data shape used to cross the persistence boundary. */
export interface InvoiceSnapshot {
  id: string;
  customerName: string;
  currency: string;
  status: InvoiceStatus;
  dueDate: string | null;
  lineItems: Array<{ description: string; unitPriceCents: number; quantity: number }>;
  payments: Array<{ amountCents: number; paidAt: string }>;
}
