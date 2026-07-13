/**
 * Integration: real HTTP adapter + real JsonFile repository on a temp dir.
 * Proves the wiring works end to end and domain errors map to status codes.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/infrastructure/http/app.js";
import { JsonFileInvoiceRepository } from "../../src/infrastructure/persistence/json-file-invoice-repository.js";
import { wireUseCases } from "../../src/main/composition-root.js";
import { fixedClock, sequentialIds } from "../helpers.js";

let dataDir: string;
let app: ReturnType<typeof buildApp>;

beforeEach(async () => {
  dataDir = await mkdtemp(join(tmpdir(), "oart-"));
  app = buildApp(
    wireUseCases({
      invoices: new JsonFileInvoiceRepository(dataDir),
      ids: sequentialIds(),
      clock: fixedClock("2026-07-13T12:00:00Z"),
    }),
  );
});

afterEach(async () => {
  await rm(dataDir, { recursive: true, force: true });
});

async function post(path: string, body: unknown) {
  return app.request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("HTTP API happy path", () => {
  it("create → add item → send → pay → get", async () => {
    const created = await post("/invoices", { customerName: "ACME", currency: "BRL" });
    expect(created.status).toBe(201);
    const { invoiceId } = (await created.json()) as { invoiceId: string };

    expect(
      (await post(`/invoices/${invoiceId}/line-items`, {
        description: "Consulting",
        unitPriceCents: 10_000,
        quantity: 2,
      })).status,
    ).toBe(204);

    expect(
      (await post(`/invoices/${invoiceId}/send`, { dueDate: "2026-08-01T12:00:00Z" })).status,
    ).toBe(204);

    expect((await post(`/invoices/${invoiceId}/payments`, { amountCents: 20_000 })).status).toBe(204);

    const got = await app.request(`/invoices/${invoiceId}`);
    expect(got.status).toBe(200);
    const view = (await got.json()) as { status: string; balanceCents: number };
    expect(view.status).toBe("paid");
    expect(view.balanceCents).toBe(0);
  });
});

describe("HTTP error mapping", () => {
  it("validation errors → 400 with issues", async () => {
    const res = await post("/invoices", { customerName: "", currency: "banana" });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION");
  });

  it("unknown invoice → 404 INVOICE_NOT_FOUND", async () => {
    const res = await app.request("/invoices/does-not-exist");
    expect(res.status).toBe(404);
  });

  it("business rule violations → 4xx with stable code", async () => {
    const created = await post("/invoices", { customerName: "ACME", currency: "BRL" });
    const { invoiceId } = (await created.json()) as { invoiceId: string };
    const res = await post(`/invoices/${invoiceId}/send`, { dueDate: "2026-08-01T12:00:00Z" });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("EMPTY_INVOICE");
  });
});
