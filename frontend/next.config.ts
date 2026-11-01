import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle: keeps the Azure Static Web Apps hybrid
  // deployment under its 250 MB limit
  output: "standalone",
  async headers() {
    return [
      {
        // Service worker must never be cached, or users get stuck on old code
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
  /* config options here */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
