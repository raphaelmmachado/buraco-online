import { useMemo } from "react";
import { motion } from "framer-motion";
import { type Card as CardType } from "../../../common/types/card";
import { SuitIcon } from "./SuitIcon";
import { useGameStore } from "../../store/useGameStore";
import {
  type ScreenDirection,
  getAnimationOrigin,
} from "../../utils/animation_utils";

interface MeldCardProps {
  card: CardType;
  highlight?: boolean;
  enterFrom?: ScreenDirection;
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
}: MeldCardProps) => {
  const isRed = card.color === "red";
  const isAccessibilityMode = useGameStore((state) => state.isAccessibilityMode);
  // Se enterFrom for 'bottom', podemos usar layoutId (se a carta veio da minha mão)
  // Mas como a carta pode ter vindo do monte ou lixo para a mão e depois para a mesa,
  // e o ID é o mesmo, o layoutId funciona perfeitamente para "Mim".
  // Para outros jogadores, usamos a animação de entrada explícita.

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
          // transition: removed to use MotionConfig context
        };
  }, [isFromMe, card.id, enterFrom]);

  // Accessibility Styles
  const valueClass = isAccessibilityMode
    ? `font-bold text-xl md:text-3xl scale-y-125 origin-top ${card.value === '10' ? 'tracking-tighter' : ''}`
    : "font-black text-base md:text-2xl";

  const suitClass = isAccessibilityMode
    ? "w-4 h-4 md:w-6 md:h-6"
    : "w-3 h-3 md:w-4 md:h-4";

  let textColorClass = isRed ? "text-red-600" : "text-slate-900";
  if (isAccessibilityMode) {
    switch (card.suit.name) {
      case "copas": textColorClass = "text-red-600"; break;
      case "ouro": textColorClass = "text-orange-600"; break;
      case "espadas": textColorClass = "text-slate-900"; break;
      case "paus": textColorClass = "text-blue-900"; break;
    }
  }

  return (
    <motion.div
      {...animationProps}
      className={`
        relative rounded-bl-none rounded-br-none rounded-md shadow-lg border bg-white select-none
        flex flex-col items-center justify-between p-0.5
        w-12 h-12 md:w-16 md:h-20
        ${
          highlight
            ? "border-yellow-400 ring-2 ring-yellow-400/50 z-50 shadow-yellow-500/30"
            : "border-slate-200"
        }
        ${textColorClass}
      `}
    >
      <div className={`self-start flex flex-col ${isAccessibilityMode ? 'gap-y-0.5 md:gap-y-2' : ''} items-center leading-none z-10`}>
        <span className={valueClass}>{card.value}</span>
        <SuitIcon suit={card.suit.name} className={suitClass} />
      </div>

      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none ${isAccessibilityMode ? 'opacity-5' : 'opacity-10'}`}>
        <SuitIcon suit={card.suit.name} className="w-8 h-8 md:w-12 md:h-12" />
      </div>
    </motion.div>
  );
};
