import { InvoiceNotFoundError } from "../../domain/errors.js";
import type { InvoiceStatus } from "../../domain/invoice.js";
import type { Clock } from "../ports/clock.js";
import type { InvoiceRepository } from "../ports/invoice-repository.js";

export interface InvoiceView {
  id: string;
  customerName: string;
  currency: string;
  status: InvoiceStatus;
  overdue: boolean;
  dueDate: string | null;
  totalCents: number;
  amountPaidCents: number;
  balanceCents: number;
  lineItems: Array<{ description: string; unitPriceCents: number; quantity: number }>;
}

/** Spec: specs/get-invoice.md — read model assembled from the aggregate. */
export class GetInvoice {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly clock: Clock,
  ) {}

  async execute(invoiceId: string): Promise<InvoiceView> {
    const invoice = await this.invoices.findById(invoiceId);
    if (!invoice) throw new InvoiceNotFoundError(invoiceId);

    return {
      id: invoice.id,
      customerName: invoice.customerName,
      currency: invoice.currency,
      status: invoice.status,
      overdue: invoice.isOverdue(this.clock.now()),
      dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
      totalCents: invoice.total().cents,
      amountPaidCents: invoice.amountPaid().cents,
      balanceCents: invoice.balance().cents,
      lineItems: invoice.lineItems.map((li) => ({
        description: li.description,
        unitPriceCents: li.unitPrice.cents,
        quantity: li.quantity,
      })),
    };
  }
}
