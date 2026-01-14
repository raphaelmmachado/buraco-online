import { motion } from "framer-motion";
import { type Card as CardType } from "../../../common/types/card";
import { SuitIcon } from "./SuitIcon";
import {
  type ScreenDirection,
  getAnimationOrigin,
} from "../../utils/animation_utils";

interface MeldCardProps {
  card: CardType;
  highlight?: boolean;
  enterFrom?: ScreenDirection;
}

export const MeldCard = ({
  card,
  highlight = false,
  enterFrom = "bottom",
}: MeldCardProps) => {
  const isRed = card.color === "red";
  // Se enterFrom for 'bottom', podemos usar layoutId (se a carta veio da minha mão)
  // Mas como a carta pode ter vindo do monte ou lixo para a mão e depois para a mesa,
  // e o ID é o mesmo, o layoutId funciona perfeitamente para "Mim".
  // Para outros jogadores, usamos a animação de entrada explícita.

  const isFromMe = enterFrom === "bottom";

  const animationProps = isFromMe
    ? { layoutId: card.id }
    : {
        initial: {
          ...getAnimationOrigin(enterFrom, 800), // Garante offscreen
          opacity: 1, // Visível desde fora
          scale: 1.2, // Sensação de altura/profundidade
          rotate: Math.random() * 20 - 10, // Rotação aleatória (-10 a 10 graus)
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
    </motion.div>
  );
};
