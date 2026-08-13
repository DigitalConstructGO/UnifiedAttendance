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
      downloadUrl: getDownloadUrl(document.storageKey, {
        contentType: document.contentType,
        attachment: true,
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

export const PATCH = route({
  input: resourceIdInput,
  handler: async ({ ctx, input }) => {
    const document = await getWorkforceDocument(ctx, input.id);
    const metadata = await getFileMetadata(document.storageKey);
    const sizeOk =
      document.contentType === "application/pdf"
        ? metadata?.contentLength === document.contentLength
        : (metadata?.contentLength ?? 0) > 0 &&
          (metadata?.contentLength ?? 0) <= document.contentLength;
    if (!metadata || metadata.contentType !== document.contentType || !sizeOk) {
      throw new Error("Uploaded file does not match the validated document metadata");
    }
    return finalizeWorkforceDocument(ctx, input.id);
  },
});
