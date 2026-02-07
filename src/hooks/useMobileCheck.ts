import { useState, useEffect } from "react";

export const useMobileCheck = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    isMobile: window.innerWidth < 768,
    isSmallMobile: window.innerWidth < 425,
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowSize({
        width,
        isMobile: width < 768,
        isSmallMobile: width < 425,
      });
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Check initial

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowSize;
};
