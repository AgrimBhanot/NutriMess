"use client";

import { Bell } from "lucide-react";
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

        {/* Bhawan badge + notification */}
        <div className="flex items-center gap-3">
          {bhawanName && (
            <Badge
              variant="secondary"
              className="rounded-full bg-[#F3F4F6] px-3 py-1 text-xs font-medium text-[#4B5563]"
            >
              {bhawanName}
            </Badge>
          )}
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#9CA3AF] transition-colors hover:bg-[#F3F4F6] hover:text-[#4B5563]"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 stroke-[1.5px]" />
          </button>
        </div>
      </div>
    </header>
  );
}
