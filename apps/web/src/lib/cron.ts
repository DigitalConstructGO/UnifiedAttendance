import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { createInnerContext } from "@UnifiedAttendance/api/context";
import { env } from "@UnifiedAttendance/env/server";

import type { Context } from "@UnifiedAttendance/api";

function authorized(request: Request) {
  if (!env.CRON_SECRET) return false;
  const header = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  return header.length === expected.length && timingSafeEqual(header, expected);
}

export function cronRoute(label: string, run: (ctx: Context) => Promise<unknown>) {
  return async function GET(request: Request) {
    if (!authorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      const result = await run(createInnerContext({ session: null }));
      console.log(`[${label}]`, result);
      return NextResponse.json({ ok: true, result });
    } catch (error) {
      console.error(`[${label}] run failed:`, error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  };
}
