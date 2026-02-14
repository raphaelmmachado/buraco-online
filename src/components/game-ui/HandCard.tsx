import { motion, AnimatePresence } from "framer-motion";
import { type Card as CardType } from "../../../common/types/card";
import { SuitIcon } from "./SuitIcon";
import { getCardImageSrc } from "../../utils/card_image_map";
import { useGameStore } from "../../store/useGameStore";
import { useMobileCheck } from "../../hooks/useMobileCheck";
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

const ABILITY_DESCRIPTIONS: Record<string, { name: string; desc: string }> = {
  VIEW_HAND: { name: "Visão", desc: "Veja a mão do próximo" },
  STEAL_CARD: { name: "Roubo", desc: "Pegue uma carta dele" },
  SKIP_TURN: { name: "Pulo", desc: "Pula vez sem descartar" },
  SAFE: { name: "Seguro", desc: "+3 cartas para seu time" },
  SHUFFLE_DISCARD: { name: "Limpeza", desc: "Lixo volta ao monte" },
  TAX_COLLECTOR: { name: "Imposto", desc: "Todos descartam 1" },
  SKIP_NEXT: { name: "Bloqueio", desc: "Pula a vez do próximo" },
  REVERSE: { name: "Reverso", desc: "Inverte o sentido" },
  SURGICAL_SWAP: { name: "Cirúrgico", desc: "Troque com o amigo" },
};

/**
 * Componente interno para renderizar o conteúdo em modo de ACESSIBILIDADE
 * Focado em alto contraste, fontes grandes e menos ruído visual.
 */
