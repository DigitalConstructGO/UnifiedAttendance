import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadAccess } from "@/lib/access-server";

export default async function NoAccessPage() {
  const { access } = await loadAccess();

  return (
    <div className="flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>No access</CardTitle>
          <CardDescription>
            {access.role
              ? `Your role, ${access.role}, does not have permission to view that page.`
              : "Your account has not been assigned a role yet. An administrator needs to assign one before you can use the dashboard."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
