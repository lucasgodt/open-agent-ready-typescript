#!/usr/bin/env node
/**
 * The golden path for spec-driven development:
 *   npm run new -- <use-case-name>
 *
 * Creates, with matching names:
 *   specs/<name>.md          (from the template, criteria to fill in)
 *   tests/.../<name>.test.ts (mirrored describe block, it.todo per criterion)
 *   src/.../<name>.ts        (use case stub that throws NotImplemented)
 *
 * Then prints the workflow. The right way becomes the easy way.
 *
 * Note on the test-protection hook: this script writes the test STUB, which
 * is allowed to exist before the contract is agreed. Filling in the real
 * assertions still requires the human to grant .agent/allow-test-edits —
 * the contract-signing step is preserved.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const name = process.argv[2];
if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error("usage: npm run new -- <use-case-name>   (kebab-case, e.g. cancel-invoice)");
  process.exit(1);
}

const pascal = name
  .split("-")
  .map((w) => w[0].toUpperCase() + w.slice(1))
  .join("");

const files = {
  [join("specs", `${name}.md`)]: `# Spec: ${name}

## Intent
<one sentence: what user goal this serves>

## Input
\`{ ... }\`

## Acceptance criteria
1. GIVEN ... WHEN ... THEN ...
2. GIVEN ... WHEN ... THEN ...

## Out of scope
<explicitly not handled here>
`,
  [join("tests", "unit", "application", `${name}.test.ts`)]: `import { describe, it } from "vitest";

/**
 * Mirrors specs/${name}.md — one it() per acceptance criterion, same
 * numbers, same order. Replace each it.todo with a real test once the
 * spec is agreed (requires .agent/allow-test-edits, granted by a human).
 */
describe("spec: ${name}", () => {
  it.todo("1. <criterion 1>");
  it.todo("2. <criterion 2>");
});
`,
  [join("src", "application", "use-cases", `${name}.ts`)]: `import type { InvoiceRepository } from "../ports/invoice-repository.js";

export interface ${pascal}Input {
  // TODO: define after the spec is agreed
}

/** Spec: specs/${name}.md */
export class ${pascal} {
  constructor(private readonly invoices: InvoiceRepository) {}

  async execute(_input: ${pascal}Input): Promise<void> {
    throw new Error("NOT_IMPLEMENTED: write the spec and tests first (see AGENTS.md)");
  }
}
`,
};

for (const path of Object.keys(files)) {
  if (existsSync(path)) {
    console.error(`✖ ${path} already exists — refusing to overwrite.`);
    process.exit(1);
  }
}
for (const [path, content] of Object.entries(files)) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content);
  console.log(`  created ${path}`);
}

console.log(`
Next steps (the spec-first workflow):
  1. Fill in specs/${name}.md — concrete Given/When/Then criteria.
  2. Get the contract agreed (human reads and approves the criteria).
  3. Human grants test edits:  mkdir -p .agent && touch .agent/allow-test-edits
  4. Replace the it.todo stubs with real tests, one per criterion.
  5. Implement: domain first, then the use case, then adapters.
  6. Remove the override:      rm .agent/allow-test-edits
  7. npm run verify — the spec-coverage check will hold you to all of this.
`);
