"use client";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";

export default function Dashboard() {
  const privateData = useQuery(trpc.privateData.queryOptions());

  return (
    <div>
      <p>API: {privateData.data?.message}</p>
    </div>
  );
}
