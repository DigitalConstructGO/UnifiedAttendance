import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ContractTable } from "@/components/employment-contracts/contract-table";
import type { EmploymentContractRow } from "@/lib/api";

const row = {
  contract: {
    id: "c1",
    contractNumber: "1240",
    notes: null,
    signedOn: null,
    startsOn: "2026-01-01",
    endsOn: null,
    status: "draft",
  },
  employee: { id: "e1", employeeCode: "EX-HQ-0001" },
  person: { firstName: "Abel", lastName: "Tesfaye" },
  period: { employmentType: "full_time" },
  department: null,
  position: null,
  cosigner: { id: "k1", fullName: "Sara Alemu", phone: null, workplace: null },
} as unknown as EmploymentContractRow;

function renderTable(contracts: EmploymentContractRow[]) {
  return render(
    <ContractTable
      contracts={contracts}
      manageable={false}
      busy={false}
      onEdit={() => {}}
      onDelete={() => {}}
    />,
  );
}

describe("ContractTable", () => {
  afterEach(cleanup);

  it("shows rows that arrive after an initially empty render", () => {
    const view = renderTable([]);
    expect(screen.getByText(/Showing 0 of 0/)).toBeInTheDocument();

    view.rerender(
      <ContractTable
        contracts={[row]}
        manageable={false}
        busy={false}
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );

    expect(screen.getAllByText("1240").length).toBeGreaterThan(0);
    expect(screen.getByText(/Showing 1 of 1/)).toBeInTheDocument();
  });
});
