import { deleteClientDocument, getClientDocument } from "@UnifiedAttendance/api";
import { clientResourceIdInput } from "@UnifiedAttendance/api/validations/clients";

import { deleteFile, getDownloadUrl } from "@/lib/storage";
import { route } from "@/lib/route";

export const GET = route({
  input: clientResourceIdInput,
  handler: async ({ ctx, input }) => {
    const document = await getClientDocument(ctx, input);
    return {
      ...document,
      downloadUrl: await getDownloadUrl(document.document.storageKey, {
        responseContentDisposition: "attachment",
      }),
    };
  },
});

export const DELETE = route({
  input: clientResourceIdInput,
  handler: async ({ ctx, input }) => {
    const document = await getClientDocument(ctx, input);
    await deleteFile(document.document.storageKey);
    return deleteClientDocument(ctx, input);
  },
});
