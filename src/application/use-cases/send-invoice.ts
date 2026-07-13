import { InvoiceNotFoundError } from "../../domain/errors.js";
import type { Clock } from "../ports/clock.js";
import type { InvoiceRepository } from "../ports/invoice-repository.js";

export interface SendInvoiceInput {
  invoiceId: string;
  dueDate: Date;
}

/** Spec: specs/send-invoice.md */
export class SendInvoice {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: SendInvoiceInput): Promise<void> {
    const invoice = await this.invoices.findById(input.invoiceId);
    if (!invoice) throw new InvoiceNotFoundError(input.invoiceId);

    invoice.send(input.dueDate, this.clock.now());

    await this.invoices.save(invoice);
  }
}
