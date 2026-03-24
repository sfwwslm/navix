import React from "react";
import styled from "styled-components";

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column; /* 垂直排列 */
  justify-content: center; /* 水平居中 */
  align-items: center; /* 垂直居中 */
  height: 100%;
  width: 100%;
  font-size: 1.5rem;
  color: #333; /* 文本颜色 */
`;

const Spinner = styled.div`
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #3498db; /* 旋转条高亮色 */
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite; /* 旋转动画 */
  margin-bottom: 10px; /* 与文本间距 */

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const Loading: React.FC = () => {
  return (
    <LoadingContainer>
      <Spinner></Spinner>
      <p>加载中...</p>
    </LoadingContainer>
  );
};

export default Loading;
