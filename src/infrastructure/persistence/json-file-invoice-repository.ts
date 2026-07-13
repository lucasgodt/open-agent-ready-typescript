import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Invoice } from "../../domain/invoice.js";
import { Invoice as InvoiceEntity, type InvoiceSnapshot } from "../../domain/invoice.js";
import type { InvoiceRepository } from "../../application/ports/invoice-repository.js";

/**
 * File-backed adapter: one JSON file per invoice, atomic writes via
 * rename. Deliberately simple — the point of this repo is the
 * boundaries, not the database. See docs/adr/0003.
 */
export class JsonFileInvoiceRepository implements InvoiceRepository {
  constructor(private readonly dataDir: string) {}

  async findById(id: string): Promise<Invoice | null> {
    if (!/^[\w-]+$/.test(id)) return null; // ids are uuids; anything else can't exist
    try {
      const raw = await readFile(this.pathFor(id), "utf8");
      return InvoiceEntity.restore(JSON.parse(raw) as InvoiceSnapshot);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  async save(invoice: Invoice): Promise<void> {
    const path = this.pathFor(invoice.id);
    await mkdir(dirname(path), { recursive: true });
    const tmp = `${path}.tmp`;
    await writeFile(tmp, JSON.stringify(invoice.snapshot(), null, 2), "utf8");
    await rename(tmp, path);
  }

  private pathFor(id: string): string {
    return join(this.dataDir, `${id}.json`);
  }
}
