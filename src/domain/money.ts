import { InvalidMoneyError } from "./errors.js";

/**
 * Money is stored as integer cents to avoid floating-point drift.
 * Instances are immutable; every operation returns a new Money.
 */
export class Money {
  private constructor(
    readonly cents: number,
    readonly currency: string,
  ) {}

  static of(cents: number, currency: string): Money {
    if (!Number.isSafeInteger(cents)) {
      throw new InvalidMoneyError(`amount must be an integer number of cents, got ${cents}`);
    }
    if (cents < 0) {
      throw new InvalidMoneyError(`amount must not be negative, got ${cents}`);
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new InvalidMoneyError(`currency must be a 3-letter ISO code, got "${currency}"`);
    }
    return new Money(cents, currency);
  }

  static zero(currency: string): Money {
    return Money.of(0, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.of(this.cents + other.cents, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.of(this.cents - other.cents, this.currency);
  }

  multiply(factor: number): Money {
    if (!Number.isSafeInteger(factor) || factor < 0) {
      throw new InvalidMoneyError(`multiplier must be a non-negative integer, got ${factor}`);
    }
    return Money.of(this.cents * factor, this.currency);
  }

  equals(other: Money): boolean {
    return this.cents === other.cents && this.currency === other.currency;
  }

  isZero(): boolean {
    return this.cents === 0;
  }

  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.cents > other.cents;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new InvalidMoneyError(
        `cannot operate on different currencies: ${this.currency} and ${other.currency}`,
      );
    }
  }
}
