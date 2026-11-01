import { ScanLine } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scan Plate",
};

export default function ScanPage() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#244E3D]/10 mb-4">
        <ScanLine className="h-8 w-8 text-[#244E3D] stroke-[1.5px]" />
      </div>
      <h2 className="text-lg font-semibold text-[#111827]">
        Plate Scanner
      </h2>
      <p className="mt-1 text-sm text-[#9CA3AF] max-w-xs">
        Point your camera at your mess plate to get an instant AI-powered
        nutrition breakdown.
      </p>
      <p className="mt-4 text-xs text-[#D1D5DB]">Coming in Week 3</p>
    </div>
  );
}
