import { createWorkforceDocument } from "@UnifiedAttendance/api";
import { createWorkforceDocumentInput } from "@UnifiedAttendance/api/validations/workforce";

import { getUploadUrl } from "@/lib/storage";
import { route } from "@/lib/route";

/** Starts a private direct-to-S3 upload after validating ownership and file policy. */
export const POST = route({
  input: createWorkforceDocumentInput,
  status: 201,
  handler: async ({ ctx, input }) => {
    const document = await createWorkforceDocument(ctx, input);
    return {
      document,
      uploadUrl: await getUploadUrl(document.storageKey, { contentType: document.contentType }),
    };
  },
});
