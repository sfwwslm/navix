import React, { useState, useRef, useEffect } from "react";
import styled, { useTheme, ThemeProvider } from "styled-components";
import { IoPersonCircleOutline } from "react-icons/io5";
import { createPortal } from "react-dom";
import UserProfileCard from "@/features/Auth/UserProfileCard";

const IconContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0 8px;
  cursor: pointer;
  border-radius: 5px;
  color: ${(props) => props.theme.colors.header.text};
  transition: all 0.2s ease-in-out;

  &:hover {
    background-color: ${(props) => props.theme.colors.header.hoverBackground};
  }

  svg {
    font-size: 1.3rem;
  }
`;

const UserIcon: React.FC = () => {
  const [isCardOpen, setIsCardOpen] = useState(false);
  const iconRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [cardPosition, setCardPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const theme = useTheme();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isCardOpen &&
        iconRef.current &&
        !iconRef.current.contains(event.target as Node) &&
        cardRef.current &&
        !cardRef.current.contains(event.target as Node)
      ) {
        setIsCardOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCardOpen]);

  // 当面板打开时测量位置
  React.useLayoutEffect(() => {
    if (isCardOpen && iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      const cardWidth = 280;
      const margin = 10;
      let left = rect.right - cardWidth;
      if (left < margin) {
        left = margin;
      }
      setCardPosition({
        top: rect.bottom + 8,
        left: left,
      });
    } else {
      setCardPosition(null);
    }
  }, [isCardOpen]);

  return (
    <>
      <IconContainer
        ref={iconRef}
        className="user-icon-container"
        onClick={() => setIsCardOpen((prev) => !prev)}
      >
        <IoPersonCircleOutline />
      </IconContainer>

      {isCardOpen &&
        cardPosition &&
        createPortal(
          <div
            ref={cardRef}
            style={{
              position: "fixed",
              top: cardPosition.top,
              left: cardPosition.left,
              zIndex: theme.zIndices.userCard,
            }}
          >
            <ThemeProvider theme={theme}>
              <UserProfileCard onClose={() => setIsCardOpen(false)} />
            </ThemeProvider>
          </div>,
          document.body,
        )}
    </>
  );
};

export default UserIcon;
