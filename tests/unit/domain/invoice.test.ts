import { describe, expect, it } from "vitest";
import {
  EmptyInvoiceError,
  InvalidDueDateError,
  InvalidLineItemError,
  InvoiceNotEditableError,
  InvoiceNotPayableError,
  PaymentExceedsBalanceError,
} from "../../../src/domain/errors.js";
import { Invoice } from "../../../src/domain/invoice.js";
import { Money } from "../../../src/domain/money.js";

const NOW = new Date("2026-07-13T12:00:00Z");
const FUTURE = new Date("2026-08-01T12:00:00Z");

function draftWithOneItem(): Invoice {
  const inv = Invoice.createDraft("inv-1", "ACME Ltda", "BRL");
  inv.addLineItem("Consulting", Money.of(10_000, "BRL"), 2); // total 20_000
  return inv;
}

function sentInvoice(): Invoice {
  const inv = draftWithOneItem();
  inv.send(FUTURE, NOW);
  return inv;
}

describe("Invoice state machine", () => {
  it("starts as an empty draft", () => {
    const inv = Invoice.createDraft("inv-1", "ACME", "BRL");
    expect(inv.status).toBe("draft");
    expect(inv.lineItems).toHaveLength(0);
    expect(inv.total().cents).toBe(0);
    expect(inv.dueDate).toBeNull();
  });

  it("computes total as sum of unitPrice × quantity", () => {
    const inv = draftWithOneItem();
    inv.addLineItem("Hosting", Money.of(500, "BRL"), 3);
    expect(inv.total().cents).toBe(21_500);
  });

  it("cannot be sent while empty", () => {
    const inv = Invoice.createDraft("inv-1", "ACME", "BRL");
    expect(() => inv.send(FUTURE, NOW)).toThrow(EmptyInvoiceError);
  });

  it("cannot be sent with a due date in the past or present", () => {
    const inv = draftWithOneItem();
    expect(() => inv.send(NOW, NOW)).toThrow(InvalidDueDateError);
    expect(() => inv.send(new Date("2026-01-01T00:00:00Z"), NOW)).toThrow(InvalidDueDateError);
  });

  it("transitions draft → sent, freezing line items", () => {
    const inv = sentInvoice();
    expect(inv.status).toBe("sent");
    expect(() => inv.addLineItem("late", Money.of(1, "BRL"), 1)).toThrow(InvoiceNotEditableError);
    expect(() => inv.removeLineItem(0)).toThrow(InvoiceNotEditableError);
  });

  it("rejects payments while draft", () => {
    const inv = draftWithOneItem();
    expect(() => inv.recordPayment(Money.of(1, "BRL"), NOW)).toThrow(InvoiceNotPayableError);
  });

  it("accepts partial payments and stays sent", () => {
    const inv = sentInvoice();
    inv.recordPayment(Money.of(5_000, "BRL"), NOW);
    expect(inv.status).toBe("sent");
    expect(inv.balance().cents).toBe(15_000);
  });

  it("transitions sent → paid when balance reaches zero", () => {
    const inv = sentInvoice();
    inv.recordPayment(Money.of(20_000, "BRL"), NOW);
    expect(inv.status).toBe("paid");
    expect(inv.balance().cents).toBe(0);
  });

  it("rejects overpayment", () => {
    const inv = sentInvoice();
    expect(() => inv.recordPayment(Money.of(20_001, "BRL"), NOW)).toThrow(
      PaymentExceedsBalanceError,
    );
  });

  it("rejects zero payments", () => {
    const inv = sentInvoice();
    expect(() => inv.recordPayment(Money.of(0, "BRL"), NOW)).toThrow(InvalidLineItemError);
  });

  it("rejects payments once paid", () => {
    const inv = sentInvoice();
    inv.recordPayment(Money.of(20_000, "BRL"), NOW);
    expect(() => inv.recordPayment(Money.of(1, "BRL"), NOW)).toThrow(InvoiceNotPayableError);
  });
});

describe("Invoice derived state", () => {
  it("is overdue only when sent and past due date", () => {
    const inv = sentInvoice(); // due 2026-08-01
    expect(inv.isOverdue(new Date("2026-07-31T23:59:59Z"))).toBe(false);
    expect(inv.isOverdue(new Date("2026-08-02T00:00:00Z"))).toBe(true);
  });

  it("is never overdue once paid", () => {
    const inv = sentInvoice();
    inv.recordPayment(Money.of(20_000, "BRL"), NOW);
    expect(inv.isOverdue(new Date("2030-01-01T00:00:00Z"))).toBe(false);
  });
});

describe("Invoice line item validation", () => {
  it("rejects empty descriptions", () => {
    const inv = Invoice.createDraft("inv-1", "ACME", "BRL");
    expect(() => inv.addLineItem("   ", Money.of(1, "BRL"), 1)).toThrow(InvalidLineItemError);
  });

  it("rejects non-positive or fractional quantities", () => {
    const inv = Invoice.createDraft("inv-1", "ACME", "BRL");
    expect(() => inv.addLineItem("x", Money.of(1, "BRL"), 0)).toThrow(InvalidLineItemError);
    expect(() => inv.addLineItem("x", Money.of(1, "BRL"), 1.5)).toThrow(InvalidLineItemError);
  });

  it("removes line items by index while draft", () => {
    const inv = draftWithOneItem();
    inv.removeLineItem(0);
    expect(inv.lineItems).toHaveLength(0);
    expect(() => inv.removeLineItem(0)).toThrow(InvalidLineItemError);
  });
});

describe("Invoice snapshot round-trip", () => {
  it("restore(snapshot()) preserves state and behavior", () => {
    const inv = sentInvoice();
    inv.recordPayment(Money.of(5_000, "BRL"), NOW);

    const restored = Invoice.restore(inv.snapshot());

    expect(restored.status).toBe("sent");
    expect(restored.balance().cents).toBe(15_000);
    restored.recordPayment(Money.of(15_000, "BRL"), NOW);
    expect(restored.status).toBe("paid");
  });
});
