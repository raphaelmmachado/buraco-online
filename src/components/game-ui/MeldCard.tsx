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
        relative rounded-bl-none rounded-br-none rounded-md shadow-lg border bg-white select-none transition-all duration-300
        flex flex-col items-center justify-between p-0.5
        w-12 h-12 md:w-16 md:h-20
        ${
          highlight
            ? "border-yellow-400 ring-2 ring-yellow-400/50 z-50 shadow-yellow-500/30"
            : "border-slate-200"
        }
        ${isRed ? "text-red-600" : "text-slate-900"}
      `}
    >
      <div className="self-start flex flex-col items-center leading-none">
        <span className="font-black text-base md:text-2xl">{card.value}</span>
        <SuitIcon suit={card.suit.name} className="w-3 h-3 md:w-4 md:h-4" />
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-10">
        <SuitIcon suit={card.suit.name} className="w-8 h-8 md:w-12 md:h-12" />
      </div>
    </div>
  );
};
