import type { Metadata } from "next";

import { Guide } from "@/components/guide";

export const metadata: Metadata = {
  title: "Guide",
  description: "How this system works, written for people who use it rather than build it.",
};

/**
 * No permission check. The guide explains the system rather than showing any of
 * its data, and gating an explanation behind the thing it explains helps nobody
 * — the dashboard layout has already established there is a signed-in user.
 */
export default function GuidePage() {
  return <Guide />;
}
