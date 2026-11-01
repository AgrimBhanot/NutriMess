"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

/** Lets a student who is the mess secretary verify with their bhawan's hash.
 *  The server throttles failed attempts. */
export function SecretaryVerify({ bhawanId }: { bhawanId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [hash, setHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify() {
    setLoading(true);
    setError(null);
    const { data, error: rpcError } = await createClient().rpc("promote_to_secretary", {
      p_bhawan_id: bhawanId,
      p_hash: hash.trim(),
    });
    setLoading(false);
    if (rpcError) return setError(rpcError.message);
    if (!data) return setError("That hash doesn't match your bhawan.");
    toast.success("Verified. Welcome to the Secretary Portal.");
    router.push("/secretary/dashboard");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-center text-xs text-[#9CA3AF] hover:text-[#4B5563]"
      >
        Are you the mess secretary? Verify here
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 card-shadow">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-[#111827]">
        <BadgeCheck className="h-4 w-4 stroke-[1.5px] text-[#BA5D38]" />
        Secretary verification
      </p>
      <p className="text-xs text-[#9CA3AF]">
        Enter the 16-bit hash provided by your mess administration.
      </p>
      <div className="flex gap-2">
        <input
          value={hash}
          onChange={(e) => setHash(e.target.value.toUpperCase())}
          maxLength={4}
          placeholder="8F42"
          className="h-10 w-28 rounded-xl border border-[#E5E7EB] bg-white text-center font-mono uppercase tracking-wider outline-none focus:border-[#244E3D]/40"
        />
        <button
          type="button"
          onClick={verify}
          disabled={loading || hash.trim().length < 4}
          className="flex h-10 flex-1 items-center justify-center rounded-xl bg-[#244E3D] text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
