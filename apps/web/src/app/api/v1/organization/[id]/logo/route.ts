import { authorizeOrganizationLogoUpload } from "@UnifiedAttendance/api";
import { organizationLogoUploadInput } from "@UnifiedAttendance/api/validations/organization";

import { getPublicImageUploadParams } from "@/lib/storage";
import { route } from "@/lib/route";

/**
 * Step one of replacing the logo: signed parameters for a direct browser
 * upload. The browser then saves the URL Cloudinary returns with
 * `PATCH /organization/:id { logoUrl }`.
 */
export const POST = route({
  input: organizationLogoUploadInput,
  handler: async ({ ctx, input }) => {
    const { storageKey, contentType } = await authorizeOrganizationLogoUpload(ctx, input);
    return getPublicImageUploadParams(storageKey, { contentType });
  },
});
