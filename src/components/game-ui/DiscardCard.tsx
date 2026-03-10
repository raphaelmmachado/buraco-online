import { motion } from "framer-motion";
import { type Card as CardType } from "../../../common/types/card";
import { SuitIcon } from "./SuitIcon";
import { useGameStore } from "../../store/useGameStore";
import { getCardImageSrc } from "../../utils/card_image_map";
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
  originDirection?: ScreenDirection; // Nova prop para saber de onde vem a carta
  quantity?: number;
}

const ABILITY_DESCRIPTIONS: Record<string, string> = {
  VIEW_HAND: "VISÃO",
  STEAL_CARD: "ROUBAR",
  SKIP_TURN: "PULO",
  SAFE: "SEGURO",
  SHUFFLE_DISCARD: "LIMPEZA",
  TAX_COLLECTOR: "IMPOSTO",
  SKIP_NEXT: "BLOQUEIO",
  REVERSE: "REVERSO",
  SURGICAL_SWAP: "CIRÚRGICO",
};

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
  originDirection = "bottom",
  quantity = 0,
}: DiscardCardProps) => {
  const isAccessibilityMode = useGameStore(
    (state) => state.isAccessibilityMode,
  );
  if (!card) {
    return (
      <div
        onClick={onClick}
        className={`w-14 h-20 md:w-20 md:h-32
          text-xs tracking-wider md:text-base border-2 border-dashed border-white/10 rounded-md
          flex items-center justify-center font-black text-white/10
        ${isActionable ? "cursor-pointer hover:bg-white/5" : ""}
                ${
                  subtleHighlight
                    ? "ring-2 ring-red-500/50 bg-red-500/5 animate-pulse"
                    : ""
                }
              `}
      >
        LIXO
      </div>
    );
  }
  const isRed = card.suit.color === "red";
  const isJoker = card.value === "JOKER";
  const imageSrc = getCardImageSrc(card.value, card.suit.name);
  const abilityInfo = card.ability ? ABILITY_DESCRIPTIONS[card.ability] : null;

  // Se a carta vem de "mim" (bottom), usamos layoutId para transição mágica da mão.
  // Se vem de outros, usamos animação explícita de entrada.
  // MAS sempre mantemos layoutId para permitir que a carta "voe" para a mão de quem pegar o lixo.
  const isFromMe = originDirection === "bottom";

  const animationProps = {
    layoutId: card.id,
    ...(isFromMe
      ? {}
      : {
          initial: {
            ...getAnimationOrigin(originDirection, 800),
            opacity: 1,
            scale: 1.2,
            rotate: getStableNumber(card.id, -15, 10),
          },
          animate: { x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 },
        }),
  };

  // Logic for layers
  const showLayer1 = quantity > 1;
  const showLayer2 = quantity > 4;
  const showLayer3 = quantity > 8;
  const showLayer4 = quantity > 12;
  const showLayer5 = quantity > 16;
  const showLayer6 = quantity > 20;

  const baseLayerStyle = `absolute inset-0 bg-white rounded-md border border-slate-300 shadow-sm select-none`;

  // Accessibility Styles
  const valueClass = isAccessibilityMode
    ? "md:text-4xl text-2xl font-bold scale-y-125 origin-top"
    : "md:text-2xl font-black";

  const suitClass = isAccessibilityMode
    ? "w-5 h-5 md:w-8 md:h-8"
    : "w-3 h-3 md:w-5 md:h-5";

  let textColorClass = isRed
    ? "text-red-600"
    : isJoker
      ? "text-violet-700"
      : "text-slate-900";

  if (isAccessibilityMode) {
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
      case "joker":
        textColorClass = "text-violet-900";
        break;
    }
  }

  return (
    <div className="relative w-14 h-20 md:w-20 md:h-32 flex flex-col items-center justify-center">
      {/* Background Layers for "Messy Pile" effect */}
      {showLayer6 && (
        <div
          className={`${baseLayerStyle} -rotate-4 translate-x-0.5 -translate-y-1.5`}
        />
      )}
      {showLayer5 && (
        <div
          className={`${baseLayerStyle} -rotate-2 translate-x-1 translate-y-1`}
        />
      )}
      {showLayer4 && (
        <div
          className={`${baseLayerStyle} -rotate-6 translate-x-1.5 translate-y-1.5`}
        />
      )}
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
        key={card.id} // Force re-mount on card change to trigger animation
        {...animationProps}
        onClick={onClick}
        className={`
        relative rounded-md shadow-lg border select-none
         flex flex-col items-center p-1 z-10 w-14 h-20 md:w-20 md:h-32 justify-between
        ${
          isActionable
            ? "cursor-pointer hover:brightness-110"
            : "opacity-70 grayscale-[0.5]"
        }
        ${
          highlight
            ? "ring-4 ring-yellow-400/40 shadow-yellow-500/50 shadow-2xl z-50 border-transparent"
            : subtleHighlight
              ? "ring-4 ring-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.4)] z-10 border-transparent"
              : "border-slate-300"
        }
        ${isJoker ? "bg-linear-to-br from-violet-100 to-indigo-200 border-violet-400" : "bg-white"}
        ${textColorClass}
      `}
      >
        {/* Joker Glow Effect */}
        {isJoker && (
          <div className="absolute inset-0 bg-linear-to-br from-violet-500/10 to-transparent pointer-events-none rounded-md" />
        )}

        <div
          className={`self-start flex flex-col ${isAccessibilityMode ? "gap-y-3" : "gap-y-1"}
           items-center leading-none z-10`}
        >
          <span
            className={`${valueClass} ${isJoker && !isAccessibilityMode ? "text-[10px] md:text-base font-black tracking-tighter" : ""}`}
          >
            {isJoker ? (isAccessibilityMode ? "JK" : "JOKER") : card.value}
          </span>
          {!isJoker && <SuitIcon suit={card.suit.name} className={suitClass} />}
        </div>

        {/* IMAGEM CENTRAL */}
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={`${card.value} de ${card.suit.name}`}
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] md:-translate-y-1/2 pointer-events-none ${isAccessibilityMode ? "opacity-30" : "opacity-100"} ${isJoker ? "max-w-8 md:max-w-12" : ""}`}
            draggable={false}
          />
        ) : (
          <div
            className={`absolute inset-0 flex items-center justify-center pointer-events-none ${isAccessibilityMode ? "opacity-5" : "opacity-20"}`}
          >
            <SuitIcon suit={card.suit.name} className="w-6 h-6 md:w-8 md:h-8" />
          </div>
        )}

        {/* Joker Ability Label (Título do Poder) */}
        {isJoker && abilityInfo && (
          <div className="absolute bottom-1 md:bottom-2 left-0 right-0 px-1 text-center leading-none z-20 pointer-events-none">
            <div className="bg-violet-600 text-white text-[6px] md:text-[8px] font-black py-0.5 md:py-1 px-0.5 rounded-sm shadow-sm uppercase tracking-tighter">
              {abilityInfo}
            </div>
          </div>
        )}

        {!isAccessibilityMode && !isJoker && (
          <div
            className={`${isAccessibilityMode ? "gap-y-1 md:gap-y-2" : "gap-y-0"} 
            self-end flex flex-col items-center leading-none rotate-180 z-10`}
          >
            <span className={`${valueClass}`}>{card.value}</span>
            <SuitIcon suit={card.suit.name} className={suitClass} />
          </div>
        )}
      </motion.div>
    </div>
  );
};
