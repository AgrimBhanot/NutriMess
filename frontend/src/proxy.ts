import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - icons/ and screenshots/ (PWA assets)
     * - api/ routes (handled separately)
     * - .swa/ (Azure Static Web Apps health check)
     */
    "/((?!\\.swa|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|icons/|screenshots/|manifest.json|sw.js|offline.html).*)",
  ],
};
