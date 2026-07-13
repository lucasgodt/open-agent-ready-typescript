#!/usr/bin/env node
/**
 * Guardrail #5, mechanized: spec-driven development as a build gate.
 *
 * Enforces, in three directions:
 *   1. Every use case in src/application/use-cases/ has a spec in specs/
 *      with the same name.
 *   2. Every spec (except _TEMPLATE.md) has a matching use-case file —
 *      no orphan specs describing behavior that doesn't exist.
 *   3. Every numbered acceptance criterion in a spec has a mirrored test:
 *      an `it("N. ...")` inside a `describe("spec: <name>")` block, same
 *      numbers, no gaps, no extras.
 *
 * Runs in `npm run verify` → therefore in the commit hook and CI.
 * No dependencies; parsing relies on the conventions AGENTS.md mandates.
 */
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

const USE_CASES_DIR = "src/application/use-cases";
const SPECS_DIR = "specs";
const TESTS_DIR = "tests";

const errors = [];

// ── collect ────────────────────────────────────────────────────
const useCases = readdirSync(USE_CASES_DIR)
  .filter((f) => f.endsWith(".ts"))
  .map((f) => basename(f, ".ts"));

const specs = readdirSync(SPECS_DIR)
  .filter((f) => f.endsWith(".md") && f !== "_TEMPLATE.md")
  .map((f) => basename(f, ".md"));

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}
const testContent = walk(TESTS_DIR)
  .filter((f) => f.endsWith(".test.ts"))
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");

// ── 1 & 2: use case ↔ spec, both directions ───────────────────
for (const uc of useCases) {
  if (!specs.includes(uc)) {
    errors.push(
      `use case "${uc}" has no spec. Create specs/${uc}.md from specs/_TEMPLATE.md BEFORE implementing.`,
    );
  }
}
for (const spec of specs) {
  if (!useCases.includes(spec)) {
    errors.push(
      `spec "${spec}" has no use case (orphan). Implement src/application/use-cases/${spec}.ts or remove the spec.`,
    );
  }
}

// ── 3: acceptance criteria ↔ mirrored its ─────────────────────
function criteriaNumbers(specName) {
  const content = readFileSync(join(SPECS_DIR, `${specName}.md`), "utf8");
  const section = content.split(/^## Acceptance criteria$/m)[1]?.split(/^## /m)[0];
  if (!section) return null;
  return [...section.matchAll(/^(\d+)\.\s/gm)].map((m) => Number(m[1]));
}

function mirroredItNumbers(specName) {
  const marker = `describe("spec: ${specName}"`;
  const start = testContent.indexOf(marker);
  if (start === -1) return null;
  const rest = testContent.slice(start + marker.length);
  const nextDescribe = rest.indexOf('describe("spec: ');
  const block = nextDescribe === -1 ? rest : rest.slice(0, nextDescribe);
  return [...block.matchAll(/\bit\(\s*["'`](\d+)\./g)].map((m) => Number(m[1]));
}

for (const spec of specs) {
  const criteria = criteriaNumbers(spec);
  if (criteria === null || criteria.length === 0) {
    errors.push(`spec "${spec}" has no "## Acceptance criteria" section with numbered criteria.`);
    continue;
  }
  const its = mirroredItNumbers(spec);
  if (its === null) {
    errors.push(
      `spec "${spec}" has no mirrored test block. Add describe("spec: ${spec}", ...) with one it("N. ...") per criterion.`,
    );
    continue;
  }
  const missing = criteria.filter((n) => !its.includes(n));
  const extra = its.filter((n) => !criteria.includes(n));
  if (missing.length > 0) {
    errors.push(`spec "${spec}": criteria [${missing.join(", ")}] have no mirrored it("N. ...").`);
  }
  if (extra.length > 0) {
    errors.push(
      `spec "${spec}": tests [${extra.join(", ")}] mirror criteria that don't exist in the spec. Update the spec first — it is the contract.`,
    );
  }
}

// ── report ─────────────────────────────────────────────────────
if (errors.length > 0) {
  console.error("✖ spec-driven development check failed:\n");
  for (const e of errors) console.error(`  - ${e}`);
  console.error(
    "\nThe workflow is: spec → mirrored tests → implementation. See AGENTS.md.",
  );
  console.error(
    "Note: it.todo stubs do not count as mirrored — by design, the gate stays red until the contract is fulfilled (real tests) or the scaffolding is reverted.",
  );
  process.exit(1);
}
console.log(
  `✔ spec coverage: ${useCases.length} use cases ↔ ${specs.length} specs, all criteria mirrored`,
);
