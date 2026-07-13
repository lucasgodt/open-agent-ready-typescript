import { InvoiceNotFoundError } from "../../domain/errors.js";
import type { InvoiceRepository } from "../ports/invoice-repository.js";

export interface CancelInvoiceInput {
  invoiceId: string;
}

/** Spec: specs/cancel-invoice.md */
export class CancelInvoice {
  constructor(private readonly invoices: InvoiceRepository) {}

  async execute(input: CancelInvoiceInput): Promise<void> {
    const invoice = await this.invoices.findById(input.invoiceId);
    if (!invoice) throw new InvoiceNotFoundError(input.invoiceId);

    invoice.cancel();

    await this.invoices.save(invoice);
  }
}
