"use client";

import { useEffect, useState } from "react";

import { DepartmentManager } from "@/components/workforce-catalogs";
import { type Branch, organizationApi } from "@/lib/api";

export function DepartmentWorkspace() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void organizationApi
      .branches()
      .then(setBranches)
      .catch(() => setError("Could not load branches."));
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <header>
        <p className="text-xs font-semibold text-muted-foreground">Workforce configuration</p>
        <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight">Departments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Maintain company-wide and branch-specific departments.
        </p>
      </header>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        <DepartmentManager branches={branches} />
      )}
    </div>
  );
}
