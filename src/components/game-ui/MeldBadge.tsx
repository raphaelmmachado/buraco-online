import { type Card as CardType } from "../../../common/types/card";
import { calculate_meld_score } from "../../../common/utils/scoring";

export const MeldBadge = ({ meld }: { meld: CardType[] }) => {
  const { score, type, length } = calculate_meld_score(meld);
  if (length < 3) return null;

  let color: string;
  let label: string;

  switch (type) {
    case "CLEAN":
      color = "bg-blue-600";
      label = "Limpa";
      break;
    case "DIRTY":
      color = "bg-amber-600";
      label = "Suja";
      break;
    case "KING":
      color = "bg-green-600";
      label = "EXCELENTE";
      break;
    case "ACE":
      color = "bg-purple-600";
      label = "PERFEITA";
      break;
    default:
      label = `Faltam ${Math.abs(length - 7)} cartas`;
      color = "bg-slate-700";
  }

  return (
    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center z-20 min-w-max">
      <span
        className={`${color} text-[8px] md:text-[10px] text-white font-black px-2.5 py-0.5 rounded-full shadow-lg uppercase tracking-widest border border-white/10`}
      >
        {label}
      </span>
      <span className="text-[10px] text-white font-black drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] mt-0.5">
        {score} pts
      </span>
    </div>
  );
};
