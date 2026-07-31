import { describe, expect, it } from "vitest";

import { summarizeClientBilling } from "@/components/client-profile/profile-metrics";

import type { InvoiceRow } from "@/lib/api";

function invoice(
  currency: string,
  lifecycleStatus: "draft" | "issued" | "void",
  paidAmount: string,
  outstandingAmount: string,
) {
  return {
    invoice: { currency, lifecycleStatus },
    paymentSummary: { paidAmount, outstandingAmount },
  } as InvoiceRow;
}

describe("summarizeClientBilling", () => {
  it("totals paid revenue and issued outstanding amounts without floating-point loss", () => {
    const summary = summarizeClientBilling([
      invoice("ETB", "issued", "120.15", "79.85"),
      invoice("ETB", "issued", "0.10", "49.90"),
      invoice("ETB", "draft", "0.00", "900.00"),
    ]);

    expect(summary).toEqual({
      currency: "ETB",
      collected: "120.25",
      outstanding: "129.75",
      lifetime: "120.25",
      currencyCount: 1,
    });
  });

  it("does not create a misleading total across currencies", () => {
    const summary = summarizeClientBilling([
      invoice("ETB", "issued", "100.00", "0.00"),
      invoice("USD", "issued", "25.00", "10.00"),
    ]);

    expect(summary).toEqual({
      currency: null,
      collected: null,
      outstanding: null,
      lifetime: null,
      currencyCount: 2,
    });
  });

  it("returns an empty summary when the client has no invoices", () => {
    expect(summarizeClientBilling([])).toEqual({
      currency: null,
      collected: null,
      outstanding: null,
      lifetime: null,
      currencyCount: 0,
    });
  });
});
