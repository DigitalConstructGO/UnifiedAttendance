import { getDownloadUrl } from "@/lib/storage";

/**
 * A person row points at its current profile photo as
 * `<storage key>.<extension>` — written when a person-owned profile photo
 * document is finalized. This turns the pointer into a short-lived signed URL
 * the browser can render. Server-only, because signing needs the API secret.
 */
const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function signedPersonAssetUrl(pointer: string | null): string | null {
  if (!pointer) return null;
  const dot = pointer.lastIndexOf(".");
  if (dot < 0) return null;
  const contentType = CONTENT_TYPE_BY_EXTENSION[pointer.slice(dot + 1)];
  if (!contentType) return null;
  return getDownloadUrl(pointer.slice(0, dot), { contentType });
}

export type PersonAssetUrls = {
  profilePhotoUrl: string | null;
};

export function personAssetUrls(person: { profilePhotoUrl: string | null }): PersonAssetUrls {
  return { profilePhotoUrl: signedPersonAssetUrl(person.profilePhotoUrl) };
}
