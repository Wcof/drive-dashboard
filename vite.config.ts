import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import path from "path"

// GitHub Pages 部署：仓库名 drive-dashboard
const pagesBase = process.env.VITE_BASE_PATH
  || (process.env.GITHUB_PAGES === "true" ? "/drive-dashboard/" : "/")

export default defineConfig({
  base: pagesBase,
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return
          if (id.includes("/vue")) return "vue-vendor"
          if (id.includes("/mapbox-gl")) return "mapbox-vendor"
          return "vendor"
        },
      },
    },
  },
})
