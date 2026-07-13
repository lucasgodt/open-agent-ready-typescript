import { Hono } from "hono";
import { z, ZodError } from "zod";
import { DomainError } from "../../domain/errors.js";
import type { AddLineItem } from "../../application/use-cases/add-line-item.js";
import type { CreateInvoice } from "../../application/use-cases/create-invoice.js";
import type { GetInvoice } from "../../application/use-cases/get-invoice.js";
import type { RecordPayment } from "../../application/use-cases/record-payment.js";
import type { SendInvoice } from "../../application/use-cases/send-invoice.js";

export interface UseCases {
  createInvoice: CreateInvoice;
  addLineItem: AddLineItem;
  sendInvoice: SendInvoice;
  recordPayment: RecordPayment;
  getInvoice: GetInvoice;
}

/**
 * The HTTP adapter has exactly two jobs:
 *   1. validate/parse the outside world (Zod) into use-case inputs
 *   2. map domain errors to status codes by error `code`
 * No business rules live here. If you are tempted to add an `if` about
 * invoices in this file, it belongs in the domain.
 */

const createInvoiceBody = z.object({
  customerName: z.string().min(1).max(200),
  currency: z.string().regex(/^[A-Z]{3}$/),
});

const addLineItemBody = z.object({
  description: z.string().min(1).max(500),
  unitPriceCents: z.number().int().min(0),
  quantity: z.number().int().min(1),
});

const sendInvoiceBody = z.object({
  dueDate: z.string().datetime(),
});

const recordPaymentBody = z.object({
  amountCents: z.number().int().min(1),
});

const ERROR_STATUS: Record<string, 400 | 404 | 409 | 422> = {
  INVOICE_NOT_FOUND: 404,
  INVOICE_NOT_EDITABLE: 409,
  INVOICE_NOT_PAYABLE: 409,
  EMPTY_INVOICE: 422,
  PAYMENT_EXCEEDS_BALANCE: 422,
  INVALID_DUE_DATE: 422,
  INVALID_LINE_ITEM: 422,
  INVALID_MONEY: 422,
};

export function buildApp(useCases: UseCases): Hono {
  const app = new Hono();

  app.onError((err, c) => {
    if (err instanceof ZodError) {
      return c.json({ error: { code: "VALIDATION", issues: err.issues } }, 400);
    }
    if (err instanceof DomainError) {
      const status = ERROR_STATUS[err.code] ?? 422;
      return c.json({ error: { code: err.code, message: err.message } }, status);
    }
    console.error(err);
    return c.json({ error: { code: "INTERNAL", message: "unexpected error" } }, 500);
  });

  app.post("/invoices", async (c) => {
    const body = createInvoiceBody.parse(await c.req.json());
    const result = await useCases.createInvoice.execute(body);
    return c.json(result, 201);
  });

  app.post("/invoices/:id/line-items", async (c) => {
    const body = addLineItemBody.parse(await c.req.json());
    await useCases.addLineItem.execute({ invoiceId: c.req.param("id"), ...body });
    return c.body(null, 204);
  });

  app.post("/invoices/:id/send", async (c) => {
    const body = sendInvoiceBody.parse(await c.req.json());
    await useCases.sendInvoice.execute({
      invoiceId: c.req.param("id"),
      dueDate: new Date(body.dueDate),
    });
    return c.body(null, 204);
  });

  app.post("/invoices/:id/payments", async (c) => {
    const body = recordPaymentBody.parse(await c.req.json());
    await useCases.recordPayment.execute({ invoiceId: c.req.param("id"), ...body });
    return c.body(null, 204);
  });

  app.get("/invoices/:id", async (c) => {
    const view = await useCases.getInvoice.execute(c.req.param("id"));
    return c.json(view);
  });

  // Zod errors → 400 with details
  app.notFound((c) => c.json({ error: { code: "NOT_FOUND", message: "route not found" } }, 404));

  return app;
}
