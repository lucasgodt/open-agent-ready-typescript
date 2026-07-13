/** Port for identity generation, so use cases stay deterministic in tests. */
export interface IdGenerator {
  next(): string;
}
