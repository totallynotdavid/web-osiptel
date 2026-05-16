import { resolve } from "node:path";

import tailwindcss from "@tailwindcss/vite";
import { solidStart } from "@solidjs/start/config";
import { nitroV2Plugin } from "@solidjs/vite-plugin-nitro-2";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    dedupe: ["solid-js", "solid-js/web"],
  },
  plugins: [
    tailwindcss(),
    solidStart({
      middleware: "./src/middleware.ts",
    }),
    nitroV2Plugin({
      alias: {
        "~": resolve(process.cwd(), "src"),
      },
      esbuild: {
        options: {
          target: "esnext",
        },
      },
      preset: "bun",
    }),
  ],
  esbuild: {
    target: "es2022",
  },
});
