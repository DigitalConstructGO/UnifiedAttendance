import { Input } from "@/components/ui/input";
import type { EmploymentContractRow } from "@/lib/api";

import { Field, inputClass } from "../fields";

export function CosignerFields({ editing }: { editing: EmploymentContractRow | null }) {
  return (
    <fieldset className="grid gap-x-4 gap-y-5 border-t border-border pt-6 md:grid-cols-2 xl:grid-cols-3">
      <legend className="text-strong mb-4 text-sm font-bold">Required cosigner details</legend>
      <Field label="Full name">
        <Input
          required
          name="cosignerFullName"
          defaultValue={editing?.cosigner.fullName}
          autoComplete="name"
          className={inputClass}
        />
      </Field>
      <Field label="Phone">
        <Input
          required
          type="tel"
          name="cosignerPhone"
          defaultValue={editing?.cosigner.phone ?? ""}
          autoComplete="tel"
          className={inputClass}
        />
      </Field>
      <Field label="Workplace">
        <Input
          required
          name="cosignerWorkplace"
          defaultValue={editing?.cosigner.workplace ?? ""}
          className={inputClass}
        />
      </Field>
    </fieldset>
  );
}
