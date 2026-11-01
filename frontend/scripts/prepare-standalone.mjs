// Next's standalone output omits static assets and public/; copy them in so
// .next/standalone runs on its own (as Azure Static Web Apps hybrid expects).
import { cpSync, existsSync } from "node:fs";

const standalone = ".next/standalone";
if (!existsSync(standalone)) {
  console.error("No .next/standalone found; is output: 'standalone' set?");
  process.exit(1);
}
cpSync(".next/static", `${standalone}/.next/static`, { recursive: true });
cpSync("public", `${standalone}/public`, { recursive: true });
console.log("Standalone build ready");
