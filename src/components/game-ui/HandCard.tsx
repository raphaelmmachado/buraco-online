import { motion, AnimatePresence } from "framer-motion";
import { type Card as CardType } from "../../../common/types/card";
import { SuitIcon } from "./SuitIcon";
import { getCardImageSrc } from "../../utils/card_image_map";
import { useGameStore } from "../../store/useGameStore";
import { Palette, X } from "lucide-react";
import { useState } from "react";

interface HandCardProps {
  card: CardType;
  isSelected: boolean;
  isLastDrawn?: boolean;
  onClick?: () => void;
  onUseJoker?: (cardId: string) => void;
  style?: React.CSSProperties;
  className?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  markerColor?: string | null;
  onSetMarker?: (color: string | null) => void;
}

const MARKER_COLORS = [
  { name: "Limpar", color: null, class: "bg-slate-200" },
  { name: "Amarelo", color: "#facc15", class: "bg-yellow-400" },
  { name: "Azul", color: "#3b82f6", class: "bg-blue-500" },
  { name: "Vermelho", color: "#ef4444", class: "bg-red-500" },
];

const ABILITY_DESCRIPTIONS: Record<string, string> = {
  VIEW_HAND: "VISÃO: Veja a mão do próximo",
  STEAL_CARD: "ROUBAR: Pegue uma carta do próximo",
  SKIP_TURN: "PULO: Pule o descarte e encerre",
  SWAP_PARTNER: "TROCA: Troque carta com parceiro",
};

