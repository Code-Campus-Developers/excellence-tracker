// scripts/vercel-build.mjs
// Runs after `vite build` to assemble the Vercel Build Output API v3 structure.
import { cpSync, mkdirSync, writeFileSync, existsSync, readdirSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(fileURLToPath(import.meta.url), "../..");
const dist = join(root, "dist");
const vercelOut = join(root, ".vercel", "output");

console.log("→ Building Vercel output at", vercelOut);

// Clean previous output
if (existsSync(vercelOut)) rmSync(vercelOut, { recursive: true });

// ── 1. Static assets ──────────────────────────────────────────────────────────
const staticDir = join(vercelOut, "static");
mkdirSync(staticDir, { recursive: true });
cpSync(join(dist, "client"), staticDir, { recursive: true });
console.log("  ✓ Static assets copied");

// ── 2. Edge SSR function ──────────────────────────────────────────────────────
const funcDir = join(vercelOut, "functions", "index.func");
mkdirSync(funcDir, { recursive: true });

// Copy the server bundle + its assets into the function directory
cpSync(join(dist, "server"), funcDir, { recursive: true });

// Create the edge function entry point
writeFileSync(
  join(funcDir, "index.js"),
  `export { default } from "./server.js";\n`
);

// Vercel edge function config
writeFileSync(
  join(funcDir, ".vc-config.json"),
  JSON.stringify({ runtime: "edge", entrypoint: "index.js" }, null, 2)
);
console.log("  ✓ Edge SSR function created");

// ── 3. Vercel output config ───────────────────────────────────────────────────
writeFileSync(
  join(vercelOut, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        // Static assets pass through
        { src: "^/assets/(.*)$", dest: "/assets/$1" },
        { src: "^/image-(.*)$", dest: "/image-$1" },
        { src: "^/robots\\.txt$", dest: "/robots.txt" },
        // Everything else → SSR edge function
        { src: "^/(.*)$", dest: "/index" }
      ]
    },
    null,
    2
  )
);
console.log("  ✓ config.json written");
console.log("✅ Vercel output ready at .vercel/output/");
