import { organizations } from "@UnifiedAttendance/db/schema/index";
import { db } from "@UnifiedAttendance/db";
import { cache } from "react";

export type Brand = {
  name: string;
  logoUrl: string | null;
  tagline: string;
};

const fallbackBrand: Brand = {
  name: process.env.NEXT_PUBLIC_APP_NAME?.trim() || "UnifiedAttendance",
  logoUrl: process.env.NEXT_PUBLIC_APP_LOGO_URL?.trim() || null,
  tagline: process.env.NEXT_PUBLIC_APP_TAGLINE?.trim() || "Operations platform",
};

/** Resolves the single configured organization, with a local-development fallback. */
export const getBrand = cache(async (): Promise<Brand> => {
  const [organization] = await db
    .select({ name: organizations.name, logoUrl: organizations.logoUrl })
    .from(organizations)
    .limit(1);

  return organization
    ? { name: organization.name, logoUrl: organization.logoUrl, tagline: fallbackBrand.tagline }
    : fallbackBrand;
});
