import type { Invoice } from "../../domain/invoice.js";
import { Invoice as InvoiceEntity } from "../../domain/invoice.js";
import type { InvoiceRepository } from "../../application/ports/invoice-repository.js";

/**
 * Reference adapter and default test double. Stores snapshots (not live
 * objects) so save/find round-trips behave like a real database.
 */
export class InMemoryInvoiceRepository implements InvoiceRepository {
  private readonly rows = new Map<string, string>();

  findById(id: string): Promise<Invoice | null> {
    const row = this.rows.get(id);
    return Promise.resolve(row ? InvoiceEntity.restore(JSON.parse(row)) : null);
  }

  save(invoice: Invoice): Promise<void> {
    this.rows.set(invoice.id, JSON.stringify(invoice.snapshot()));
    return Promise.resolve();
  }
}
