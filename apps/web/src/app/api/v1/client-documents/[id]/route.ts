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
      downloadUrl: getDownloadUrl(document.document.storageKey, {
        contentType: document.document.contentType,
        attachment: true,
      }),
    };
  },
});

export const DELETE = route({
  input: clientResourceIdInput,
  handler: async ({ ctx, input }) => {
    const deletedVersions = await deleteClientDocument(ctx, input);
    await Promise.all(deletedVersions.map((version) => deleteFile(version.storageKey)));
    return deletedVersions;
  },
});
