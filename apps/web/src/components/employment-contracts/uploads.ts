import { type EmploymentContractRow, workforceApi } from "@/lib/api";

type DocumentOwner = Parameters<typeof workforceApi.uploadDocument>[0];
type DocumentKind = Parameters<typeof workforceApi.uploadDocument>[1];

type PendingUpload = { file: File; owner: DocumentOwner; kind: DocumentKind; label: string };

function selectedFile(data: FormData, name: string) {
  const value = data.get(name);
  return value instanceof File && value.size > 0 ? value : null;
}


async function runUploads(uploads: PendingUpload[], onProgress: (message: string) => void) {
  const failures: string[] = [];
  for (const [index, upload] of uploads.entries()) {
    onProgress(`Uploading ${index + 1} of ${uploads.length}: ${upload.label}…`);
    try {
      await workforceApi.uploadDocument(upload.owner, upload.kind, upload.file);
    } catch {
      failures.push(upload.label);
    }
  }
  return failures;
}

export async function uploadContractDocuments(
  data: FormData,
  row: EmploymentContractRow,
  onProgress: (message: string) => void,
) {
  const person = { personId: row.person.id };
  const cosigner = { cosignerId: row.cosigner.id };
  const candidates: Array<Omit<PendingUpload, "file"> & { file: File | null }> = [
    {
      file: selectedFile(data, "employeeProfilePhoto"),
      owner: person,
      kind: "profile_photo",
      label: "employee profile photo",
    },
    {
      file: selectedFile(data, "employeeNationalIdFront"),
      owner: person,
      kind: "national_id_front",
      label: "employee national ID front",
    },
    {
      file: selectedFile(data, "employeeNationalIdBack"),
      owner: person,
      kind: "national_id_back",
      label: "employee national ID back",
    },
    {
      file: selectedFile(data, "cosignerNationalIdFront"),
      owner: cosigner,
      kind: "national_id_front",
      label: "cosigner national ID front",
    },
    {
      file: selectedFile(data, "cosignerNationalIdBack"),
      owner: cosigner,
      kind: "national_id_back",
      label: "cosigner national ID back",
    },
    {
      file: selectedFile(data, "cosignerWorkplaceIdFront"),
      owner: cosigner,
      kind: "workplace_id_front",
      label: "cosigner workplace ID front",
    },
    {
      file: selectedFile(data, "cosignerWorkplaceIdBack"),
      owner: cosigner,
      kind: "workplace_id_back",
      label: "cosigner workplace ID back",
    },
    {
      file: selectedFile(data, "contractFile"),
      owner: { employmentContractId: row.contract.id },
      kind: "employment_contract",
      label: "signed contract file",
    },
  ];

  return runUploads(
    candidates.filter((upload): upload is PendingUpload => Boolean(upload.file)),
    onProgress,
  );
}

export async function uploadCosignerDocuments(
  data: FormData,
  cosignerId: string,
  onProgress: (message: string) => void,
) {
  const fields = [
    ["cosignerNationalIdFront", "national_id_front", "national ID front"],
    ["cosignerNationalIdBack", "national_id_back", "national ID back"],
    ["cosignerWorkplaceIdFront", "workplace_id_front", "workplace ID front"],
    ["cosignerWorkplaceIdBack", "workplace_id_back", "workplace ID back"],
  ] as const;

  const uploads = fields.flatMap(([name, kind, label]) => {
    const file = selectedFile(data, name);
    return file ? [{ file, owner: { cosignerId }, kind, label }] : [];
  });

  return runUploads(uploads, onProgress);
}
