"use client";

import { useQuery } from "@tanstack/react-query";

import { DocumentUploadField } from "@/components/document-upload-field";
import { workforceQueries, type WorkforceDocumentOnFile } from "@/lib/api";

import type { UploadStatusMap } from "../uploads";

const IMAGE_OR_PDF = "Image or PDF";

const DOCUMENT_FIELDS = [
  {
    name: "employeeNationalIdFront",
    label: "Employee national ID — front",
    hint: IMAGE_OR_PDF,
    owner: "person",
    kind: "national_id_front",
  },
  {
    name: "employeeNationalIdBack",
    label: "Employee national ID — back",
    hint: IMAGE_OR_PDF,
    owner: "person",
    kind: "national_id_back",
  },
  {
    name: "cosignerNationalIdFront",
    label: "Cosigner national ID — front",
    hint: IMAGE_OR_PDF,
    owner: "cosigner",
    kind: "national_id_front",
  },
  {
    name: "cosignerNationalIdBack",
    label: "Cosigner national ID — back",
    hint: IMAGE_OR_PDF,
    owner: "cosigner",
    kind: "national_id_back",
  },
  {
    name: "cosignerWorkplaceIdFront",
    label: "Cosigner workplace ID — front",
    hint: IMAGE_OR_PDF,
    owner: "cosigner",
    kind: "workplace_id_front",
  },
  {
    name: "cosignerWorkplaceIdBack",
    label: "Cosigner workplace ID — back",
    hint: IMAGE_OR_PDF,
    owner: "cosigner",
    kind: "workplace_id_back",
  },
  {
    name: "contractFile",
    label: "Signed contract file",
    hint: "Scanned agreement or signed PDF",
    owner: "contract",
    kind: "employment_contract",
  },
] as const;

function onFile(rows: WorkforceDocumentOnFile[] | undefined, kind: string) {
  const row = rows?.find((entry) => entry.document.kind === kind);
  return row ? { url: row.downloadUrl, contentType: row.document.contentType } : null;
}

export function ContractDocuments({
  personId,
  cosignerId,
  contractId,
  uploadStates,
}: {
  personId: string | null;
  cosignerId: string | null;
  contractId: string | null;
  uploadStates: UploadStatusMap;
}) {
  const personDocs = useQuery({
    ...workforceQueries.documents({ personId: personId ?? "" }),
    enabled: Boolean(personId),
  });
  const cosignerDocs = useQuery({
    ...workforceQueries.documents({ cosignerId: cosignerId ?? "" }),
    enabled: Boolean(cosignerId),
  });
  const contractDocs = useQuery({
    ...workforceQueries.documents({ employmentContractId: contractId ?? "" }),
    enabled: Boolean(contractId),
  });
  const rowsByOwner = {
    person: personDocs.data,
    cosigner: cosignerDocs.data,
    contract: contractDocs.data,
  } as const;

  return (
    <fieldset className="border-t border-border pt-6">
      <legend className="text-strong mb-1 text-sm font-bold">Private documents</legend>
      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
        Files upload directly to private cloud storage. JPG, PNG, WebP, and PDF files are accepted
        up to 10 MB; profile photos accept images up to 5 MB.
      </p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <DocumentUploadField
          name="employeeProfilePhoto"
          label="Employee profile photo"
          hint="Optional new profile image"
          imagesOnly
          current={onFile(rowsByOwner.person, "profile_photo")}
          upload={uploadStates.employeeProfilePhoto ?? null}
        />
        {DOCUMENT_FIELDS.map((field) => (
          <DocumentUploadField
            key={field.name}
            name={field.name}
            label={field.label}
            hint={field.hint}
            current={onFile(rowsByOwner[field.owner], field.kind)}
            upload={uploadStates[field.name] ?? null}
          />
        ))}
      </div>
    </fieldset>
  );
}
