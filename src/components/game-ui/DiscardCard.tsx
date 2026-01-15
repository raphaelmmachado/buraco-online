import { motion } from "framer-motion";
import { type Card as CardType } from "../../../common/types/card";
import { SuitIcon } from "./SuitIcon";
import {
  type ScreenDirection,
  getAnimationOrigin,
} from "../../utils/animation_utils";

interface DiscardCardProps {
  card?: CardType;
  onClick: () => void;
  isActionable: boolean;
  highlight: boolean;
  subtleHighlight?: boolean;
  mini?: boolean;
  originDirection?: ScreenDirection; // Nova prop para saber de onde vem a carta
  quantity?: number;
}
function getStableNumber(id: string, min: number, max: number) {
  let hash = 0;
  // Transforma a string do ID em um número (soma dos códigos ASCII)
  for (let i = 0; i < id.length; i++) {
    hash += id.charCodeAt(i);
  }

  const amplitude = max - min;
  // O operador % garante que o número não exceda a amplitude
  // O + min ajusta o ponto de partida
  return (hash % (amplitude + 1)) + min;
}
export const DiscardCard = ({
  card,
  onClick,
  isActionable,
  highlight,
  subtleHighlight = false,
  mini = false,
  originDirection = "bottom",
  quantity = 0,
}: DiscardCardProps) => {
  if (!card) {
    return (
      <div
        onClick={onClick}
        className={`${mini ? "w-10 h-14" : "w-14 h-20 md:w-20 md:h-32"}
          text-xs tracking-wider md:text-base border-2 border-dashed border-white/10 rounded-md
          flex items-center justify-center font-black text-white/10
        ${isActionable ? "cursor-pointer hover:bg-white/5" : ""}
        ${
          subtleHighlight
            ? "ring-2 ring-slate-400/30 bg-slate-400/5 animate-pulse"
            : ""
        }`}
      >
        LIXO
      </div>
    );
  }
  const isRed = card.suit.color === "red";
  // Se a carta vem de "mim" (bottom), usamos layoutId para transição mágica da mão.
  // Se vem de outros, usamos animação explícita de entrada.
  const isFromMe = originDirection === "bottom";
  const animationProps = isFromMe
    ? { layoutId: card.id }
    : {
        initial: {
          ...getAnimationOrigin(originDirection, 800),
          opacity: 1,
          scale: 1.2,
          rotate: getStableNumber(card.id, -15, 10), // Mais rotação para descarte
        },
        animate: { x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 },
        // transition: removed to use MotionConfig context
      };

  // Logic for layers
  const showLayer1 = quantity > 1;
  const showLayer2 = quantity > 3;
  const showLayer3 = quantity > 6;

  const baseLayerStyle = `absolute inset-0 bg-white rounded-md border border-slate-300 shadow-sm select-none`;

  return (
    <div
      className={`relative ${
        mini ? "w-10 h-14" : "w-14 h-20 md:w-20 md:h-32"
      } flex flex-col items-center justify-center`}
    >
      {/* Background Layers for "Messy Pile" effect */}
      {showLayer3 && (
        <div
          className={`${baseLayerStyle} -rotate-6 translate-x-1 translate-y-1`}
        />
      )}
      {showLayer2 && (
        <div
          className={`${baseLayerStyle} rotate-4 translate-x-1 -translate-y-0.5`}
        />
      )}
      {showLayer1 && (
        <div
          className={`${baseLayerStyle} -rotate-2 -translate-x-0.5 translate-y-0.5`}
        />
      )}

      <motion.div
        {...animationProps}
        onClick={onClick}
        className={`
        relative rounded-md shadow-lg border bg-white select-none
         flex flex-col items-center p-1 font-black z-10
        ${
          mini
            ? "w-10 h-14 justify-center"
            : "w-14 h-20 md:w-20 md:h-32 justify-between"
        }
        ${
          isActionable
            ? "cursor-pointer hover:brightness-110"
            : "opacity-70 grayscale-[0.5]"
        }
        ${
          highlight
            ? "ring-4 ring-yellow-400/40 shadow-yellow-500/50 shadow-2xl z-50"
            : subtleHighlight
            ? "ring-2 ring-slate-400/40 shadow-[0_0_15px_rgba(148,163,184,0.3)] z-10"
            : "border-slate-300"
        }
        ${isRed ? "text-red-600" : "text-slate-900"}
      `}
      >
        <div className="md:self-start flex flex-col items-center leading-none">
          <span className={`${mini ? "text-sm" : "md:text-2xl"}`}>
            {card.value}
          </span>
          <SuitIcon
            suit={card.suit.name}
            className={mini ? "w-4 h-4" : "w-3 h-3 md:w-5 md:h-5"}
          />
        </div>
        {!mini && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20">
            <SuitIcon
              suit={card.suit.name}
              className={mini ? "w-5 h-5" : "w-8 h-8 md:w-16 md:h-16"}
            />
          </div>
        )}

        {!mini && (
          <div className="self-end flex flex-col items-center leading-none rotate-180">
            <span
              className={`${mini ? "text-[10px]" : "text-xs md:text-2xl"}`}
            >
              {card.value}
            </span>
            <SuitIcon
              suit={card.suit.name}
              className={mini ? "w-2.5 h-2.5" : "w-3 h-3 md:w-5 md:h-5"}
            />
          </div>
        )}
      </motion.div>
    </div>
  );
};
