import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
};

export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <Image
      src="/syntheci-logo.svg"
      alt="Syntheci"
      width={1669}
      height={384}
      priority
      className={cn("h-auto w-36", className)}
    />
  );
}

export function BrandMark({ className }: BrandLogoProps) {
  return (
    <Image
      src="/syntheci-mark.svg"
      alt="Syntheci"
      width={384}
      height={384}
      priority
      className={cn("size-8", className)}
    />
  );
}
