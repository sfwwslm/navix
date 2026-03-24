import React, { useState, useRef, ReactNode, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { TooltipContainer, TooltipText } from "./Tooltip.styles";
/**
 * @interface TooltipProps
 */
interface TooltipProps {
  children: ReactNode;
  text: string;
}

/**
 * @interface Position
 */
interface Position {
  top: number;
  left: number;
}

/**
 * @component Tooltip
 */
const Tooltip: React.FC<TooltipProps> = ({ children, text }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (isVisible && wrapperRef.current && tooltipRef.current) {
      const wrapperRect = wrapperRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      let top = wrapperRect.top - tooltipRect.height - 8;
      let left = wrapperRect.left + (wrapperRect.width - tooltipRect.width) / 2;
      const margin = 5; //
      if (left < margin) {
        left = margin;
      } else if (left + tooltipRect.width > window.innerWidth - margin) {
        left = window.innerWidth - tooltipRect.width - margin;
      }
      if (top < margin) {
        top = wrapperRect.bottom + 8; //
      }
      void Promise.resolve().then(() => {
        setPosition({ top, left });
      });
    }
  }, [isVisible, text]); //

  return (
    <TooltipContainer
      ref={wrapperRef}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      className="tooltip-wrapper"
    >
      {children}
      {isVisible &&
        createPortal(
          <TooltipText
            ref={tooltipRef}
            style={
              position
                ? { top: `${position.top}px`, left: `${position.left}px` }
                : {}
            }
            className="tooltip-text"
          >
            {text}
          </TooltipText>,
          document.body, //
        )}
    </TooltipContainer>
  );
};

export default Tooltip;
