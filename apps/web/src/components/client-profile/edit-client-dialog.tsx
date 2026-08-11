"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";

import { Input } from "@/components/ui/input";
import { clientKeys, clientQueries, clientsApi } from "@/lib/api";
import { CLIENT_PRIORITIES, type ClientPriority } from "@/lib/client-presentation";
import { presentRequestError } from "@/lib/errors";

import { DialogField, dialogFieldClass, RecordDialog } from "../client-agreements/record-dialog";

type EditableClient = {
  id: string;
  legalName: string;
  tradingName: string | null;
  tin: string | null;
  vatNumber: string | null;
  registrationNumber: string | null;
  businessLicenseNumber: string | null;
  priority: ClientPriority | null;
  industry: string;
  clientType: string;
};

function optionalValue(data: FormData, name: string) {
  const value = String(data.get(name) ?? "").trim();
  return value || null;
}

export function EditClientDialog({
  client,
  onClose,
}: {
  client: EditableClient;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const industriesQuery = useQuery(clientQueries.industries());
  const clientTypesQuery = useQuery(clientQueries.clientTypes());
  const industries = (industriesQuery.data ?? []).filter((row) => row.status === "active");
  const clientTypes = (clientTypesQuery.data ?? []).filter((row) => row.status === "active");

  const updateClient = useMutation({
    mutationFn: clientsApi.update,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clientKeys.all });
      onClose();
    },
  });

  return (
    <RecordDialog
      title="Edit company details"
      description="Registration, tax and identity fields for this client"
      icon={<Pencil className="size-5" />}
      busy={updateClient.isPending}
      submitLabel="Save changes"
      error={
        updateClient.error
          ? presentRequestError(updateClient.error, "Could not save these details.")
          : null
      }
      onClose={onClose}
      onSubmit={(form) => {
        const data = new FormData(form);
        const priority = String(data.get("priority") ?? "").trim();

        updateClient.mutate({
          id: client.id,
          legalName: String(data.get("legalName") ?? "").trim(),
          tradingName: optionalValue(data, "tradingName"),
          tin: optionalValue(data, "tin"),
          vatNumber: optionalValue(data, "vatNumber"),
          registrationNumber: optionalValue(data, "registrationNumber"),
          businessLicenseNumber: optionalValue(data, "businessLicenseNumber"),
          industry: String(data.get("industry") ?? "").trim(),
          clientType: String(data.get("clientType") ?? "").trim(),
          priority: priority ? (priority as ClientPriority) : null,
        });
      }}
    >
      <DialogField label="Legal company name">
        <Input required name="legalName" defaultValue={client.legalName} />
      </DialogField>

      <div className="grid gap-4 sm:grid-cols-2">
        <DialogField label="Trading name">
          <Input name="tradingName" defaultValue={client.tradingName ?? ""} />
        </DialogField>
        <DialogField label="TIN">
          <Input name="tin" defaultValue={client.tin ?? ""} />
        </DialogField>
        <DialogField label="VAT number">
          <Input name="vatNumber" defaultValue={client.vatNumber ?? ""} />
        </DialogField>
        <DialogField label="Registration no.">
          <Input name="registrationNumber" defaultValue={client.registrationNumber ?? ""} />
        </DialogField>
        <DialogField label="Business licence">
          <Input name="businessLicenseNumber" defaultValue={client.businessLicenseNumber ?? ""} />
        </DialogField>
        <DialogField label="Industry">
          <Input
            required
            name="industry"
            list="edit-client-industries"
            defaultValue={client.industry}
            autoComplete="off"
          />
          <datalist id="edit-client-industries">
            {industries.map((industry) => (
              <option key={industry.id} value={industry.name} />
            ))}
          </datalist>
        </DialogField>
        <DialogField label="Client type">
          <Input
            required
            name="clientType"
            list="edit-client-types"
            defaultValue={client.clientType}
            autoComplete="off"
          />
          <datalist id="edit-client-types">
            {clientTypes.map((clientType) => (
              <option key={clientType.id} value={clientType.name} />
            ))}
          </datalist>
        </DialogField>
      </div>

      <DialogField label="Priority">
        <select name="priority" className={dialogFieldClass} defaultValue={client.priority ?? ""}>
          <option value="">Not set</option>
          {CLIENT_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </option>
          ))}
        </select>
      </DialogField>
    </RecordDialog>
  );
}
