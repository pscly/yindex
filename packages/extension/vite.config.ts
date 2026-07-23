import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "node:path"
import { viteStaticCopy } from "vite-plugin-static-copy"

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: "public/manifest.json", dest: "." },
        { src: "public/icons/*", dest: "icons" },
        { src: "public/sandbox.html", dest: "." },
        { src: "../examples/pomodoro/*", dest: "examples/pomodoro" },
      ],
    }),
  ],
  resolve: {
    alias: {
      "@yindex/domain": resolve(__dirname, "../domain/src/index.ts"),
      "@yindex/style-packs": resolve(__dirname, "../style-packs/src/index.ts"),
      "@yindex/widget-sdk": resolve(__dirname, "../widget-sdk/src/index.ts"),
      "@yindex/widgets": resolve(__dirname, "../widgets/src/index.ts"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        newtab: resolve(__dirname, "newtab.html"),
        background: resolve(__dirname, "src/background/service-worker.ts"),
        sandbox: resolve(__dirname, "src/runtime/sandbox-frame.ts"),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === "background") return "background.js"
          if (chunk.name === "sandbox") return "sandbox.js"
          return "assets/[name]-[hash].js"
        },
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
    target: "chrome120",
    sourcemap: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
