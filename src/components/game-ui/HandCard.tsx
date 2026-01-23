import { motion } from "framer-motion";
import { type Card as CardType } from "../../../common/types/card";
import { SuitIcon } from "./SuitIcon";
import { getCardImageSrc } from "../../utils/card_image_map";
interface HandCardProps {
  card: CardType;
  isSelected: boolean;
  isLastDrawn?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const HandCard = ({
  card,
  isSelected,
  isLastDrawn,
  onClick,
  style,
  className = "",
  onMouseEnter,
  onMouseLeave,
}: HandCardProps) => {
  const isRed = card.color === "red";

  const imageSrc = getCardImageSrc(card.value, card.suit.name);

  return (
    <motion.div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`
        relative rounded-md shadow-lg border bg-white select-none
        flex flex-col items-center justify-between md:p-1 cursor-pointer
        w-14 h-20 md:w-20 md:h-32 transform origin-bottom
        ${
          isSelected
            ? "border-yellow-400 ring-4 ring-yellow-400/30 shadow-yellow-500/50 shadow-2xl"
            : isLastDrawn
              ? "border-blue-400 ring-2 ring-blue-400/50 shadow-blue-500/30"
              : "border-slate-300"
        }
        ${isRed ? "text-red-600" : "text-slate-900"}
        ${className}
      `}
      style={style}
    >
      <div className="self-start flex flex-col gap-y-1 items-center leading-none">
        <span className="font-black md:text-2xl">{card.value}</span>
        <SuitIcon suit={card.suit.name} className={` w-4 h-4 md:w-5 md:h-5`} />
      </div>

      {imageSrc ? (
        // --- MODO IMAGEM ---
        <img
          src={imageSrc}
          alt={`${card.value} de ${card.suit.name}`}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          draggable={false}
        />
      ) : (
        // --- MODO LEGADO (FALLBACK) ---
        // Mantém o código antigo aqui para cartas que ainda não têm desenho
        <>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20">
            <SuitIcon
              suit={card.suit.name}
              className="w-8 h-8 md:w-16 md:h-16"
            />
          </div>
        </>
      )}

      <div className="self-end flex flex-col items-center  gap-y-1  leading-none rotate-180">
        <span className="font-black md:text-2xl">{card.value}</span>
        <SuitIcon suit={card.suit.name} className="w-4 h-4 md:w-5 md:h-5" />
      </div>
    </motion.div>
  );
};
