export function moneyToMinor(value: string) {
  const [whole = "0", fraction = ""] = value.split(".");
  return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0").slice(0, 2));
}

export function minorToMoney(value: bigint) {
  const whole = value / BigInt(100);
  const fraction = String(value % BigInt(100)).padStart(2, "0");
  return `${whole}.${fraction}`;
}

export type MoneyBreakdown = {
  currency: string;
  amount: string;
};

export type MoneyMeasure = {
  amount: string | null;
  currency: string | null;
  breakdown: MoneyBreakdown[];
};

export function moneyMeasure(totals: Map<string, bigint>): MoneyMeasure {
  const breakdown = [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, amount]) => ({ currency, amount: minorToMoney(amount) }));

  if (breakdown.length === 1) {
    return {
      amount: breakdown[0]!.amount,
      currency: breakdown[0]!.currency,
      breakdown,
    };
  }

  return {
    amount: breakdown.length === 0 ? "0.00" : null,
    currency: null,
    breakdown,
  };
}

export function addCurrencyAmount(totals: Map<string, bigint>, currency: string, amount: string) {
  totals.set(currency, (totals.get(currency) ?? BigInt(0)) + moneyToMinor(amount));
}
