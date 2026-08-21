"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Upload, UserRound } from "lucide-react";
import { useRef, useState } from "react";

import { useAccess } from "@/components/access-provider";
import { RequestErrorAlert } from "@/components/request-error-alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { workforceApi, workforceKeys, type PersonAssetUrls } from "@/lib/api";
import { presentRequestError } from "@/lib/errors";

export function PersonAssetsCard({
  personId,
  assets,
}: {
  personId: string;
  assets: PersonAssetUrls;
}) {
  const { can } = useAccess();
  const manageable = can("workforce_documents.manage");
  const queryClient = useQueryClient();
  const [localError, setLocalError] = useState<Error | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const url = assets.profilePhotoUrl;

  const upload = useMutation({
    mutationFn: (file: File) => workforceApi.uploadDocument({ personId }, "profile_photo", file),
    onSuccess: async () => {
      setLocalError(null);
      await queryClient.invalidateQueries({ queryKey: workforceKeys.employeesAll });
    },
    onError: (error) => setLocalError(error as Error),
  });

  return (
    <Card className="rounded-[18px] shadow-[var(--shadow-card)] ring-border">
      <CardHeader>
        <CardTitle className="font-bold">Profile photo</CardTitle>
        <CardDescription>
          This photo is private. View photo opens a temporary secure link. National ID documents are
          stored with the employment contract.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {localError ? (
          <div className="mb-3">
            <RequestErrorAlert
              error={presentRequestError(localError, "Could not upload the photo.")}
            />
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {url ? (
              <img
                src={url}
                alt="Profile photo"
                className="size-10 shrink-0 rounded-[9px] object-cover ring-1 ring-border"
              />
            ) : (
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-[9px] bg-muted text-muted-foreground"
              >
                <UserRound className="size-5" />
              </span>
            )}
            <p className="text-xs text-muted-foreground">
              {url ? "Profile photo on file" : "JPG, PNG, or WebP up to 5 MB"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {url ? (
              <Button asChild variant="ghost" size="sm" className="h-8 rounded-[9px] font-bold">
                <a href={url} target="_blank" rel="noreferrer">
                  <ExternalLink aria-hidden="true" />
                  View photo
                </a>
              </Button>
            ) : null}
            {manageable ? (
              <>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) upload.mutate(file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-[9px] font-bold"
                  disabled={upload.isPending}
                  onClick={() => fileInput.current?.click()}
                >
                  <Upload aria-hidden="true" />
                  {upload.isPending ? "Uploading photo…" : url ? "Replace photo" : "Upload photo"}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
