import styled from "styled-components";
import { Theme } from "@/styles/themes";

/**
 * @const TooltipContainer
 * @description 包裹触发器和提示文本的容器
 */
export const TooltipContainer = styled.div`
  position: relative;
  display: inline-block;
  cursor: pointer;
`;

/**
 * @const TooltipText
 * @description 气泡提示的样式
 */
export const TooltipText = styled.div<{ theme: Theme }>`
  /* 使用 fixed 定位，使其脱离文档流，不再影响任何父元素布局 */
  position: fixed;
  z-index: ${(props) => props.theme.zIndices.tooltip}; /* 确保在最顶层 */

  /* 外观样式 */
  width: max-content;
  max-width: 220px;
  padding: 8px 12px;
  background-color: ${(props) => props.theme.colors.surface};
  color: ${(props) => props.theme.colors.textPrimary};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 6px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);

  /* 文本样式 */
  text-align: center;
  font-size: 0.85rem;
  white-space: normal;

  /* 初始时放置在屏幕外，等待JS计算位置并应用 style */
  top: -9999px;
  left: -9999px;
`;
