import { route } from "@/lib/route";

export const GET = route({ access: "public", handler: () => "OK" });
