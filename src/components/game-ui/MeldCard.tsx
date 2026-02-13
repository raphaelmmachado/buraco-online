import { useMemo } from "react";
import { motion } from "framer-motion";
import { type Card as CardType } from "../../../common/types/card";
import { SuitIcon } from "./SuitIcon";
import { useGameStore } from "../../store/useGameStore";
import { getCardImageSrc } from "../../utils/card_image_map";
import {
  type ScreenDirection,
  getAnimationOrigin,
} from "../../utils/animation_utils";

interface MeldCardProps {
  card: CardType;
  highlight?: boolean;
  enterFrom?: ScreenDirection;
  style?: React.CSSProperties;
}
// Função auxiliar fora do componente (Pura)
const stableRotation = (id: string) => {
  // Cria um hash simples somando os caracteres do ID
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash += id.charCodeAt(i);
  }
  // Retorna um número entre -10 e 10 baseado no hash
  return (hash % 21) - 10;
};

export const MeldCard = ({
  card,
  highlight = false,
  enterFrom = "bottom",
  style,
}: MeldCardProps) => {
  const isRed = card.color === "red";
  const isJoker = card.value === "JOKER";
  const isAccessibilityMode = useGameStore(
    (state) => state.isAccessibilityMode,
  );
  
  const imageSrc = getCardImageSrc(card.value, card.suit.name);

  const isFromMe = enterFrom === "bottom";

  const animationProps = useMemo(() => {
    return isFromMe
      ? { layoutId: card.id }
      : {
          initial: {
            ...getAnimationOrigin(enterFrom, 800), // Garante offscreen
            opacity: 1, // Visível desde fora
            scale: 1.2, // Sensação de altura/profundidade
            rotate: stableRotation(card.id), // Rotação aleatória (-10 a 10 graus)
          },
          animate: {
            x: 0,
            y: 0,
            opacity: 1,
            scale: 1,
            rotate: 0,
          },
        };
  }, [isFromMe, card.id, enterFrom]);

  // Accessibility Styles
  const valueClass = isAccessibilityMode
    ? `font-bold text-xl md:text-3xl scale-y-125 origin-top ${card.value === "10" ? "tracking-tighter" : ""}`
    : "font-black text-sm md:text-2xl";

  const suitClass = isAccessibilityMode
    ? "w-4 h-4 md:w-6 md:h-6"
    : "w-2.5 h-2.5 md:w-4 md:h-4";

  let textColorClass = isRed
    ? "text-red-600"
    : isJoker
      ? "text-violet-700"
      : "text-slate-900";

  if (isAccessibilityMode) {
    const contrastColors: Record<string, string> = {
      copas: "text-red-600",
      ouro: "text-orange-600",
      espadas: "text-slate-900",
      paus: "text-blue-900",
      joker: "text-violet-900",
    };
    textColorClass = contrastColors[card.suit.name] || textColorClass;
  }

  return (
    <motion.div
      {...animationProps}
      style={style}
      className={`
        relative rounded-bl-none rounded-br-none rounded-md shadow-lg border select-none
        flex flex-col items-center justify-between p-0.5
        w-11  md:w-16 md:h-20 ${isAccessibilityMode ? "h-12" : "h-11"}
        ${
          highlight
            ? "border-yellow-400 ring-2 ring-yellow-400/50 z-50 shadow-yellow-500/30"
            : "border-slate-200"
        }
        ${isJoker ? "bg-linear-to-br from-violet-100 to-indigo-200 border-violet-400" : "bg-white"}
        ${textColorClass}
      `}
    >
      {/* Joker Glow Effect */}
      {isJoker && (
        <div className="absolute inset-0 bg-linear-to-br from-violet-500/5 to-transparent pointer-events-none rounded-md" />
      )}

      {/* Símbolo Topo-Esquerda */}
      <div
        className={`self-start flex flex-col ${isAccessibilityMode ? "gap-y-0.5 md:gap-y-2" : ""} items-center leading-none z-10`}
      >
        <span className={valueClass}>{isJoker ? "JK" : card.value}</span>
        {!isJoker && <SuitIcon suit={card.suit.name} className={suitClass} />}
      </div>

      {/* Imagem Central */}
      {imageSrc ? (
        <img
          src={imageSrc}
          alt="Card illustration"
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none ${isAccessibilityMode ? "opacity-20" : "opacity-100"} ${isJoker ? "max-w-8 md:max-w-10" : "max-w-6 md:max-w-8 opacity-10"}`}
          draggable={false}
        />
      ) : (
        <div
          className={`${isAccessibilityMode ? "opacity-0" : "opacity-10"} absolute inset-0 flex items-center justify-center pointer-events-none `}
        >
          <SuitIcon suit={card.suit.name} className="w-5 h-5 md:w-7 md:h-7" />
        </div>
      )}

      {/* Símbolo Inferior (Oculto em Joker para manter o estilo limpo) */}
      {!isAccessibilityMode && !isJoker && (
        <div
          className={`self-end rotate-180 flex flex-col items-center leading-none z-10`}
        >
          <span className={valueClass}>{card.value}</span>
          <SuitIcon suit={card.suit.name} className={suitClass} />
        </div>
      )}
    </motion.div>
  );
};
