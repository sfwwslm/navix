import type { TFunction } from "i18next";
import { buildClientMenuItems, type SharedMenuItem } from "@navix/shared-ui";

export type MenuItem = SharedMenuItem;

export const getMenuItems = (t: TFunction): MenuItem[] =>
  buildClientMenuItems(t);
