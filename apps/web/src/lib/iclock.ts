import { createInnerContext } from "@UnifiedAttendance/api/context";


export function deviceContext() {
  return createInnerContext({ session: null });
}


export function textResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}


export function serialNumber(request: Request) {
  const params = new URL(request.url).searchParams;
  const value = params.get("SN") ?? params.get("sn");
  return value?.trim() || null;
}

export function tableName(request: Request) {
  const params = new URL(request.url).searchParams;
  return params.get("table") ?? params.get("Table");
}
