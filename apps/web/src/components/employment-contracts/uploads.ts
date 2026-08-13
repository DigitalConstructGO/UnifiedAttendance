import type { UploadFieldStatus } from "@/components/document-upload-field";
import { type EmploymentContractRow, workforceApi } from "@/lib/api";

type DocumentOwner = Parameters<typeof workforceApi.uploadDocument>[0];
type DocumentKind = Parameters<typeof workforceApi.uploadDocument>[1];

type PendingUpload = {
  /** The form input's name — the per-card key the UI tracks progress under. */
  field: string;
  file: File;
  owner: DocumentOwner;
  kind: DocumentKind;
  label: string;
};

export type { UploadFieldStatus };
export type UploadStatusMap = Record<string, UploadFieldStatus>;

function selectedFile(data: FormData, name: string) {
  const value = data.get(name);
  return value instanceof File && value.size > 0 ? value : null;
}

async function runUploads(
  uploads: PendingUpload[],
  onStatus: (field: string, status: UploadFieldStatus) => void,
) {
  const results = await Promise.all(
    uploads.map(async (upload) => {
      const fileName = upload.file.name;
      onStatus(upload.field, { fileName, percent: 0, state: "uploading" });
      try {
        await workforceApi.uploadDocument(upload.owner, upload.kind, upload.file, (fraction) =>
          onStatus(upload.field, {
            fileName,
            percent: Math.round(fraction * 100),
            state: "uploading",
          }),
        );
        onStatus(upload.field, { fileName, percent: 100, state: "done" });
        return null;
      } catch (error) {
        const reason = error instanceof Error ? error.message : "the upload failed";
        onStatus(upload.field, { fileName, percent: 0, state: "failed", reason });
        return `${upload.label} (${fileName}) — ${reason}`;
      }
    }),
  );
  return results.filter((failure): failure is string => failure !== null);
}

export async function uploadContractDocuments(
  data: FormData,
  row: EmploymentContractRow,
  onStatus: (field: string, status: UploadFieldStatus) => void,
) {
  const person = { personId: row.person.id };
  const cosigner = { cosignerId: row.cosigner.id };
  const candidates: Array<Omit<PendingUpload, "file"> & { file: File | null }> = [
    {
      field: "employeeProfilePhoto",
      file: selectedFile(data, "employeeProfilePhoto"),
      owner: person,
      kind: "profile_photo",
      label: "employee profile photo",
    },
    {
      field: "employeeNationalIdFront",
      file: selectedFile(data, "employeeNationalIdFront"),
      owner: person,
      kind: "national_id_front",
      label: "employee national ID front",
    },
    {
      field: "employeeNationalIdBack",
      file: selectedFile(data, "employeeNationalIdBack"),
      owner: person,
      kind: "national_id_back",
      label: "employee national ID back",
    },
    {
      field: "cosignerNationalIdFront",
      file: selectedFile(data, "cosignerNationalIdFront"),
      owner: cosigner,
      kind: "national_id_front",
      label: "cosigner national ID front",
    },
    {
      field: "cosignerNationalIdBack",
      file: selectedFile(data, "cosignerNationalIdBack"),
      owner: cosigner,
      kind: "national_id_back",
      label: "cosigner national ID back",
    },
    {
      field: "cosignerWorkplaceIdFront",
      file: selectedFile(data, "cosignerWorkplaceIdFront"),
      owner: cosigner,
      kind: "workplace_id_front",
      label: "cosigner workplace ID front",
    },
    {
      field: "cosignerWorkplaceIdBack",
      file: selectedFile(data, "cosignerWorkplaceIdBack"),
      owner: cosigner,
      kind: "workplace_id_back",
      label: "cosigner workplace ID back",
    },
    {
      field: "contractFile",
      file: selectedFile(data, "contractFile"),
      owner: { employmentContractId: row.contract.id },
      kind: "employment_contract",
      label: "signed contract file",
    },
  ];

  return runUploads(
    candidates.filter((upload): upload is PendingUpload => Boolean(upload.file)),
    onStatus,
  );
}

export async function uploadCosignerDocuments(
  data: FormData,
  cosignerId: string,
  onStatus: (field: string, status: UploadFieldStatus) => void,
) {
  const fields = [
    ["cosignerNationalIdFront", "national_id_front", "national ID front"],
    ["cosignerNationalIdBack", "national_id_back", "national ID back"],
    ["cosignerWorkplaceIdFront", "workplace_id_front", "workplace ID front"],
    ["cosignerWorkplaceIdBack", "workplace_id_back", "workplace ID back"],
  ] as const;

  const uploads = fields.flatMap(([name, kind, label]) => {
    const file = selectedFile(data, name);
    return file ? [{ field: name, file, owner: { cosignerId }, kind, label }] : [];
  });

  return runUploads(uploads, onStatus);
}
