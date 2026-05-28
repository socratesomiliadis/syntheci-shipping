"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { X } from "lucide-react";

export function SourcePreviewDrawer({
  children,
  closeHref,
  description,
  open,
  title,
}: {
  children: React.ReactNode;
  closeHref: string;
  description: string;
  open: boolean;
  title: string;
}) {
  const router = useRouter();

  return (
    <Drawer
      direction="right"
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) router.push(closeHref, { scroll: false });
      }}
    >
      <DrawerContent className="h-full max-w-none min-w-[45vw] p-2 before:inset-2 before:rounded-none before:border-y-0 before:border-l before:border-r-0 before:bg-white">
        <DrawerHeader className="shrink-0 border-b border-slate-200 px-5 py-4 text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DrawerTitle className="truncate text-base font-semibold text-slate-950">
                {title}
              </DrawerTitle>
              <DrawerDescription className="mt-1 truncate text-sm text-slate-500">
                {description}
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button
                asChild
                aria-label="Close preview"
                size="icon"
                type="button"
                variant="ghost"
              >
                <Link href={closeHref}>
                  <X className="h-4 w-4" />
                </Link>
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
