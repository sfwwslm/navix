import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { applyWebTheme } from "@navix/shared-ui";
import App from "./App";
import { I18nProvider } from "./i18n/I18nProvider";
import "./index.css";

applyWebTheme(
  window.localStorage.getItem("appTheme") === "light" ? "light" : "dark",
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </I18nProvider>
  </React.StrictMode>,
);
