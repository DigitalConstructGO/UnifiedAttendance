import { getClientDocument } from "@UnifiedAttendance/api";
import { clientResourceIdInput } from "@UnifiedAttendance/api/validations/clients";

import { getDownloadUrl } from "@/lib/storage";
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
