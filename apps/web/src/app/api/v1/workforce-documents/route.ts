import { createWorkforceDocument, listWorkforceDocuments } from "@UnifiedAttendance/api";
import {
  createWorkforceDocumentInput,
  listWorkforceDocumentsInput,
} from "@UnifiedAttendance/api/validations/workforce";

import { getDownloadUrl, getUploadParams } from "@/lib/storage";
import { route } from "@/lib/route";

export const GET = route({
  input: listWorkforceDocumentsInput,
  handler: async ({ ctx, input }) => {
    const documents = await listWorkforceDocuments(ctx, input);
    return documents.map((document) => ({
      document,
      downloadUrl: getDownloadUrl(document.storageKey, { contentType: document.contentType }),
    }));
  },
});

export const POST = route({
  input: createWorkforceDocumentInput,
  status: 201,
  handler: async ({ ctx, input }) => {
    const document = await createWorkforceDocument(ctx, input);
    return {
      document,
      ...getUploadParams(document.storageKey, { contentType: document.contentType }),
    };
  },
});
