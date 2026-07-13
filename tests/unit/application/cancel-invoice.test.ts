/**
 * Mirrors specs/cancel-invoice.md — one it() per acceptance criterion, same
 * numbers, same order. Exercises CancelInvoice through the ports with
 * in-memory fakes, like the other use-case suites.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  InvoiceNotCancelableError,
  InvoiceNotEditableError,
  InvoiceNotFoundError,
  InvoiceNotPayableError,
} from "../../../src/domain/errors.js";
import { AddLineItem } from "../../../src/application/use-cases/add-line-item.js";
import { CancelInvoice } from "../../../src/application/use-cases/cancel-invoice.js";
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
let cancelInvoice: CancelInvoice;
let getInvoice: GetInvoice;

beforeEach(() => {
  repo = new InMemoryInvoiceRepository();
  const clock = fixedClock(NOW);
  createInvoice = new CreateInvoice(repo, sequentialIds());
  addLineItem = new AddLineItem(repo);
  sendInvoice = new SendInvoice(repo, clock);
  recordPayment = new RecordPayment(repo, clock);
  cancelInvoice = new CancelInvoice(repo);
  getInvoice = new GetInvoice(repo, clock);
});

async function draft(): Promise<string> {
  const { invoiceId } = await createInvoice.execute({ customerName: "ACME", currency: "BRL" });
  await addLineItem.execute({ invoiceId, description: "Consulting", unitPriceCents: 10_000, quantity: 2 });
  return invoiceId;
}

async function sent(): Promise<string> {
  const id = await draft(); // total 20_000
  await sendInvoice.execute({ invoiceId: id, dueDate: FUTURE });
  return id;
}

describe("spec: cancel-invoice", () => {
  it("1. cancelling a draft invoice persists status cancelled", async () => {
    const id = await draft();
    await cancelInvoice.execute({ invoiceId: id });
    expect((await getInvoice.execute(id)).status).toBe("cancelled");
  });

  it("2. cancelling a sent invoice persists status cancelled", async () => {
    const id = await sent();
    await cancelInvoice.execute({ invoiceId: id });
    expect((await getInvoice.execute(id)).status).toBe("cancelled");
  });

  it("3. cancelling a paid invoice fails with INVOICE_NOT_CANCELABLE", async () => {
    const id = await sent();
    await recordPayment.execute({ invoiceId: id, amountCents: 20_000 });
    await expect(cancelInvoice.execute({ invoiceId: id })).rejects.toThrow(
      InvoiceNotCancelableError,
    );
    expect((await getInvoice.execute(id)).status).toBe("paid");
  });

  it("4. cancelling twice fails with INVOICE_NOT_CANCELABLE — cancelled is terminal", async () => {
    const id = await sent();
    await cancelInvoice.execute({ invoiceId: id });
    await expect(cancelInvoice.execute({ invoiceId: id })).rejects.toThrow(
      InvoiceNotCancelableError,
    );
  });

  it("5. no edits, sends or payments after cancellation", async () => {
    const id = await draft();
    await cancelInvoice.execute({ invoiceId: id });

    await expect(
      addLineItem.execute({ invoiceId: id, description: "x", unitPriceCents: 1, quantity: 1 }),
    ).rejects.toThrow(InvoiceNotEditableError);
    await expect(sendInvoice.execute({ invoiceId: id, dueDate: FUTURE })).rejects.toThrow(
      InvoiceNotEditableError,
    );
    await expect(recordPayment.execute({ invoiceId: id, amountCents: 1 })).rejects.toThrow(
      InvoiceNotPayableError,
    );
  });

  it("6. a cancelled invoice with a past due date is never overdue", async () => {
    const id = await sent(); // due 2026-08-01
    await cancelInvoice.execute({ invoiceId: id });

    const longAfterDue = new GetInvoice(repo, fixedClock("2030-01-01T00:00:00Z"));
    expect((await longAfterDue.execute(id)).overdue).toBe(false);
  });

  it("7. unknown id fails with INVOICE_NOT_FOUND", async () => {
    await expect(cancelInvoice.execute({ invoiceId: "nope" })).rejects.toThrow(
      InvoiceNotFoundError,
    );
  });
});