export const HandCard = ({
  card,
  isSelected,
  isLastDrawn,
  onClick,
  onUseJoker,
  style,
  className = "",
  onMouseEnter,
  onMouseLeave,
  markerColor,
  onSetMarker,
}: HandCardProps) => {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerDirection, setPickerDirection] = useState<"left" | "right">(
    "left",
  );

  const handlePaletteClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Detectar se a carta está muito à esquerda da tela
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.left < 60) {
      setPickerDirection("right");
    } else {
      setPickerDirection("left");
    }

    setShowPicker(!showPicker);
  };
  const isRed = card.color === "red";
  const isJoker = card.value === "JOKER";
  const abilityInfo = card.ability ? ABILITY_DESCRIPTIONS[card.ability] : null;

  const isAccessibilityMode = useGameStore(
    (state) => state.isAccessibilityMode,
  );
  const imageSrc = getCardImageSrc(card.value, card.suit.name);

  // Estilos de texto: Mantendo simples, com ajustes md: apenas para desktop
  const valueClass = isAccessibilityMode
    ? `font-bold text-2xl md:text-4xl scale-y-125 origin-top ${card.value === "10" ? "tracking-tighter" : ""}`
    : "font-black md:text-2xl";

  const suitClass = isAccessibilityMode
    ? "w-6 h-6 md:w-8 md:h-8"
    : "w-4 h-4 md:w-5 md:h-5";

  let textColorClass = isRed
    ? "text-red-600"
    : isJoker
      ? "text-violet-700"
      : "text-slate-900";

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
      case "joker":
        textColorClass = "text-violet-900";
        break;
    }
  }

  // Joker Power Overlay (Visible when selected or hovered)
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      onClick={onClick}
      onMouseEnter={() => {
        setIsHovered(true);
        onMouseEnter?.();
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        onMouseLeave?.();
      }}
      className={`
        relative rounded-md shadow-lg border select-none
        flex flex-col items-center justify-between p-0.5 md:p-1 cursor-pointer
        w-14 h-20 md:w-20 md:h-32 transform origin-bottom isolate group
        ${
          isSelected
            ? "border-yellow-400 ring-4 ring-yellow-400/30 shadow-yellow-500/50 shadow-2xl z-50"
            : isLastDrawn
              ? "border-blue-400 ring-2 ring-blue-400/50 shadow-blue-500/30"
              : "border-slate-300"
        }
        ${isJoker ? "bg-linear-to-br from-violet-100 to-indigo-200 border-violet-400" : "bg-white"}
        ${textColorClass}
        ${className}
      `}
      style={style}
    >
      {/* Joker Power Overlay (Visible when selected or hovered) */}
      <AnimatePresence>
        {isJoker && (isSelected || isHovered) && abilityInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="absolute -top-14 md:-top-16 left-1/2 -translate-x-1/2 w-28 md:w-40 bg-violet-900/95 backdrop-blur-md border border-violet-400 text-white p-1.5 md:p-2 rounded-xl shadow-2xl z-50 pointer-events-none"
          >
            <div className="text-[7px] md:text-[10px] font-black uppercase tracking-widest text-violet-300 mb-0.5 md:mb-1">
              Poder Ativo
            </div>
            <div className="text-[9px] md:text-xs font-bold leading-tight">
              {abilityInfo}
            </div>
            {/* Arrow pointing down */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] md:border-8 border-transparent border-t-violet-900" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Joker Glow Effect */}
      {isJoker && (
        <div className="absolute inset-0 bg-linear-to-br from-violet-500/10 to-transparent pointer-events-none rounded-md" />
      )}

      {/* Marcador de Cor (Bookmark/Ribbon Style) */}
      {markerColor && (
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute -top-1 left-5 w-3 h-5 md:w-4 md:h-7 shadow-md z-30 rounded-b-sm border-x border-b border-black/10"
          style={{
            backgroundColor: markerColor,
            backgroundImage:
              "linear-gradient(to bottom, rgba(255,255,255,0.2), transparent)",
          }}
        >
          {/* Detalhe da dobra da fita no topo */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-black/10" />
        </motion.div>
      )}

      {/* Símbolo Topo-Esquerda */}
      <div
        className={`self-start flex flex-col items-center leading-none z-10  ${isAccessibilityMode ? "gap-y-4" : "gap-y-1"}`}
      >
        <span className={valueClass}>{isJoker ? "JK" : card.value}</span>
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
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 w-6 h-6 md:w-8 md:h-8 pointer-events-none`}
        />
      ) : (
        <></>
      )}

      {/* Joker Ability Description */}
      {isJoker && abilityInfo && (
        <div className="absolute bottom-1 left-0 right-0 px-0.5 text-center leading-[0.6rem] md:leading-[0.8rem] z-20 pointer-events-none">
          <span className="text-[6px] md:text-[8px] font-black uppercase tracking-tighter text-violet-700">
            {abilityInfo}
          </span>
        </div>
      )}

      {/* USE BUTTON */}
      {isJoker && isSelected && onUseJoker && (
        <motion.button
          initial={{ scale: 0, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onUseJoker(card.id);
          }}
          className="absolute -top-24 md:-top-28 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-[9px] md:text-[10px] font-black py-2 md:py-2.5 px-4 md:px-5 rounded-full shadow-[0_0_20px_rgba(124,58,237,0.5)] z-50 whitespace-nowrap border border-violet-400"
        >
          USAR JOKER
        </motion.button>
      )}

      {/* Símbolo Inferior-Direita (Invertido) - Oculto em Acessibilidade para dar foco ao valor maior */}
      {!isAccessibilityMode && !isJoker && (
        <div className="self-end flex flex-col items-center leading-none rotate-180 z-10">
          <span className={valueClass}>{card.value}</span>
          <SuitIcon suit={card.suit.name} className={suitClass} />
        </div>
      )}

      {/* Botão de Marcador (Bottom Left) */}
      {onSetMarker && (
        <div className="absolute bottom-0 left-0 z-40">
          <button
            onClick={handlePaletteClick}
            className={`p-1 md:p-1.5 rounded-tr-lg bg-white border-t border-r border-slate-200 shadow-md transition-all 
              ${showPicker ? "scale-110 ring-2 ring-blue-400 opacity-100" : "opacity-80 hover:opacity-100"}`}
          >
            <Palette className="w-3 h-3 md:w-4 md:h-4 text-slate-700" />
          </button>

          <AnimatePresence>
            {showPicker && (
              <motion.div
                initial={{ opacity: 0, y: 5, scale: 0.8 }}
                animate={{ opacity: 1, y: -2, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.8 }}
                className={`absolute bottom-full ${
                  pickerDirection === "right" ? "left-0" : "right-0"
                } mb-0.5 bg-white/95 backdrop-blur-sm rounded-full shadow-lg border border-slate-200 p-0.5 flex flex-col gap-1 z-50 items-center`}
              >
                {MARKER_COLORS.map((c) => (
                  <button
                    key={c.name}
                    title={c.name}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetMarker(c.color);
                      setShowPicker(false);
                    }}
                    className={`w-5 h-5 md:w-6 md:h-6 rounded-full border border-slate-200 transition-transform hover:scale-125 flex items-center justify-center ${c.class}`}
                  >
                    {!c.color && (
                      <X className="w-2.5 h-2.5 md:w-3 md:h-3 text-slate-400" />
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};
