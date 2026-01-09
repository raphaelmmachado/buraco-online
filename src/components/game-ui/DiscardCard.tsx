import { type Card as CardType } from "../../../common/types/card";
import { SuitIcon } from "./SuitIcon";

interface DiscardCardProps {
  card?: CardType;
  onClick: () => void;
  isActionable: boolean;
  highlight: boolean;
  mini?: boolean;
}

export const DiscardCard = ({
  card,
  onClick,
  isActionable,
  highlight,
  mini = false,
}: DiscardCardProps) => {
  if (!card) {
    return (
      <div
        onClick={onClick}
        className={`${
          mini ? "w-10 h-14 text-[8px]" : "w-14 h-20 md:w-20 md:h-32 text-[10px]"
        } border-2 border-dashed 
                   border-white/10 rounded-md flex items-center justify-center font-black text-white/10
                   ${isActionable ? "cursor-pointer hover:bg-white/5" : ""}`}
      >
        LIXO
      </div>
    );
  }

  const isRed = card.color === "red";

  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-md shadow-lg border bg-white select-none transition-all duration-300
        flex flex-col items-center justify-between p-1
        ${mini ? "w-10 h-14" : "w-14 h-20 md:w-20 md:h-32"}
        ${
          isActionable
            ? "cursor-pointer hover:brightness-110"
            : "opacity-70 grayscale-[0.5]"
        }
        ${
          highlight
            ? "ring-4 ring-yellow-400 shadow-yellow-500/50 shadow-2xl z-50"
            : "border-slate-300"
        }
        ${isRed ? "text-red-600" : "text-slate-900"}
      `}
    >
      <div className="self-start flex flex-col items-center leading-none">
        <span
          className={`font-black ${
            mini ? "text-[10px]" : "text-xs md:text-2xl"
          }`}
        >
          {card.value}
        </span>
        <SuitIcon
          suit={card.suit.name}
          className={mini ? "w-2.5 h-2.5" : "w-3 h-3 md:w-5 md:h-5"}
        />
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20">
        <SuitIcon
          suit={card.suit.name}
          className={mini ? "w-5 h-5" : "w-8 h-8 md:w-16 md:h-16"}
        />
      </div>

      <div className="self-end flex flex-col items-center leading-none rotate-180">
        <span
          className={`font-black ${
            mini ? "text-[10px]" : "text-xs md:text-2xl"
          }`}
        >
          {card.value}
        </span>
        <SuitIcon
          suit={card.suit.name}
          className={mini ? "w-2.5 h-2.5" : "w-3 h-3 md:w-5 md:h-5"}
        />
      </div>
    </div>
  );
};
