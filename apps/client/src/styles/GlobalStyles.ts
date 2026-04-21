import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  /* === Reset & Base Styles === */
  *, *::before, *::after {
    box-sizing: border-box;
  }

  html {
    box-sizing: border-box;
    height: 100%;
    -webkit-text-size-adjust: 100%; /* 防止移动设备上文本大小调整 */
    -webkit-tap-highlight-color: transparent; /* 禁用点击高亮 */
    scroll-behavior: smooth; /* 平滑滚动 */
  }

  body, #root {
    height: 100%;
    margin: 0;
    padding: 0;
    font-family: ${(props) => props.theme.typography.fontFamily};
    font-size: ${(props) => props.theme.typography.fontSizeBase};
    line-height: 1.714;
    font-weight: 400;
    font-synthesis: none; /* 禁用字体合成 */
    text-rendering: optimizeLegibility; /* 优化文本渲染 */
    -webkit-font-smoothing: antialiased; /* 启用抗锯齿 */
    -moz-osx-font-smoothing: grayscale; /* 启用灰度抗锯齿 */
  }

  /* 清除常见元素默认 margin/padding */
  h1, h2, h3, h4, h5, h6, p, blockquote, figure, dl, dd, ul, ol, pre, form, fieldset, legend, input, textarea, button {
    margin: 0;
    padding: 0;
  }

  /* 清除列表样式 */
  ul, ol {
    list-style: none;
  }

  /* 超链接默认样式重置 */
  a {
    text-decoration: none;
    color: inherit;
  }

  /* 媒体元素响应式 */
  img, picture, video, canvas, svg {
    display: block;
    max-width: 100%;
    height: auto;
  }

  /* 表单输入保持字体一致 */
  input, button, textarea, select {
    font: inherit;
    color: inherit;
    background: none;
    border: none;
    outline: none;
  }

  /* 禁止 textarea resize */
  textarea {
    resize: none;
  }

  /* 默认按钮行为统一 */
  button {
    cursor: pointer;
    background-color: transparent;
    border: none;
  }

  /* === 全局滚动条美化 (动态主题) === */
  ::-webkit-scrollbar {
    width: 10px; /* 滚动条宽度 */
    height: 10px; /* 水平滚动条高度 */
  }

  ::-webkit-scrollbar-track {
    border-radius: 10px;
  }

  ::-webkit-scrollbar-thumb {
    background: linear-gradient(
      180deg,
      ${(props) => props.theme.colors.primary},
      ${(props) => props.theme.colors.secondary}
    );
    border-radius: 10px;
    border: 2px solid transparent;
    background-clip: content-box;
  }

  ::-webkit-scrollbar-thumb:hover {
    filter: brightness(1.2);
  }
`;
