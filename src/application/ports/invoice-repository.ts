import type { Invoice } from "../../domain/invoice.js";

/**
 * Port owned by the application layer. Adapters in infrastructure/
 * implement it; use cases depend only on this interface.
 */
export interface InvoiceRepository {
  findById(id: string): Promise<Invoice | null>;
  save(invoice: Invoice): Promise<void>;
}
