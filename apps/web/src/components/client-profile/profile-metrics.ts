import type { InvoiceRow } from "@/lib/api";

function toMinorUnits(value: string) {
  const [whole = "0", fraction = ""] = value.split(".");
  return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0").slice(0, 2));
}

function fromMinorUnits(value: bigint) {
  const whole = value / BigInt(100);
  const fraction = String(value % BigInt(100)).padStart(2, "0");
  return `${whole}.${fraction}`;
}

export function summarizeClientBilling(invoices: InvoiceRow[]) {
  const currencies = [...new Set(invoices.map(({ invoice }) => invoice.currency))];
  if (currencies.length !== 1) {
    return {
      currency: null,
      collected: null,
      outstanding: null,
      lifetime: null,
      currencyCount: currencies.length,
    };
  }

  const currency = currencies[0]!;
  const collectedMinor = invoices.reduce(
    (total, row) => total + toMinorUnits(row.paymentSummary.paidAmount),
    BigInt(0),
  );
  const outstandingMinor = invoices.reduce(
    (total, row) =>
      row.invoice.lifecycleStatus === "issued"
        ? total + toMinorUnits(row.paymentSummary.outstandingAmount)
        : total,
    BigInt(0),
  );

  return {
    currency,
    collected: fromMinorUnits(collectedMinor),
    outstanding: fromMinorUnits(outstandingMinor),
    lifetime: fromMinorUnits(collectedMinor),
    currencyCount: 1,
  };
}
