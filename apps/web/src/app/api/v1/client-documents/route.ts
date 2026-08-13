import { createClientDocument, listClientDocuments } from "@UnifiedAttendance/api";
import {
  createClientDocumentInput,
  listClientDocumentsInput,
} from "@UnifiedAttendance/api/validations/clients";

import { getUploadParams } from "@/lib/storage";
import { route } from "@/lib/route";

export const GET = route({
  input: listClientDocumentsInput,
  handler: ({ ctx, input }) => listClientDocuments(ctx, input),
});

export const POST = route({
  input: createClientDocumentInput,
  status: 201,
  handler: async ({ ctx, input }) => {
    const document = await createClientDocument(ctx, input);
    return {
      ...document,
      ...getUploadParams(document.document.storageKey, {
        contentType: document.document.contentType,
      }),
    };
  },
});
