import path from "node:path";
import type { NextConfig } from "next";

// Pin the project root to frontend/. Without this, a package-lock.json in the
// repo root (e.g. from a CI step) makes Next treat the repo as the root and
// nests the server at .next/standalone/frontend/server.js, which Azure can't find.
const projectRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  // Self-contained server bundle: keeps the Azure Static Web Apps hybrid
  // deployment under its 250 MB limit
  output: "standalone",
  outputFileTracingRoot: projectRoot,
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
    root: projectRoot,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
