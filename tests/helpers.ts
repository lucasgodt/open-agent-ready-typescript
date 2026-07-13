import type { Clock } from "../src/application/ports/clock.js";
import type { IdGenerator } from "../src/application/ports/id-generator.js";

export function fixedClock(iso: string): Clock {
  return { now: () => new Date(iso) };
}

export function sequentialIds(prefix = "inv"): IdGenerator {
  let n = 0;
  return { next: () => `${prefix}-${++n}` };
}
