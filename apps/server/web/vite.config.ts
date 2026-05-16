import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    // 配置代理，解决开发环境下的跨域问题
    proxy: {
      // 当有 /api 前缀的请求时，转发到后端的 9990 端口
      "/api": {
        target: "http://127.0.0.1:9990",
        changeOrigin: true, // 需要虚拟主机站点
      },
    },
  },
});
