import { type Card as CardType } from "../../../common/types/card";
import { SuitIcon } from "./SuitIcon";

interface HandCardProps {
  card: CardType;
  isSelected: boolean;
  isLastDrawn?: boolean;
  onClick: () => void;
  index: number;
  totalCards: number;
  isMobile: boolean;
}

export const HandCard = ({
  card,
  isSelected,
  isLastDrawn,
  onClick,
  index,
  totalCards,
  isMobile,
}: HandCardProps) => {
  const isRed = card.color === "red";
  const center = (totalCards - 1) / 2;

  // Desktop values
  const rotateDesktop = (index - center) * 2;
  const translateYDesktop = Math.abs(index - center) * 1;

  // Mobile values (More subtle fan)
  const rotateMobile = (index - center) * 1; // curvatura do leque
  const translateYMobile = Math.abs(index - center) * 1; // arco
  const dynamicStyle = {
    zIndex: index,
    transform: isSelected
      ? isMobile
        ? `translateY(${translateYMobile - 15}px) rotate(${rotateMobile}deg)`
        : `translateY(${
            translateYDesktop - 24
          }px) rotate(${rotateDesktop}deg) scale(1.05)`
      : isMobile
      ? `translateY(${translateYMobile}px) rotate(${rotateMobile}deg)`
      : `translateY(${translateYDesktop}px) rotate(${rotateDesktop}deg)`,
  };

  const { color, name, icon } = card.suit;
  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-md shadow-lg border bg-white select-none transition-all duration-300
        flex flex-col items-center justify-between md:p-1 cursor-pointer
        w-14 h-20 md:w-20 md:h-32 transform origin-bottom mb-5
        ${
          isSelected
            ? "border-yellow-400 ring-4 ring-yellow-400/30 shadow-yellow-500/50 shadow-2xl"
            : isLastDrawn
            ? "border-blue-400 ring-2 ring-blue-400/50 shadow-blue-500/30"
            : "border-slate-300 hover:-translate-y-2 md:hover:-translate-y-4"
        }
        ${isRed ? "text-red-600" : "text-slate-900"}
      `}
      style={dynamicStyle}
    >
      <div className="self-start flex flex-col gap-y-1 items-center leading-none">
        <span className="font-black md:text-2xl">{card.value}</span>
        <SuitIcon suit={name} className={` w-4 h-4 md:w-5 md:h-5`} />
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20">
        <SuitIcon suit={name} className="w-8 h-8 md:w-16 md:h-16" />
      </div>

      <div className="self-end flex flex-col items-center  gap-y-1  leading-none rotate-180">
        <span className="font-black md:text-2xl">{card.value}</span>
        <SuitIcon suit={name} className="w-4 h-4 md:w-5 md:h-5" />
      </div>
    </div>
  );
};
