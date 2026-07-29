// scripts/vercel-build.mjs
// After `vite build`: generates index.html via SSR, then assembles static output.
import { writeFileSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const root = join(fileURLToPath(import.meta.url), "../..");
const dist = join(root, "dist");

console.log("Generating index.html via SSR...");

let indexHtml = "";
try {
  // Convert Windows path to file URL for dynamic import
  const serverPath = join(dist, "server", "server.js");
  const serverUrl = new URL("file:///" + serverPath.replace(/\\/g, "/").replace(/^\/\//, "")).href;
  const { default: serverBundle } = await import(serverUrl);
  const req = new Request("http://localhost/");
  const res = await serverBundle.fetch(req, {}, {});
  indexHtml = await res.text();
  console.log("  index.html generated from SSR (" + indexHtml.length + " chars)");
} catch (e) {
  console.warn("  SSR failed, using minimal fallback:", e.message);
  indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Code Campus Excellence Tracker</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;
}

writeFileSync(join(dist, "client", "index.html"), indexHtml);
console.log("  index.html written to dist/client/");

// Update vercel.json for static SPA
writeFileSync(
  join(root, "vercel.json"),
  JSON.stringify({
    outputDirectory: "dist/client",
    framework: null,
    buildCommand: "npm run build:vercel",
    rewrites: [{ source: "/(.*)", destination: "/index.html" }]
  }, null, 2)
);
console.log("  vercel.json updated");
console.log("Done");
