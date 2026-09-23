// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

function clientEntryDevFallback(): Plugin {
  return {
    name: "gharpayy:client-entry-dev-fallback",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (!request.url?.startsWith("/@id/virtual:tanstack-start-client-entry")) {
          next();
          return;
        }

        response.statusCode = 200;
        response.setHeader("Content-Type", "application/javascript");
        response.end('import "/src/client.tsx";');
      });
    },
  };
}

export default defineConfig({
  tanstackStart: {
    client: {
      entry: "src/client.tsx",
    },
  },
  vite: {
    plugins: [clientEntryDevFallback()],
  },
});
