/**
 * These tests mirror specs/ one acceptance criterion per it(), in order.
 * They exercise use cases through the ports with in-memory fakes —
 * no HTTP, no filesystem, no mock frameworks.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  EmptyInvoiceError,
  InvalidDueDateError,
  InvalidLineItemError,
  InvalidMoneyError,
  InvoiceNotEditableError,
  InvoiceNotFoundError,
  InvoiceNotPayableError,
  PaymentExceedsBalanceError,
} from "../../../src/domain/errors.js";
import { AddLineItem } from "../../../src/application/use-cases/add-line-item.js";
import { CreateInvoice } from "../../../src/application/use-cases/create-invoice.js";
import { GetInvoice } from "../../../src/application/use-cases/get-invoice.js";
import { RecordPayment } from "../../../src/application/use-cases/record-payment.js";
import { SendInvoice } from "../../../src/application/use-cases/send-invoice.js";
import { InMemoryInvoiceRepository } from "../../../src/infrastructure/persistence/in-memory-invoice-repository.js";
import { fixedClock, sequentialIds } from "../../helpers.js";

const NOW = "2026-07-13T12:00:00Z";
const FUTURE = new Date("2026-08-01T12:00:00Z");

let repo: InMemoryInvoiceRepository;
let createInvoice: CreateInvoice;
let addLineItem: AddLineItem;
let sendInvoice: SendInvoice;
let recordPayment: RecordPayment;
let getInvoice: GetInvoice;

beforeEach(() => {
  repo = new InMemoryInvoiceRepository();
  const clock = fixedClock(NOW);
  createInvoice = new CreateInvoice(repo, sequentialIds());
  addLineItem = new AddLineItem(repo);
  sendInvoice = new SendInvoice(repo, clock);
  recordPayment = new RecordPayment(repo, clock);
  getInvoice = new GetInvoice(repo, clock);
});

async function createdWithItem(): Promise<string> {
  const { invoiceId } = await createInvoice.execute({ customerName: "ACME", currency: "BRL" });
  await addLineItem.execute({ invoiceId, description: "Consulting", unitPriceCents: 10_000, quantity: 2 });
  return invoiceId;
}

describe("spec: create-invoice", () => {
  it("1. persists a draft and returns its id", async () => {
    const { invoiceId } = await createInvoice.execute({ customerName: "ACME", currency: "BRL" });
    expect(invoiceId).toBe("inv-1");
    expect(await repo.findById(invoiceId)).not.toBeNull();
  });

  it("2. fails with INVALID_MONEY on a bad currency and persists nothing", async () => {
    await expect(
      createInvoice.execute({ customerName: "ACME", currency: "reais" }),
    ).rejects.toThrow(InvalidMoneyError);
    expect(await repo.findById("inv-1")).toBeNull();
  });

  it("3. new invoices start draft, empty and without due date", async () => {
    const { invoiceId } = await createInvoice.execute({ customerName: "ACME", currency: "BRL" });
    const view = await getInvoice.execute(invoiceId);
    expect(view.status).toBe("draft");
    expect(view.lineItems).toHaveLength(0);
    expect(view.amountPaidCents).toBe(0);
    expect(view.dueDate).toBeNull();
  });
});

describe("spec: add-line-item", () => {
  it("1. adds a line and the persisted total reflects it", async () => {
    const id = await createdWithItem();
    const view = await getInvoice.execute(id);
    expect(view.totalCents).toBe(20_000);
  });

  it("2. fails with INVOICE_NOT_EDITABLE once sent", async () => {
    const id = await createdWithItem();
    await sendInvoice.execute({ invoiceId: id, dueDate: FUTURE });
    await expect(
      addLineItem.execute({ invoiceId: id, description: "x", unitPriceCents: 1, quantity: 1 }),
    ).rejects.toThrow(InvoiceNotEditableError);
  });

  it("3. fails with INVALID_LINE_ITEM on empty description", async () => {
    const { invoiceId } = await createInvoice.execute({ customerName: "ACME", currency: "BRL" });
    await expect(
      addLineItem.execute({ invoiceId, description: "  ", unitPriceCents: 1, quantity: 1 }),
    ).rejects.toThrow(InvalidLineItemError);
  });

  it("4. fails with INVALID_LINE_ITEM on bad quantity", async () => {
    const { invoiceId } = await createInvoice.execute({ customerName: "ACME", currency: "BRL" });
    await expect(
      addLineItem.execute({ invoiceId, description: "x", unitPriceCents: 1, quantity: 0 }),
    ).rejects.toThrow(InvalidLineItemError);
  });

  it("5. fails with INVOICE_NOT_FOUND on unknown id", async () => {
    await expect(
      addLineItem.execute({ invoiceId: "nope", description: "x", unitPriceCents: 1, quantity: 1 }),
    ).rejects.toThrow(InvoiceNotFoundError);
  });
});

describe("spec: send-invoice", () => {
  it("1. draft with items and future due date becomes sent", async () => {
    const id = await createdWithItem();
    await sendInvoice.execute({ invoiceId: id, dueDate: FUTURE });
    const view = await getInvoice.execute(id);
    expect(view.status).toBe("sent");
    expect(view.dueDate).toBe(FUTURE.toISOString());
  });

  it("2. empty draft fails with EMPTY_INVOICE", async () => {
    const { invoiceId } = await createInvoice.execute({ customerName: "ACME", currency: "BRL" });
    await expect(sendInvoice.execute({ invoiceId, dueDate: FUTURE })).rejects.toThrow(
      EmptyInvoiceError,
    );
  });

  it("3. past due date fails with INVALID_DUE_DATE, using the Clock port as now", async () => {
    const id = await createdWithItem();
    await expect(
      sendInvoice.execute({ invoiceId: id, dueDate: new Date("2026-07-13T11:59:59Z") }),
    ).rejects.toThrow(InvalidDueDateError);
  });

  it("4. sending twice fails with INVOICE_NOT_EDITABLE", async () => {
    const id = await createdWithItem();
    await sendInvoice.execute({ invoiceId: id, dueDate: FUTURE });
    await expect(sendInvoice.execute({ invoiceId: id, dueDate: FUTURE })).rejects.toThrow(
      InvoiceNotEditableError,
    );
  });

  it("5. unknown id fails with INVOICE_NOT_FOUND", async () => {
    await expect(sendInvoice.execute({ invoiceId: "nope", dueDate: FUTURE })).rejects.toThrow(
      InvoiceNotFoundError,
    );
  });
});

describe("spec: record-payment", () => {
  async function sent(): Promise<string> {
    const id = await createdWithItem(); // total 20_000
    await sendInvoice.execute({ invoiceId: id, dueDate: FUTURE });
    return id;
  }

  it("1. partial payment lowers balance, status stays sent", async () => {
    const id = await sent();
    await recordPayment.execute({ invoiceId: id, amountCents: 5_000 });
    const view = await getInvoice.execute(id);
    expect(view.status).toBe("sent");
    expect(view.balanceCents).toBe(15_000);
  });

  it("2. paying the exact total transitions to paid", async () => {
    const id = await sent();
    await recordPayment.execute({ invoiceId: id, amountCents: 20_000 });
    const view = await getInvoice.execute(id);
    expect(view.status).toBe("paid");
    expect(view.balanceCents).toBe(0);
  });

  it("3. overpayment fails with PAYMENT_EXCEEDS_BALANCE", async () => {
    const id = await sent();
    await expect(recordPayment.execute({ invoiceId: id, amountCents: 20_001 })).rejects.toThrow(
      PaymentExceedsBalanceError,
    );
  });

  it("4. paying a draft fails with INVOICE_NOT_PAYABLE", async () => {
    const id = await createdWithItem();
    await expect(recordPayment.execute({ invoiceId: id, amountCents: 1 })).rejects.toThrow(
      InvoiceNotPayableError,
    );
  });

  it("5. unknown id fails with INVOICE_NOT_FOUND", async () => {
    await expect(recordPayment.execute({ invoiceId: "nope", amountCents: 1 })).rejects.toThrow(
      InvoiceNotFoundError,
    );
  });
});

describe("spec: get-invoice", () => {
  it("1. returns the full read model", async () => {
    const id = await createdWithItem();
    const view = await getInvoice.execute(id);
    expect(view).toMatchObject({
      id,
      customerName: "ACME",
      currency: "BRL",
      status: "draft",
      totalCents: 20_000,
      amountPaidCents: 0,
      balanceCents: 20_000,
    });
    expect(view.lineItems[0]).toEqual({
      description: "Consulting",
      unitPriceCents: 10_000,
      quantity: 2,
    });
  });

  it("2. overdue is derived from clock + due date, only while sent", async () => {
    const id = await createdWithItem();
    await sendInvoice.execute({ invoiceId: id, dueDate: new Date("2026-07-14T00:00:00Z") });

    const before = new GetInvoice(repo, fixedClock("2026-07-13T23:00:00Z"));
    const after = new GetInvoice(repo, fixedClock("2026-07-15T00:00:00Z"));

    expect((await before.execute(id)).overdue).toBe(false);
    expect((await after.execute(id)).overdue).toBe(true);
  });

  it("3. unknown id fails with INVOICE_NOT_FOUND", async () => {
    await expect(getInvoice.execute("nope")).rejects.toThrow(InvoiceNotFoundError);
  });
});
