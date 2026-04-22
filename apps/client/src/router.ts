import { createBrowserRouter } from "react-router-dom";
import RootLayout from "./components/layout/RootLayout";
import Launchpad from "./pages/Launchpad";
import About from "./pages/help/About";
import Changelog from "./pages/help/Changelog";
import Update from "./pages/help/Update";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      {
        index: true,
        Component: Launchpad,
      },
      {
        path: "help",
        children: [
          {
            path: "about",
            Component: About,
          },
          {
            path: "changelog",
            Component: Changelog,
          },
          {
            path: "update",
            Component: Update,
          },
        ],
      },
    ],
  },
]);
