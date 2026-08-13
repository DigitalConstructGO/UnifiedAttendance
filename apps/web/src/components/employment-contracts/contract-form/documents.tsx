import { DocumentUploadField } from "@/components/document-upload-field";

const IMAGE_OR_PDF = "Image or PDF";

const DOCUMENT_FIELDS = [
  { name: "employeeNationalIdFront", label: "Employee national ID — front", hint: IMAGE_OR_PDF },
  { name: "employeeNationalIdBack", label: "Employee national ID — back", hint: IMAGE_OR_PDF },
  { name: "cosignerNationalIdFront", label: "Cosigner national ID — front", hint: IMAGE_OR_PDF },
  { name: "cosignerNationalIdBack", label: "Cosigner national ID — back", hint: IMAGE_OR_PDF },
  { name: "cosignerWorkplaceIdFront", label: "Cosigner workplace ID — front", hint: IMAGE_OR_PDF },
  { name: "cosignerWorkplaceIdBack", label: "Cosigner workplace ID — back", hint: IMAGE_OR_PDF },
  { name: "contractFile", label: "Signed contract file", hint: "Scanned agreement or signed PDF" },
] as const;

export function ContractDocuments() {
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
        />
        {DOCUMENT_FIELDS.map((field) => (
          <DocumentUploadField
            key={field.name}
            name={field.name}
            label={field.label}
            hint={field.hint}
          />
        ))}
      </div>
    </fieldset>
  );
}
