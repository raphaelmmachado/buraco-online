import { motion } from "framer-motion";
import { type Card as CardType } from "../../../common/types/card";
import { SuitIcon } from "./SuitIcon";
import { getCardImageSrc } from "../../utils/card_image_map";
import { useGameStore } from "../../store/useGameStore";
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
  const isAccessibilityMode = useGameStore(
    (state) => state.isAccessibilityMode,
  );
  const imageSrc = getCardImageSrc(card.value, card.suit.name);

  // Estilos de texto: Mantendo simples, com ajustes md: apenas para desktop
  const valueClass = isAccessibilityMode
    ? `font-bold text-2xl md:text-4xl scale-y-125 origin-top ${card.value === "10" ? "tracking-tighter" : ""}`
    : "font-black text-lg md:text-2xl";

  const suitClass = isAccessibilityMode
    ? "w-6 h-6 md:w-8 md:h-8"
    : "w-4 h-4 md:w-5 md:h-5";

  let textColorClass = isRed ? "text-red-600" : "text-slate-900";

  if (isAccessibilityMode) {
    // Cores de alto contraste para acessibilidade
    switch (card.suit.name) {
      case "copas":
        textColorClass = "text-red-600";
        break;
      case "ouro":
        textColorClass = "text-orange-600";
        break;
      case "espadas":
        textColorClass = "text-slate-900";
        break;
      case "paus":
        textColorClass = "text-blue-900";
        break;
    }
  }

  return (
    <motion.div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`
        relative rounded-md shadow-lg border bg-white select-none
        flex flex-col items-center justify-between p-0.5 md:p-1 cursor-pointer
        w-14 h-20 md:w-20 md:h-32 transform origin-bottom isolate
        ${
          isSelected
            ? "border-yellow-400 ring-4 ring-yellow-400/30 shadow-yellow-500/50 shadow-2xl"
            : isLastDrawn
              ? "border-blue-400 ring-2 ring-blue-400/50 shadow-blue-500/30"
              : "border-slate-300"
        }
        ${textColorClass}
        ${className}
      `}
      style={style}
    >
      {/* Símbolo Topo-Esquerda */}
      <div
        className={`self-start flex flex-col items-center leading-none z-10 ${isAccessibilityMode ? "gap-y-1 md:gap-y-2" : ""}`}
      >
        <span className={valueClass}>{card.value}</span>
        <SuitIcon suit={card.suit.name} className={suitClass} />
      </div>

      {/* Imagem Central */}
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={`${card.value} de ${card.suit.name}`}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none ${isAccessibilityMode ? "opacity-30" : "opacity-100"}`}
          draggable={false}
        />
      ) : !isAccessibilityMode ? (
        <SuitIcon
          suit={card.suit.name}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 w-8 h-8 md:w-12 md:h-12 pointer-events-none`}
        />
      ) : (
        <></>
      )}

      {/* Símbolo Inferior-Direita (Invertido) - Oculto em Acessibilidade para dar foco ao valor maior */}
      {!isAccessibilityMode && (
        <div className="self-end flex flex-col items-center leading-none rotate-180 z-10">
          <span className={valueClass}>{card.value}</span>
          <SuitIcon suit={card.suit.name} className={suitClass} />
        </div>
      )}
    </motion.div>
  );
};
