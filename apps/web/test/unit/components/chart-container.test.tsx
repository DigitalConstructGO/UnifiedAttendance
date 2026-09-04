import { render } from "@testing-library/react";
import { Bar, BarChart } from "recharts";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChartContainer } from "@/components/ui/chart";

const CONFIG = { value: { label: "Value", color: "var(--chart-1)" } };

function renderChart() {
  return render(
    <ChartContainer config={CONFIG} className="h-56 w-full">
      <BarChart data={[{ label: "Jan", value: 10 }]}>
        <Bar dataKey="value" />
      </BarChart>
    </ChartContainer>,
  );
}

describe("ChartContainer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("mounts without recharts' zero-dimension warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    renderChart();

    const dimensionWarnings = warn.mock.calls.filter((call) =>
      String(call[0]).includes("should be greater than 0"),
    );
    expect(dimensionWarnings).toEqual([]);
  });
});
