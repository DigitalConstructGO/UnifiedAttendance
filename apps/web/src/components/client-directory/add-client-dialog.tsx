"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  clientKeys,
  clientQueries,
  clientsApi,
  organizationQueries,
  workforceQueries,
} from "@/lib/api";
import { personName } from "@/lib/client-presentation";
import { presentRequestError, type RequestErrorPresentation } from "@/lib/errors";

import { DialogField, dialogFieldClass, RecordDialog } from "../client-agreements/record-dialog";

function optionalValue(data: FormData, name: string) {
  const value = String(data.get(name) ?? "").trim();
  return value || null;
}

export function AddClientDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [branchId, setBranchId] = useState("");
  const [localError, setLocalError] = useState<RequestErrorPresentation | null>(null);

  const branchesQuery = useQuery(organizationQueries.branches());
  const industriesQuery = useQuery(clientQueries.industries());
  const clientTypesQuery = useQuery(clientQueries.clientTypes());
  // Owners are employees of the chosen branch, so this only runs once one is picked.
  const employeesQuery = useQuery(workforceQueries.employees(branchId));

  const branches = branchesQuery.data ?? [];
  const industries = (industriesQuery.data ?? []).filter((row) => row.status === "active");
  const clientTypes = (clientTypesQuery.data ?? []).filter((row) => row.status === "active");
  const employees = employeesQuery.data ?? [];

  useEffect(() => {
    if (!branchId && branches.length === 1) setBranchId(branches[0]!.id);
  }, [branchId, branches]);

  const createClient = useMutation({
    mutationFn: clientsApi.create,
    onSuccess: async ({ client }) => {
      await queryClient.invalidateQueries({ queryKey: clientKeys.all });
      onClose();
      router.push(`/dashboard/clients/${client.id}`);
    },
  });

  const error = localError
    ? localError
    : createClient.error
      ? presentRequestError(createClient.error, "Could not create this client.")
      : null;

  return (
    <RecordDialog
      title="Add client"
      description="Create a client record and assign its account owner"
      icon={<Building2 className="size-5" />}
      busy={createClient.isPending}
      submitLabel="Create client"
      error={error}
      onClose={onClose}
      onSubmit={(form) => {
        const data = new FormData(form);

        // The owner is typed as a name; it must resolve to a real employee.
        const ownerName = String(data.get("ownerName") ?? "").trim();
        const owner = employees.find(
          (row) => personName(row.person).toLowerCase() === ownerName.toLowerCase(),
        );
        if (!owner) {
          setLocalError({
            code: "OWNER_NOT_FOUND",
            message: `No employee named “${ownerName}” in this branch — pick one of the suggestions.`,
            retryable: false,
            fieldErrors: [],
          });
          return;
        }

        setLocalError(null);
        createClient.mutate({
          branchId: String(data.get("branchId") ?? ""),
          ownerEmployeeId: owner.employee.id,
          legalName: String(data.get("legalName") ?? "").trim(),
          tradingName: optionalValue(data, "tradingName"),
          industry: String(data.get("industry") ?? "").trim(),
          clientType: String(data.get("clientType") ?? "").trim(),
          phone: optionalValue(data, "phone"),
          email: optionalValue(data, "email"),
          tin: optionalValue(data, "tin"),
          vatNumber: optionalValue(data, "vatNumber"),
          registrationNumber: optionalValue(data, "registrationNumber"),
          businessLicenseNumber: optionalValue(data, "businessLicenseNumber"),
          ...(optionalValue(data, "relationshipStartedOn")
            ? { relationshipStartedOn: String(data.get("relationshipStartedOn")) }
            : {}),
        });
      }}
    >
      <DialogField label="Legal company name">
        <Input required name="legalName" placeholder="Commercial Bank of Ethiopia" />
      </DialogField>

      <div className="grid gap-4 sm:grid-cols-2">
        <DialogField label="Trading name">
          <Input name="tradingName" placeholder="Commercial" />
        </DialogField>

        <DialogField label="Branch">
          <select
            required
            name="branchId"
            className={dialogFieldClass}
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
          >
            <option value="">Select a branch</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </DialogField>

        <DialogField label="Account owner">
          <Input
            required
            name="ownerName"
            list="add-client-owners"
            disabled={!branchId}
            placeholder={branchId ? "Type the employee's name" : "Choose a branch first"}
            autoComplete="off"
          />
          <datalist id="add-client-owners">
            {employees.map((row) => (
              <option key={row.employee.id} value={personName(row.person)} />
            ))}
          </datalist>
        </DialogField>

        <DialogField label="Industry">
          <Input
            required
            name="industry"
            list="add-client-industries"
            placeholder="Banking"
            autoComplete="off"
          />
          <datalist id="add-client-industries">
            {industries.map((industry) => (
              <option key={industry.id} value={industry.name} />
            ))}
          </datalist>
        </DialogField>

        <DialogField label="Client type">
          <Input
            required
            name="clientType"
            list="add-client-types"
            placeholder="Corporate"
            autoComplete="off"
          />
          <datalist id="add-client-types">
            {clientTypes.map((clientType) => (
              <option key={clientType.id} value={clientType.name} />
            ))}
          </datalist>
        </DialogField>

        <DialogField label="Phone">
          <Input name="phone" type="tel" autoComplete="tel" />
        </DialogField>

        <DialogField label="Email">
          <Input name="email" type="email" autoComplete="email" />
        </DialogField>

        <DialogField label="TIN">
          <Input name="tin" />
        </DialogField>

        <DialogField label="VAT number">
          <Input name="vatNumber" />
        </DialogField>

        <DialogField label="Registration no.">
          <Input name="registrationNumber" />
        </DialogField>

        <DialogField label="Business licence">
          <Input name="businessLicenseNumber" />
        </DialogField>
      </div>

      <DialogField label="Client since">
        <Input name="relationshipStartedOn" type="date" className={dialogFieldClass} />
      </DialogField>
      <p className="-mt-2 text-xs text-muted-foreground">
        Leave blank to use today. The client code is generated automatically.
      </p>
    </RecordDialog>
  );
}
