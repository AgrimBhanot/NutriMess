/** Neutral placeholder shown while a route's server data loads. */
export function PageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className="h-5 w-40 rounded-md bg-[#E5E7EB]" />
        <div className="h-4 w-56 rounded-md bg-[#F3F4F6]" />
      </div>
      <div className="h-32 rounded-2xl bg-[#F3F4F6]" />
      <div className="h-20 rounded-2xl bg-[#F3F4F6]" />
      <div className="h-20 rounded-2xl bg-[#F3F4F6]" />
    </div>
  );
}
