import { mkdir } from "node:fs/promises";

// Netlify Next runtime 5.16.3/5.16.4 copies server files concurrently, but
// writes functions-config-manifest.json without first creating its parent.
// Prepare only that generated directory after the app build and before the
// adapter's onBuild hook. No application files or existing data are changed.
await mkdir(".netlify/functions-internal/___netlify-server-handler/.next/server", {
  recursive: true,
});
