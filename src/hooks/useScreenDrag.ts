import { useState, useRef, useEffect } from "react";

export const useScreenDrag = (initialHeightPercentage: number = 35) => {
  const [opponentHeight, setOpponentHeight] = useState(initialHeightPercentage);
  const isDragging = useRef(false);

  useEffect(() => {
    const handleMove = (y: number) => {
      if (!isDragging.current) return;
      const percentage = (y / window.innerHeight) * 100;
      // Clamp between 15% and 60% to prevent breaking layout
      if (percentage >= 15 && percentage <= 60) {
        setOpponentHeight(percentage);
      }
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientY);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientY);

    const onEnd = () => {
      isDragging.current = false;
      document.body.style.cursor = "default";
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchend", onEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchend", onEnd);
    };
  }, []);

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    
    // Impede o início do arraste se clicar em elementos interativos
    if (
      target.closest("button") || 
      target.closest(".no-drag") || 
      target.closest("[role='button']") ||
      target.closest(".cursor-pointer") // Cartas geralmente têm cursor-pointer
    ) {
      return;
    }

    isDragging.current = true;
    document.body.style.cursor = "row-resize";
  };

  return { opponentHeight, startDrag };
};
