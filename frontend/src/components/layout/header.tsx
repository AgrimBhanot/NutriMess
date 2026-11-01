"use client";

import { Badge } from "@/components/ui/badge";

interface AppHeaderProps {
  bhawanName?: string;
}

export function AppHeader({ bhawanName }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
        {/* Brand mark */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#244E3D]">
            <span className="text-sm font-semibold text-white">N</span>
          </div>
          <span className="text-base font-semibold text-[#111827]">
            NutriMess
          </span>
        </div>

        {/* Bhawan badge */}
        <div className="flex items-center gap-3">
          {bhawanName && (
            <Badge
              variant="secondary"
              className="rounded-full bg-[#F3F4F6] px-3 py-1 text-xs font-medium text-[#4B5563]"
            >
              {bhawanName}
            </Badge>
          )}
        </div>
      </div>
    </header>
  );
}
