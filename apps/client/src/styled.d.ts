import "styled-components";
import { Theme } from "./styles/themes";

declare module "styled-components" {
  export interface DefaultTheme extends Theme {
    __themeBrand?: never;
  }
}
