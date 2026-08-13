import { createWorkforceDocument } from "@UnifiedAttendance/api";
import { createWorkforceDocumentInput } from "@UnifiedAttendance/api/validations/workforce";

import { getUploadParams } from "@/lib/storage";
import { route } from "@/lib/route";

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
