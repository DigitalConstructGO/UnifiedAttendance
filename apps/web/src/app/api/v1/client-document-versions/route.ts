import { createClientDocumentVersion } from "@UnifiedAttendance/api";
import { createClientDocumentVersionInput } from "@UnifiedAttendance/api/validations/clients";

import { getUploadUrl } from "@/lib/storage";
import { route } from "@/lib/route";

export const POST = route({
  input: createClientDocumentVersionInput,
  status: 201,
  handler: async ({ ctx, input }) => {
    const document = await createClientDocumentVersion(ctx, input);
    return {
      ...document,
      uploadUrl: await getUploadUrl(document.document.storageKey, {
        contentType: document.document.contentType,
      }),
    };
  },
});
