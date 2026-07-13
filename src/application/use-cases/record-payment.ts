import { InvoiceNotFoundError } from "../../domain/errors.js";
import { Money } from "../../domain/money.js";
import type { Clock } from "../ports/clock.js";
import type { InvoiceRepository } from "../ports/invoice-repository.js";

export interface RecordPaymentInput {
  invoiceId: string;
  amountCents: number;
}

/** Spec: specs/record-payment.md */
export class RecordPayment {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: RecordPaymentInput): Promise<void> {
    const invoice = await this.invoices.findById(input.invoiceId);
    if (!invoice) throw new InvoiceNotFoundError(input.invoiceId);

    invoice.recordPayment(Money.of(input.amountCents, invoice.currency), this.clock.now());

    await this.invoices.save(invoice);
  }
}
