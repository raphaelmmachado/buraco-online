import { type Card as CardType } from "../../../common/types/card";
import { SuitIcon } from "./SuitIcon";

interface MeldCardProps {
  card: CardType;
  highlight?: boolean;
}

export const MeldCard = ({ card, highlight = false }: MeldCardProps) => {
  const isRed = card.color === "red";

  return (
    <div
      className={`
        relative rounded shadow-md border bg-white select-none transition-all duration-300
        flex flex-col items-center justify-between p-1
        w-12 h-16 md:w-16 md:h-24
        ${
          highlight
            ? "border-yellow-400 ring-2 ring-yellow-400/50 z-50 shadow-yellow-500/30"
            : "border-slate-200"
        }
        ${isRed ? "text-red-600" : "text-slate-900"}
      `}
    >
      <div className="self-start flex flex-col items-center leading-none">
        <span className="font-black text-sm md:text-xl">{card.value}</span>
        <SuitIcon suit={card.suit.name} className="w-3 h-3 md:w-4 md:h-4" />
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-10">
        <SuitIcon suit={card.suit.name} className="w-6 h-6 md:w-12 md:h-12" />
      </div>

      <div className="self-end flex flex-col items-center leading-none rotate-180">
        <span className="font-black text-sm md:text-xl">{card.value}</span>
        <SuitIcon suit={card.suit.name} className="w-3 h-3 md:w-4 md:h-4" />
      </div>
    </div>
  );
};
