import { Invoice } from "../../domain/invoice.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { InvoiceRepository } from "../ports/invoice-repository.js";

export interface CreateInvoiceInput {
  customerName: string;
  currency: string;
}

export interface CreateInvoiceOutput {
  invoiceId: string;
}

/**
 * Spec: specs/create-invoice.md
 * One use case = one file = one intent. Orchestrates the domain,
 * knows nothing about HTTP or storage.
 */
export class CreateInvoice {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: CreateInvoiceInput): Promise<CreateInvoiceOutput> {
    const invoice = Invoice.createDraft(this.ids.next(), input.customerName, input.currency);
    await this.invoices.save(invoice);
    return { invoiceId: invoice.id };
  }
}
