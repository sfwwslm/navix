import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import generouted from "@generouted/react-router/plugin";
import pkg from "./package.json";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

const changelogContent = fs.readFileSync(
  path.resolve(__dirname, "../../CHANGELOG.md"),
  "utf-8",
);

// --- Git 信息获取 ---
let gitHash = "N/A";
const gitCommitInfo = "N/A";

try {
  gitHash = execSync("git rev-parse --short HEAD").toString().trim();
} catch (e) {
  console.error("获取 Git 信息失败:", e);
}
// --- 结束 ---

// https://vitejs.dev/config/
export default defineConfig(() => ({
  plugins: [react(), generouted()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __REACT_VERSION__: JSON.stringify(pkg.dependencies.react),
    __VITE_VERSION__: JSON.stringify(pkg.devDependencies.vite),
    __CHANGELOG_CONTENT__: JSON.stringify(changelogContent),
    __GIT_HASH__: JSON.stringify(gitHash),
    __GIT_COMMIT_INFO__: JSON.stringify(gitCommitInfo),
  },

  build: {
    chunkSizeWarningLimit: 1500,
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1430,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
