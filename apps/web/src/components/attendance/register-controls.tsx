import { Input } from "@/components/ui/input";
import type { Branch } from "@/lib/api";

export function RegisterControls({
  branches,
  branchId,
  date,
  onBranchChange,
  onDateChange,
}: {
  branches: Branch[];
  branchId: string;
  date: string;
  onBranchChange: (branchId: string) => void;
  onDateChange: (date: string) => void;
}) {
  return (
    <section className="flex flex-wrap items-end justify-end gap-3" aria-label="Register controls">
      <label className="text-strong grid min-w-48 gap-1.5 text-xs font-bold">
        Branch
        <select
          className="h-10 rounded-[11px] border border-input bg-background px-3 text-xs font-normal outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
          value={branchId}
          onChange={(event) => onBranchChange(event.target.value)}
        >
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-strong grid gap-1.5 text-xs font-bold">
        Date
        <Input
          type="date"
          value={date}
          className="h-10 w-44 rounded-[11px] bg-background px-3 font-normal"
          onChange={(event) => onDateChange(event.target.value)}
        />
      </label>
    </section>
  );
}
