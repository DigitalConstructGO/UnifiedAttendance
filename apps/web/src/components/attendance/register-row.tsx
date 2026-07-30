import type { RegisterRow as Row } from "./register-model";
import {
  avatarTone,
  formatTime,
  registerStatus,
  scheduleLabel,
  STATUS_META,
} from "./register-presentation";

function checkInClass(row: Row, isLate: boolean) {
  if (isLate) return "text-amber-700 dark:text-warning";
  return row.day.firstIn ? "text-info" : "text-muted-foreground";
}

export function RegisterTableRow({
  row,
  departmentNames,
  timeZone,
  onSelect,
}: {
  row: Row;
  departmentNames: Map<string, string>;
  timeZone: string;
  onSelect: (employeeId: string) => void;
}) {
  const status = registerStatus(row);
  const meta = STATUS_META[status];
  const fullName = `${row.person.firstName} ${row.person.lastName}`;

  return (
    <tr className="border-t border-border hover:bg-muted/40">
      <td className="px-5 py-3">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-[9px] text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onSelect(row.employee.id)}
          aria-label={`Inspect attendance for ${fullName}`}
        >
          <span
            className={`grid size-9 shrink-0 place-items-center rounded-[9px] text-xs font-bold ${avatarTone(fullName)}`}
            aria-hidden="true"
          >
            {row.person.firstName[0]}
            {row.person.lastName[0]}
          </span>
          <span className="min-w-0">
            <span className="text-strong block truncate font-bold">{fullName}</span>
            <span className="block truncate text-[0.6875rem] text-muted-foreground">
              {row.employee.employeeCode}
            </span>
          </span>
        </button>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {row.period.departmentId
          ? (departmentNames.get(row.period.departmentId) ?? "Department unavailable")
          : "—"}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {scheduleLabel(row.period.employmentType)}
      </td>
      <td className={`px-4 py-3 font-numeric font-bold ${checkInClass(row, status === "late")}`}>
        {formatTime(row.day.firstIn, timeZone)}
      </td>
      <td className="px-4 py-3 font-numeric font-bold text-muted-foreground">
        {formatTime(row.day.lastOut, timeZone)}
      </td>
      <td className="px-4 py-3">
        <span className={`rounded-md px-2.5 py-1 text-[0.6875rem] font-bold ${meta.badgeClass}`}>
          {meta.label}
        </span>
      </td>
    </tr>
  );
}
