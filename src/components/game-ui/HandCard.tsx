import { useState, useEffect } from "react";
import { type Card as CardType } from "../../../common/types/card";
import { SuitIcon } from "./SuitIcon";

interface HandCardProps {
  card: CardType;
  isSelected: boolean;
  onClick: () => void;
  index: number;
  totalCards: number;
}

export const HandCard = ({
  card,
  isSelected,
  onClick,
  index,
  totalCards,
}: HandCardProps) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const isRed = card.color === "red";
  const center = (totalCards - 1) / 2;
  
  // Desktop values
  const rotateDesktop = (index - center) * 4;
  const translateYDesktop = Math.abs(index - center) * 4;

  // Mobile values (More subtle fan)
  const rotateMobile = (index - center) * 2; 
  const translateYMobile = Math.abs(index - center) * 2;

  const dynamicStyle = {
    zIndex: index,
    transform: isSelected
      ? `translateY(${isMobile ? "-10px" : "-20px"}) rotate(0deg)`
      : isMobile
      ? `translateY(${translateYMobile}px) rotate(${rotateMobile}deg)`
      : `translateY(${translateYDesktop}px) rotate(${rotateDesktop}deg)`,
  };

  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-lg shadow-lg border bg-white select-none transition-all duration-300
        flex flex-col items-center justify-between p-1 cursor-pointer
        w-14 h-20 md:w-20 md:h-32 transform origin-bottom
        ${
          isSelected
            ? "-translate-y-8 md:-translate-y-12 z-100 scale-105 border-yellow-400 ring-4 ring-yellow-400/30 shadow-yellow-500/50 shadow-2xl"
            : "border-slate-300 hover:-translate-y-4 md:hover:-translate-y-6 hover:z-90"
        }
        ${isRed ? "text-red-600" : "text-slate-900"}
      `}
      style={dynamicStyle}
    >
      <div className="self-start flex flex-col items-center leading-none">
        <span className="font-black text-sm md:text-2xl">{card.value}</span>
        <SuitIcon suit={card.suit.name} className="w-3 h-3 md:w-5 md:h-5" />
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20">
        <SuitIcon suit={card.suit.name} className="w-8 h-8 md:w-16 md:h-16" />
      </div>

      <div className="self-end flex flex-col items-center leading-none rotate-180">
        <span className="font-black text-sm md:text-2xl">{card.value}</span>
        <SuitIcon suit={card.suit.name} className="w-3 h-3 md:w-5 md:h-5" />
      </div>
    </div>
  );
};
