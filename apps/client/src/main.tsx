import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { ensureAppRootDirExists } from "@/utils/fs";
import Loading from "./components/common/Loading";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { getLanguage } from "@/utils/config";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import InitializationError from "./components/common/InitializationError";
import { log } from "@/utils/logger";
import {
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";

const el = document.getElementById("root")!;

// 使用 async 解决 pnpm build 时的报错
// Top-level await is not available in the configured target environment
void (async () => {
  try {
    applyPlatformClass();
    await ensureAppRootDirExists();

    await Promise.all([loadLanguageFiles(), requestNotifyPermission()]);

    renderApp();
  } catch (error) {
    // 如果任何一步失败，则捕获错误并渲染专用的错误页
    log.error(`应用初始化失败: ${String(error)}`);
    if (error instanceof Error) {
      renderError(error);
    } else {
      renderError(new Error(String(error)));
    }
  }
})();

/** 加载语言文件 */
async function loadLanguageFiles() {
  // 从配置文件读取语言，如果失败或未设置，默认 "zh"
  const savedLang = await getLanguage();

  await i18next.use(initReactI18next).init({
    lng: savedLang,
    fallbackLng: "zh",
    supportedLngs: ["zh", "en"],
    debug: import.meta.env.DEV,
    interpolation: {
      escapeValue: false, // React 已经可以防范 XSS
    },
    resources: {
      zh: {
        translation: await import("./locales/zh.json"),
      },
      en: {
        translation: await import("./locales/en.json"),
      },
    },
  });
}

/** 申请通知权限 */
async function requestNotifyPermission() {
  if (!(await isPermissionGranted())) {
    await requestPermission();
  }
}

/** 渲染主应用 */
function renderApp() {
  const root = createRoot(el);

  root.render(
    <React.StrictMode>
      <Suspense fallback={<Loading />}>
        <RouterProvider router={router} />
      </Suspense>
    </React.StrictMode>,
  );
}

/** 渲染错误页面 */
function renderError(error: Error) {
  const root = createRoot(el);
  root.render(
    <React.StrictMode>
      <InitializationError error={error} />
    </React.StrictMode>,
  );
}

function applyPlatformClass() {
  if (typeof document === "undefined") {
    return;
  }

  const isMac =
    navigator.platform.toLowerCase().includes("mac") ||
    navigator.userAgent.toLowerCase().includes("mac");

  if (isMac) {
    document.documentElement.classList.add("is-macos");
    document.body.classList.add("is-macos");
  }
}
