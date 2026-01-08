import { type Card as CardType } from "../../../common/types/card";

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
        w-14 h-20 md:w-16 md:h-24
        ${
          highlight
            ? "border-yellow-400 ring-2 ring-yellow-400/50 z-50 shadow-yellow-500/30"
            : "border-slate-200"
        }
        ${isRed ? "text-red-600" : "text-slate-900"}
      `}
    >
      <div className="self-start flex flex-col items-center leading-none">
        <span className="font-black text-base md:text-xl">{card.value}</span>
        <span className="text-[10px] md:text-sm">{card.suit.icon}</span>
      </div>

      <div className="text-4xl opacity-[0.06] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        {card.suit.icon}
      </div>

      <div className="self-end flex flex-col items-center leading-none rotate-180">
        <span className="font-black text-base md:text-xl">{card.value}</span>
        <span className="text-[10px] md:text-sm">{card.suit.icon}</span>
      </div>
    </div>
  );
};
