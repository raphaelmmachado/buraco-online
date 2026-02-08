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

export const HandCard = ({
  card,
  isSelected,
  isLastDrawn,
  onClick,
  style,
  className = "",
  onMouseEnter,
  onMouseLeave,
  markerColor,
  onSetMarker,
}: HandCardProps) => {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerDirection, setPickerDirection] = useState<"left" | "right">("left");

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
      {/* Marcador de Cor (Bookmark/Ribbon Style) */}
      {markerColor && (
        <motion.div 
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute -top-1 left-5 w-3 h-5 md:w-4 md:h-7 shadow-md z-30 rounded-b-sm border-x border-b border-black/10"
          style={{ 
            backgroundColor: markerColor,
            backgroundImage: "linear-gradient(to bottom, rgba(255,255,255,0.2), transparent)" 
          }}
        >
          {/* Detalhe da dobra da fita no topo */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-black/10" />
        </motion.div>
      )}

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

      {/* Botão de Marcador (Bottom Left) */}
      {onSetMarker && (
        <div className="absolute bottom-0 left-0 z-40">
          <button
            onClick={handlePaletteClick}
            className={`p-0.5 md:p-1 rounded-tr-lg bg-slate-100/90 hover:bg-white border-t border-r border-slate-200 shadow-sm transition-all 
              ${showPicker ? "scale-105 ring-1 ring-blue-400 opacity-100" : "opacity-60 hover:opacity-100"} 
              md:opacity-0 md:group-hover:opacity-100`}
          >
            <Palette size={10} className="text-slate-600" />
          </button>

          <AnimatePresence>
            {showPicker && (
              <motion.div
                initial={{ opacity: 0, y: 5, scale: 0.8 }}
                animate={{ opacity: 1, y: -2, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.8 }}
                className="absolute bottom-full left-0 mb-0.5 bg-white/95 backdrop-blur-sm rounded-full shadow-lg border border-slate-200 p-0.5 flex flex-col gap-1 z-50 items-center"
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
                    className={`w-4 h-4 md:w-5 md:h-5 rounded-full border border-slate-200 transition-transform hover:scale-125 flex items-center justify-center ${c.class}`}
                  >
                    {!c.color && <X size={6} className="text-slate-400" />}
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
