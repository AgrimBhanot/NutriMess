import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <p className="font-mono text-sm text-[#9CA3AF]">404</p>
      <h1 className="mt-1 text-lg font-semibold text-[#111827]">Page not found</h1>
      <p className="mt-1 text-sm text-[#9CA3AF]">That page isn&apos;t on the menu.</p>
      <Link
        href="/"
        className="mt-5 flex h-10 items-center rounded-xl bg-[#244E3D] px-4 text-sm font-medium text-white"
      >
        Go home
      </Link>
    </div>
  );
}
