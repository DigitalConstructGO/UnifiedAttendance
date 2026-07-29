import { Fingerprint } from "lucide-react";

import type { Brand } from "@/lib/brand";

export function BrandMark({ brand, className = "size-10", iconClassName = "size-5" }: { brand: Brand; className?: string; iconClassName?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-[11px] bg-primary text-primary-foreground ${className}`}>
      {brand.logoUrl ? (
        // Organization logos are configured by the tenant and may be hosted outside this app.
        <img src={brand.logoUrl} alt="" className="size-full object-cover" />
      ) : (
        <Fingerprint className={iconClassName} aria-hidden="true" />
      )}
    </span>
  );
}
