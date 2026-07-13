import { InvoiceNotFoundError } from "../../domain/errors.js";
import { Money } from "../../domain/money.js";
import type { InvoiceRepository } from "../ports/invoice-repository.js";

export interface AddLineItemInput {
  invoiceId: string;
  description: string;
  unitPriceCents: number;
  quantity: number;
}

/** Spec: specs/add-line-item.md */
export class AddLineItem {
  constructor(private readonly invoices: InvoiceRepository) {}

  async execute(input: AddLineItemInput): Promise<void> {
    const invoice = await this.invoices.findById(input.invoiceId);
    if (!invoice) throw new InvoiceNotFoundError(input.invoiceId);

    const unitPrice = Money.of(input.unitPriceCents, invoice.currency);
    invoice.addLineItem(input.description, unitPrice, input.quantity);

    await this.invoices.save(invoice);
  }
}
