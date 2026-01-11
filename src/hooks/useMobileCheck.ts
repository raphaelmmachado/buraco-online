import { useState, useEffect } from "react";

export const useMobileCheck = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    isMobile: window.innerWidth < 768,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        isMobile: window.innerWidth < 768,
      });
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Check initial

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowSize;
};
