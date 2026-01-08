import { type Card as CardType } from "../../../common/types/card";

interface DiscardCardProps {
  card?: CardType;
  onClick: () => void;
  isActionable: boolean;
  highlight: boolean;
}

export const DiscardCard = ({
  card,
  onClick,
  isActionable,
  highlight,
}: DiscardCardProps) => {
  if (!card) {
    return (
      <div
        onClick={onClick}
        className={`w-10 h-16 md:w-20 md:h-32 border-2 border-dashed 
                   border-white/10 rounded-lg flex items-center justify-center text-[10px] font-black text-white/10
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
        relative rounded-lg shadow-lg border bg-white select-none transition-all duration-300
        flex flex-col items-center justify-between p-1
        w-16 h-24 md:w-20 md:h-32
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
        <span className="font-black text-lg md:text-2xl">{card.value}</span>
        <span className="text-xs md:text-sm">{card.suit.icon}</span>
      </div>

      <div className="text-5xl opacity-[0.07] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        {card.suit.icon}
      </div>

      <div className="self-end flex flex-col items-center leading-none rotate-180">
        <span className="font-black text-lg md:text-2xl">{card.value}</span>
        <span className="text-xs md:text-sm">{card.suit.icon}</span>
      </div>
    </div>
  );
};
