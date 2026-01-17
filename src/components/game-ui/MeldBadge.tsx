import { type Card as CardType } from "../../../common/types/card";
import { calculate_meld_score } from "../../../common/utils/scoring";

export const MeldBadge = ({ meld }: { meld: CardType[] }) => {
  const { score, type, length } = calculate_meld_score(meld);
  if (length < 3) return null;

  let color: string;
  let label: string;

  switch (type) {
    case "CLEAN":
      color = "bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.6)]";
      label = "Limpa";
      break;
    case "DIRTY":
      color = "bg-amber-600";
      label = "Suja";
      break;
    case "KING":
      color =
        "bg-green-600 shadow-[0_0_20px_rgba(22,163,74,0.8)] animate-pulse";
      label = "Excelente!";
      break;
    case "ACE":
      color =
        "bg-purple-600 shadow-[0_0_25px_rgba(147,51,234,0.9)] animate-bounce";
      label = "Perfeita!";
      break;
    default:
      label = `Faltam ${Math.abs(length - 7)}`;
      color = "bg-slate-700";
  }

  return (
    <div className="flex flex-col items-center z-20">
      <span
        className={`w-full ${color} text-center text-xs md:text-sm
         text-white font-black p-1 rounded-md rounded-tl-none rounded-tr-none shadow-lg uppercase tracking-widest border border-white/10`}
      >
        {label}
      </span>
      <span className="text-xs text-white font-black drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] mt-0.5">
        {score} pts
      </span>
    </div>
  );
};
