import { type Card as CardType } from "../../../common/types/card";
import { SuitIcon } from "./SuitIcon";

interface DiscardCardProps {
  card?: CardType;
  onClick: () => void;
  isActionable: boolean;
  highlight: boolean;
  subtleHighlight?: boolean;
  mini?: boolean;
}

export const DiscardCard = ({
  card,
  onClick,
  isActionable,
  highlight,
  subtleHighlight = false,
  mini = false,
}: DiscardCardProps) => {
  if (!card) {
    return (
      <div
        onClick={onClick}
        className={`${mini ? "w-10 h-14" : "w-14 h-20 md:w-20 md:h-32"}
          text-xs tracking-wider md:text-base border-2 border-dashed border-white/10 rounded-md
          flex items-center justify-center font-black text-white/10
        ${isActionable ? "cursor-pointer hover:bg-white/5" : ""}
        ${
          subtleHighlight
            ? "ring-2 ring-slate-400/30 bg-slate-400/5 animate-pulse"
            : ""
        }`}
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
        relative rounded-md shadow-lg border bg-white select-none transition-all
         duration-300 flex flex-col items-center p-1 font-black
        ${
          mini
            ? "w-10 h-14 justify-center"
            : "w-14 h-20 md:w-20 md:h-32 justify-between"
        }
        ${
          isActionable
            ? "cursor-pointer hover:brightness-110"
            : "opacity-70 grayscale-[0.5]"
        }
        ${
          highlight
            ? "ring-4 ring-yellow-400 shadow-yellow-500/50 shadow-2xl z-50"
            : subtleHighlight
            ? "ring-2 ring-slate-400/40 shadow-[0_0_15px_rgba(148,163,184,0.3)] z-10"
            : "border-slate-300"
        }
        ${isRed ? "text-red-600" : "text-slate-900"}
      `}
    >
      <div className="md:self-start flex flex-col items-center leading-none">
        <span className={`${mini ? "text-sm" : "md:text-2xl"}`}>
          {card.value}
        </span>
        <SuitIcon
          suit={card.suit.name}
          className={mini ? "w-4 h-4" : "w-3 h-3 md:w-5 md:h-5"}
        />
      </div>
      {!mini && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20">
          <SuitIcon
            suit={card.suit.name}
            className={mini ? "w-5 h-5" : "w-8 h-8 md:w-16 md:h-16"}
          />
        </div>
      )}

      {!mini && (
        <div className="self-end flex flex-col items-center leading-none rotate-180">
          <span className={`${mini ? "text-[10px]" : "text-xs md:text-2xl"}`}>
            {card.value}
          </span>
          <SuitIcon
            suit={card.suit.name}
            className={mini ? "w-2.5 h-2.5" : "w-3 h-3 md:w-5 md:h-5"}
          />
        </div>
      )}
    </div>
  );
};