const AccessibilityCardContent = ({
  card,
  isSelected,
  isHovered,
  imageSrc,
  onUseJoker,
  valueClass,
  suitClass,
  isMobile,
}: {
  card: CardType;
  isSelected: boolean;
  isHovered: boolean;
  imageSrc?: string;
  onUseJoker?: (id: string) => void;
  valueClass: string;
  suitClass: string;
  isMobile: boolean;
}) => {
  const isJoker = card.value === "JOKER";
  const abilityInfo = card.ability ? ABILITY_DESCRIPTIONS[card.ability] : null;
  const showMobileDetail = isMobile && isSelected && abilityInfo;

  return (
    <>
      {/* Se for Joker, mantém os elementos interativos essenciais */}
      {isJoker && (
        <>
          <AnimatePresence>
            {(!isMobile && (isSelected || isHovered)) && abilityInfo && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                className="absolute -top-14 md:-top-16 left-1/2 -translate-x-1/2 w-28 md:w-40 bg-violet-900/95 backdrop-blur-md border border-violet-400 text-white p-1.5 md:p-2 rounded-xl shadow-2xl z-50 pointer-events-none text-center"
              >
                <div className="text-[7px] md:text-[10px] font-black uppercase tracking-widest text-violet-300 mb-0.5 md:mb-1">
                  {abilityInfo.name}
                </div>{" "}
                <div className="text-[9px] md:text-xs font-bold leading-tight">
                  {abilityInfo.desc}
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] md:border-8 border-transparent border-t-violet-900" />
              </motion.div>
            )}
          </AnimatePresence>

          {isSelected && onUseJoker && (
            <motion.button
              initial={{ scale: 0, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onUseJoker(card.id);
              }}
              className={`absolute ${isMobile ? "top-[105%]" : "-top-24 md:-top-28"} left-1/2 -translate-x-1/2 bg-violet-600 text-white text-[9px] md:text-[10px] font-black py-2 md:py-2.5 px-4 md:px-5 rounded-full shadow-[0_0_20px_rgba(124,58,237,0.5)] z-50 whitespace-nowrap border-2 ${isMobile ? "border-yellow-400 ring-1 ring-yellow-500/50" : "border-violet-400"}`}
            >
              {isMobile ? "USAR" : "USAR JOKER"}
            </motion.button>
          )}
        </>
      )}

      {/* Visual de Acessibilidade: Valor e Naipe empilhados e grandes */}
      <div className="self-start flex flex-col items-center leading-none z-10 gap-y-1 md:gap-y-2">
        <span className={valueClass}>
          {isJoker ? (showMobileDetail ? abilityInfo.name.substring(0, 5) : "JK") : card.value}
        </span>
        <SuitIcon suit={card.suit.name} className={suitClass} />
      </div>

      {/* Imagem Central (Opacidade reduzida para priorizar o valor/naipe) */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt="Card illustration"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20"
          draggable={false}
        />
      )}

      {/* Integrated description for mobile selection */}
      {showMobileDetail && (
        <div className="absolute bottom-1 left-0 right-0 px-1 text-center leading-tight z-20 pointer-events-none">
          <div className="text-[8px] font-bold text-violet-900 leading-[1.1] uppercase">
            {abilityInfo.desc}
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Componente interno para renderizar o conteúdo específico de um Magic Joker (Modo Padrão)
 */
const JokerCardContent = ({
  card,
  isSelected,
  isHovered,
  imageSrc,
  onUseJoker,
  valueClass,
  isMobile,
}: {
  card: CardType;
  isSelected: boolean;
  isHovered: boolean;
  imageSrc?: string;
  onUseJoker?: (id: string) => void;
  valueClass: string;
  isMobile: boolean;
}) => {
  const abilityInfo = card.ability ? ABILITY_DESCRIPTIONS[card.ability] : null;
  const showMobileDetail = isMobile && isSelected && abilityInfo;

  return (
    <>
      {/* Joker Power Overlay */}
      <AnimatePresence>
        {!isMobile && (isSelected || isHovered) && abilityInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="absolute -top-14 md:-top-16 left-1/2 -translate-x-1/2 w-28 md:w-40 bg-violet-900/95 backdrop-blur-md border border-violet-400 text-white p-1.5 md:p-2 rounded-xl shadow-2xl z-50 pointer-events-none text-center"
          >
            <div className="text-[7px] md:text-[10px] font-black uppercase tracking-widest text-violet-300 mb-0.5 md:mb-1">
              {abilityInfo.name}
            </div>
            <div className="text-[9px] md:text-xs font-bold leading-tight">
              {abilityInfo.desc}
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] md:border-8 border-transparent border-t-violet-900" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Joker Glow Effect */}
      <div className="absolute inset-0 bg-linear-to-br from-violet-500/10 to-transparent pointer-events-none rounded-md" />

      {/* Símbolo Topo-Esquerda */}
      <div className="self-start flex flex-col items-center leading-none z-10 gap-y-1">
        <span
          className={`${valueClass} ${showMobileDetail ? "text-[8px]" : "text-xs"} md:text-lg tracking-tighter font-black uppercase`}
        >
          {showMobileDetail ? abilityInfo.name : "JOKER"}
        </span>
      </div>

      {/* Imagem Central */}
      {imageSrc ? (
        <img
          src={imageSrc}
          alt="Joker"
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 ${showMobileDetail ? "-translate-y-[85%]" : "-translate-y-[60%]"} md:-translate-y-1/2 pointer-events-none opacity-100 max-w-10 md:max-w-14`}
          draggable={false}
        />
      ) : (
        <SuitIcon
          suit={card.suit.name}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 w-6 h-6 md:w-8 md:h-8 pointer-events-none"
        />
      )}

      {/* Joker Ability Description (Título do Poder) */}
      {!showMobileDetail && abilityInfo && (
        <div className="absolute bottom-1 md:bottom-2 left-0 right-0 px-1 text-center leading-none z-20 pointer-events-none">
          <div className="bg-violet-600 text-white text-[7px] md:text-[10px] font-black py-0.5 md:py-1 px-1 rounded-sm shadow-sm uppercase tracking-tight">
            {abilityInfo.name}
          </div>
        </div>
      )}

      {/* Integrated description for mobile selection */}
      {showMobileDetail && (
        <div className="absolute bottom-1.5 left-0 right-0 px-1 text-center leading-tight z-20 pointer-events-none">
          <div className="text-[8px] font-bold text-violet-900 leading-[1.1] uppercase">
            {abilityInfo.desc}
          </div>
        </div>
      )}

      {/* USE BUTTON */}
      {isSelected && onUseJoker && (
        <motion.button
          initial={{ scale: 0, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onUseJoker(card.id);
          }}
          className={`absolute ${isMobile ? "top-[105%]" : "-top-24 md:-top-28"} left-1/2 -translate-x-1/2 bg-violet-600 text-white text-[9px] md:text-[10px] font-black py-2 md:py-2.5 px-4 md:px-5 rounded-full shadow-[0_0_20px_rgba(124,58,237,0.5)] z-50 whitespace-nowrap border-2 ${isMobile ? "border-yellow-400 ring-1 ring-yellow-500/50" : "border-violet-400"}`}
        >
          {isMobile ? "USAR PODER" : "USAR JOKER"}
        </motion.button>
      )}
    </>
  );
};

/**
 * Componente interno para renderizar o conteúdo de uma carta normal (Modo Padrão)
 */
const NormalCardContent = ({
  card,
  imageSrc,
  valueClass,
  suitClass,
}: {
  card: CardType;
  imageSrc?: string;
  valueClass: string;
  suitClass: string;
}) => {
  return (
    <>
      {/* Símbolo Topo-Esquerda */}
      <div className="self-start flex flex-col items-center leading-none z-10 gap-y-1">
        <span className={valueClass}>{card.value}</span>
        <SuitIcon suit={card.suit.name} className={suitClass} />
      </div>

      {/* Imagem Central */}
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={`${card.value} de ${card.suit.name}`}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-100"
          draggable={false}
        />
      ) : (
        <SuitIcon
          suit={card.suit.name}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 w-6 h-6 md:w-8 md:h-8 pointer-events-none"
        />
      )}

      {/* Símbolo Inferior-Direita (Invertido) */}
      <div className="self-end flex flex-col items-center leading-none rotate-180 z-10">
        <span className={valueClass}>{card.value}</span>
        <SuitIcon suit={card.suit.name} className={suitClass} />
      </div>
    </>
  );
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
  const [isHovered, setIsHovered] = useState(false);
  const [pickerDirection, setPickerDirection] = useState<"left" | "right">(
    "left",
  );

  const handlePaletteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPickerDirection(rect.left < 60 ? "right" : "left");
    setShowPicker(!showPicker);
  };

  const isRed = card.color === "red";
  const isJoker = card.value === "JOKER";
  const isAccessibilityMode = useGameStore((state) => state.isAccessibilityMode);
  const { isMobile } = useMobileCheck();
  const imageSrc = getCardImageSrc(card.value, card.suit.name);

  const valueClass = isAccessibilityMode
    ? `font-bold text-2xl md:text-4xl scale-y-125 origin-top ${card.value === "10" ? "tracking-tighter" : ""}`
    : "font-black md:text-2xl";

  const suitClass = isAccessibilityMode ? "w-6 h-6 md:w-8 md:h-8" : "w-4 h-4 md:w-5 md:h-5";

  let textColorClass = isRed ? "text-red-600" : isJoker ? "text-violet-700" : "text-slate-900";

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
            ? "border-yellow-400 ring-4 ring-yellow-400/30 shadow-yellow-500/50 shadow-2xl z-[100]"
            : isLastDrawn
              ? "border-blue-400 ring-2 ring-blue-400/50 shadow-blue-500/30 z-10"
              : "border-slate-300 z-0"
        }
        ${isJoker ? "bg-linear-to-br from-violet-100 to-indigo-200 border-violet-400" : "bg-white"}
        ${textColorClass}
        ${className}
      `}
      style={style}
    >
      {/* Marcador de Cor */}
      {markerColor && (
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute -top-1 left-5 w-3 h-5 md:w-4 md:h-7 shadow-md z-30 rounded-b-sm border-x border-b border-black/10"
          style={{
            backgroundColor: markerColor,
            backgroundImage: "linear-gradient(to bottom, rgba(255,255,255,0.2), transparent)",
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-black/10" />
        </motion.div>
      )}

      {/* Conteúdo da Carta */}
      {isAccessibilityMode ? (
        <AccessibilityCardContent
          card={card}
          isSelected={isSelected}
          isHovered={isHovered}
          imageSrc={imageSrc}
          onUseJoker={onUseJoker}
          valueClass={valueClass}
          suitClass={suitClass}
          isMobile={isMobile}
        />
      ) : isJoker ? (
        <JokerCardContent
          card={card}
          isSelected={isSelected}
          isHovered={isHovered}
          imageSrc={imageSrc}
          onUseJoker={onUseJoker}
          valueClass={valueClass}
          isMobile={isMobile}
        />
      ) : (
        <NormalCardContent card={card} imageSrc={imageSrc} valueClass={valueClass} suitClass={suitClass} />
      )}

      {/* Botão de Marcador */}
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
