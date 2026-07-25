import { resolve } from "node:path"
import react from "@vitejs/plugin-react"
import { viteStaticCopy } from "vite-plugin-static-copy"

const config = {
  // Relative URLs required for chrome-extension:// origin
  base: "./",
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: "public/manifest.json", dest: "." },
        { src: "public/icons/*", dest: "icons" },
        { src: "../examples/pomodoro/*", dest: "examples/pomodoro" },
        {
          src: "node_modules/@fontsource-variable/noto-sans-sc/LICENSE",
          dest: "licenses",
          rename: "Noto-Sans-SC-OFL.txt",
        },
        {
          src: "node_modules/@fontsource-variable/noto-serif-sc/LICENSE",
          dest: "licenses",
          rename: "Noto-Serif-SC-OFL.txt",
        },
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
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        newtab: resolve(__dirname, "newtab.html"),
        background: resolve(__dirname, "src/background/service-worker.ts"),
      },
      output: {
        entryFileNames: (chunk: { readonly name: string }) => {
          if (chunk.name === "background") return "background.js"
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
}

module.exports = config
