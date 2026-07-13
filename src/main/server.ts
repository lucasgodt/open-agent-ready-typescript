import { serve } from "@hono/node-server";
import { buildProductionApp } from "./composition-root.js";

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: buildProductionApp().fetch, port });
console.log(`invoices api listening on :${port}`);
