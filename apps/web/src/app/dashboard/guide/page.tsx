import type { Metadata } from "next";

import { Guide } from "@/components/guide";

export const metadata: Metadata = {
  title: "Guide",
  description: "How this system works, written for people who use it rather than build it.",
};

export default function GuidePage() {
  return <Guide />;
}
