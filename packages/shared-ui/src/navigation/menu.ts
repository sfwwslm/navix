export type TranslateLike = (key: string) => string;

export type SharedMenuItem = {
  id: number;
  label: string;
  url: string;
  children?: SharedMenuItem[];
};

export const buildDesktopMenuItems = (t: TranslateLike): SharedMenuItem[] => [
  {
    id: 100,
    label: t("menu.navigation"),
    url: "/",
  },
  {
    id: 1000,
    label: t("menu.help.title"),
    url: "",
    children: [
      {
        id: 1001,
        label: t("menu.help.settings"),
        url: "/help/settings",
      },
      {
        id: 1002,
        label: t("menu.help.update"),
        url: "/help/update",
      },
      {
        id: 1003,
        label: t("menu.help.changelog"),
        url: "/help/changelog",
      },
      {
        id: 1099,
        label: t("menu.help.about"),
        url: "/help/about",
      },
    ],
  },
];
