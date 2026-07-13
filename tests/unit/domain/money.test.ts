import { describe, expect, it } from "vitest";
import { InvalidMoneyError } from "../../../src/domain/errors.js";
import { Money } from "../../../src/domain/money.js";

describe("Money", () => {
  it("stores integer cents and a 3-letter currency", () => {
    const m = Money.of(1990, "BRL");
    expect(m.cents).toBe(1990);
    expect(m.currency).toBe("BRL");
  });

  it("rejects non-integer, negative and unsafe amounts", () => {
    expect(() => Money.of(19.9, "BRL")).toThrow(InvalidMoneyError);
    expect(() => Money.of(-1, "BRL")).toThrow(InvalidMoneyError);
    expect(() => Money.of(Number.MAX_SAFE_INTEGER + 1, "BRL")).toThrow(InvalidMoneyError);
  });

  it("rejects invalid currency codes", () => {
    expect(() => Money.of(100, "br")).toThrow(InvalidMoneyError);
    expect(() => Money.of(100, "REAL")).toThrow(InvalidMoneyError);
  });

  it("adds, subtracts and multiplies immutably", () => {
    const a = Money.of(100, "USD");
    const b = Money.of(50, "USD");
    expect(a.add(b).cents).toBe(150);
    expect(a.subtract(b).cents).toBe(50);
    expect(a.multiply(3).cents).toBe(300);
    expect(a.cents).toBe(100); // original untouched
  });

  it("refuses cross-currency arithmetic", () => {
    expect(() => Money.of(1, "USD").add(Money.of(1, "BRL"))).toThrow(InvalidMoneyError);
  });
});

describe("Money guards and predicates", () => {
  it("zero() is zero in the right currency", () => {
    const z = Money.zero("EUR");
    expect(z.isZero()).toBe(true);
    expect(z.currency).toBe("EUR");
  });

  it("isZero is false for non-zero amounts", () => {
    expect(Money.of(1, "EUR").isZero()).toBe(false);
  });

  it("isGreaterThan compares within the same currency only", () => {
    expect(Money.of(2, "EUR").isGreaterThan(Money.of(1, "EUR"))).toBe(true);
    expect(Money.of(1, "EUR").isGreaterThan(Money.of(1, "EUR"))).toBe(false);
    expect(() => Money.of(1, "EUR").isGreaterThan(Money.of(1, "USD"))).toThrow(InvalidMoneyError);
  });

  it("multiply rejects negative and fractional factors", () => {
    expect(() => Money.of(100, "EUR").multiply(-1)).toThrow(InvalidMoneyError);
    expect(() => Money.of(100, "EUR").multiply(1.5)).toThrow(InvalidMoneyError);
  });

  it("subtract below zero is rejected (Money is never negative)", () => {
    expect(() => Money.of(1, "EUR").subtract(Money.of(2, "EUR"))).toThrow(InvalidMoneyError);
  });
});
