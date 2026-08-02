import { useState, useRef, useEffect } from "react";

export const useScreenDrag = (initialHeightPercentage: number = 35) => {
  const [opponentHeight, setOpponentHeight] = useState(initialHeightPercentage);
  const isDragging = useRef(false);
  const hasMoved = useRef(false);
  const suppressClick = useRef(false);

  useEffect(() => {
    const handleMove = (y: number) => {
      if (!isDragging.current) return;
      hasMoved.current = true;
      const percentage = (y / window.innerHeight) * 100;
      // Clamp between 15% and 60% to prevent breaking layout
      if (percentage >= 15 && percentage <= 60) {
        setOpponentHeight(percentage);
      }
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientY);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientY);

    const onEnd = () => {
      if (isDragging.current && hasMoved.current) {
        suppressClick.current = true;
        setTimeout(() => {
          suppressClick.current = false;
        }, 250);
      }
      isDragging.current = false;
      hasMoved.current = false;
      document.body.style.cursor = "default";
    };

    const onClickCapture = (e: MouseEvent) => {
      if (suppressClick.current) {
        e.stopPropagation();
        e.preventDefault();
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchend", onEnd);
    window.addEventListener("click", onClickCapture, true);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("click", onClickCapture, true);
    };
  }, []);

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;

    // Impede o início do arraste se clicar em elementos interativos
    if (
      target.closest("button") ||
      target.closest(".no-drag") ||
      target.closest("[role='button']")
    ) {
      return;
    }

    isDragging.current = true;
    hasMoved.current = false;
    document.body.style.cursor = "row-resize";
  };

  return { opponentHeight, startDrag };
};

