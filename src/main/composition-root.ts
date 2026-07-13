import { randomUUID } from "node:crypto";
import { AddLineItem } from "../application/use-cases/add-line-item.js";
import { CreateInvoice } from "../application/use-cases/create-invoice.js";
import { GetInvoice } from "../application/use-cases/get-invoice.js";
import { RecordPayment } from "../application/use-cases/record-payment.js";
import { SendInvoice } from "../application/use-cases/send-invoice.js";
import type { Clock } from "../application/ports/clock.js";
import type { IdGenerator } from "../application/ports/id-generator.js";
import type { InvoiceRepository } from "../application/ports/invoice-repository.js";
import { buildApp, type UseCases } from "../infrastructure/http/app.js";
import { JsonFileInvoiceRepository } from "../infrastructure/persistence/json-file-invoice-repository.js";

/**
 * The ONLY place where concrete adapters meet ports. Everything else
 * in the codebase depends on interfaces. Swap persistence here and
 * nothing else changes — that is the whole point.
 */
export function wireUseCases(deps: {
  invoices: InvoiceRepository;
  ids: IdGenerator;
  clock: Clock;
}): UseCases {
  return {
    createInvoice: new CreateInvoice(deps.invoices, deps.ids),
    addLineItem: new AddLineItem(deps.invoices),
    sendInvoice: new SendInvoice(deps.invoices, deps.clock),
    recordPayment: new RecordPayment(deps.invoices, deps.clock),
    getInvoice: new GetInvoice(deps.invoices, deps.clock),
  };
}

export function buildProductionApp(dataDir = "./data") {
  const systemClock: Clock = { now: () => new Date() };
  const uuidGenerator: IdGenerator = { next: () => randomUUID() };
  return buildApp(
    wireUseCases({
      invoices: new JsonFileInvoiceRepository(dataDir),
      ids: uuidGenerator,
      clock: systemClock,
    }),
  );
}
