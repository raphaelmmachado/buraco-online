import { motion } from "framer-motion";
import { type Card as CardType } from "../../../common/types/card";
import { calculate_meld_score } from "../../../common/utils/scoring";
import { useGameStore } from "../../store/useGameStore";
import { useGameStoreBots } from "../../store/useGameStoreBots";

export const MeldBadge = ({ meld }: { meld: CardType[] }) => {
  const isLocal = !useGameStore.getState().roomId;
  const onlineRules = useGameStore((s) => s.rules);
  const localRules = useGameStoreBots((s) => s.rules);
  const showAnimations = useGameStore((s) => s.showAnimations);

  const rules = isLocal ? localRules : onlineRules;
  const { score, type, length } = calculate_meld_score(meld, rules);
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
      color = "bg-purple-600 shadow-[0_0_20px_rgba(22,163,74,0.8)]";
      label = "Excelente!";
      break;
    case "ACE":
      color = "bg-green-600 shadow-[0_0_25px_rgba(147,51,234,0.9)]";
      label = "Perfeita!";
      break;
    default:
      color = "bg-slate-700";
      label = `${length} / ${rules.min_cards_for_canastra}`;
  }

  return (
    <div className="flex flex-col items-center z-20 w-full">
      <motion.div
        key={label}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={
          showAnimations
            ? { type: "spring", stiffness: 500, damping: 20 }
            : { duration: 0 }
        }
        className={`w-full ${color} flex flex-col items-center justify-center 
        p-1 rounded-md rounded-tl-none rounded-tr-none shadow-lg border border-white/10`}
      >
        <span className="text-xs md:text-sm text-white font-black uppercase tracking-widest">
          {label}
        </span>
      </motion.div>
      <motion.span
        key={score}
        initial={{ scale: 1.5, color: "#ffff00" }}
        animate={{ scale: 1, color: "#ffffff" }}
        transition={showAnimations ? {} : { duration: 0 }}
        className="text-[10px] md:text-xs text-white/60 font-black drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] mt-0.5"
      >
        {score} pts
      </motion.span>
    </div>
  );
};
