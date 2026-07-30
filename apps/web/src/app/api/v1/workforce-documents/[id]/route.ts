import {
  deleteWorkforceDocument,
  finalizeWorkforceDocument,
  getWorkforceDocument,
} from "@UnifiedAttendance/api";
import { resourceIdInput } from "@UnifiedAttendance/api/validations/workforce";

import { deleteFile, getDownloadUrl, getFileMetadata } from "@/lib/storage";
import { route } from "@/lib/route";

export const GET = route({
  input: resourceIdInput,
  handler: async ({ ctx, input }) => {
    const document = await getWorkforceDocument(ctx, input.id);
    if (!document.finalizedAt) return { document, downloadUrl: null };
    return {
      document,
      downloadUrl: await getDownloadUrl(document.storageKey, {
        responseContentDisposition: "attachment",
      }),
    };
  },
});

export const DELETE = route({
  input: resourceIdInput,
  handler: async ({ ctx, input }) => {
    const document = await deleteWorkforceDocument(ctx, input.id);
    await deleteFile(document.storageKey);
    return document;
  },
});

/** Marks an upload usable only after the object matches its validated declaration. */
export const PATCH = route({
  input: resourceIdInput,
  handler: async ({ ctx, input }) => {
    const document = await getWorkforceDocument(ctx, input.id);
    const metadata = await getFileMetadata(document.storageKey);
    if (
      !metadata ||
      metadata.contentType !== document.contentType ||
      metadata.contentLength !== document.contentLength
    ) {
      throw new Error("Uploaded file does not match the validated document metadata");
    }
    return finalizeWorkforceDocument(ctx, input.id);
  },
});
