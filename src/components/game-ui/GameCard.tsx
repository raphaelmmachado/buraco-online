import { type Card as CardType } from "../../../common/types/card";

export const GameCard = ({
  card,
  isSelected,
  onClick,
  small = false,
  hidden = false,
  disableHover = false,
}: {
  card: CardType;
  isSelected?: boolean;
  onClick?: () => void;
  small?: boolean;
  hidden?: boolean;
  disableHover?: boolean;
}) => {
  const isRed = card.color === "red";

  if (hidden) {
    return (
      <div
        onClick={onClick}
        className={`
          relative rounded-lg shadow-xl border-2 border-white/10 bg-linear-to-br from-indigo-900 via-blue-950 to-slate-900
          flex items-center justify-center overflow-hidden transition-all duration-200
          ${small ? "w-10 h-14" : "w-16 h-24 md:w-20 md:h-32"}
          ${onClick ? "cursor-pointer hover:brightness-110" : ""}
        `}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)",
            backgroundSize: "10px 10px",
          }}
        ></div>
        <div className="text-white/20 text-4xl">🃏</div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-lg shadow-lg border bg-white select-none transition-all duration-300
        flex flex-col items-center justify-between p-1
        ${small ? "w-10 h-14 text-[10px]" : "w-16 h-24 md:w-20 md:h-32"}
        ${
          isSelected
            ? "border-yellow-400 -translate-y-6 shadow-yellow-500/50 shadow-2xl z-50 ring-4 ring-yellow-400/30"
            : `border-slate-300 ${disableHover ? "" : "hover:-translate-y-2"}`
        }
        ${isRed ? "text-red-600" : "text-slate-900"}
        ${onClick ? "cursor-pointer" : ""}
      `}
    >
      <div className="self-start flex flex-col items-center leading-none">
        <span className="font-black text-lg md:text-2xl">{card.value}</span>
        <span className="text-xs md:text-sm">{card.suit.icon}</span>
      </div>

      {!small && (
        <div className="text-5xl opacity-[0.07] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          {card.suit.icon}
        </div>
      )}

      <div className="self-end flex flex-col items-center leading-none rotate-180">
        <span className="font-black text-lg md:text-2xl">{card.value}</span>
        <span className="text-xs md:text-sm">{card.suit.icon}</span>
      </div>
    </div>
  );
};
