import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { type Card as CardType } from "../../../common/types/card";
import { HandCard } from "./HandCard";

interface PlayerHandProps {
  cards: CardType[];
  selectedCardIds: string[];
  lastDrawnCardId?: string | null;
  onCardClick: (id: string) => void;
  onSortHand: () => void;
  isMobile: boolean;
}

// --- CONFIGURAÇÃO FÁCIL DE EDITAR ---
const HAND_CONFIG = {
  // COMENTE DEFAULT SETTINGS
  // Tamanho visual reservado para a carta
  cardWidth: { mobile: 56, desktop: 80 },

  // Espaçamento entre as cartas (px)
  spacing: {
    mobile: 30,
    desktop: 50,
    minMobile: 15,
    minDesktop: 30,
  },

  // Rotação (Leque)
  rotation: {
    enabled: true,
    maxTotalAngle: 12,
    maxPerCardAngle: 5,
  },

  // Arco (Curva vertical)
  arch: {
    enabled: true,
    heightMobile: 10,
    heightDesktop: 10,
  },

  // Interações
  interaction: {
    selectedLiftMobile: 30,
    selectedLiftDesktop: 50,
    hoverLift: 20, //30
    hoverScale: 1.05, //1.15
  },

  // Posicionamento
  position: {
    // Distância do fundo do componente (que é o fundo da tela)
    bottomOffsetMobile: 10,
    bottomOffsetDesktop: 15,
  },
  //sobreposicao
  hover_zIndex: false,
};

export const PlayerHand = ({
  cards,
  selectedCardIds,
  lastDrawnCardId,
  onCardClick,
  onSortHand,
  isMobile,
}: PlayerHandProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1000);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const totalCards = cards.length;
  // Mantemos o espaço mesmo sem cartas
  if (totalCards === 0) return <div className="flex-1 h-full" />;

  // --- LÓGICA DE CÁLCULO ---

  const cardWidth = isMobile
    ? HAND_CONFIG.cardWidth.mobile
    : HAND_CONFIG.cardWidth.desktop;
  const idealSpacing = isMobile
    ? HAND_CONFIG.spacing.mobile
    : HAND_CONFIG.spacing.desktop;
  const minSpacing = isMobile
    ? HAND_CONFIG.spacing.minMobile
    : HAND_CONFIG.spacing.minDesktop;

  const availableWidth = Math.min(containerWidth, 1200);
  const padding = isMobile ? 20 : 100;
  const usableWidth = availableWidth - padding;

  const totalWidthIdeal = (totalCards - 1) * idealSpacing + cardWidth;

  let currentSpacing = idealSpacing;

  if (totalWidthIdeal > usableWidth && totalCards > 1) {
    const squeezedSpacing = (usableWidth - cardWidth) / (totalCards - 1);
    currentSpacing = Math.max(squeezedSpacing, minSpacing);
  }

  const finalHandWidth = (totalCards - 1) * currentSpacing + cardWidth;
  const isOverflowing = finalHandWidth > usableWidth;

  let angleStep = 0;
  let startAngle = 0;

  if (HAND_CONFIG.rotation.enabled && totalCards > 1) {
    const calculatedStep =
      HAND_CONFIG.rotation.maxTotalAngle / (totalCards - 1);
    angleStep = Math.min(calculatedStep, HAND_CONFIG.rotation.maxPerCardAngle);
    const totalAngle = angleStep * (totalCards - 1);
    startAngle = -totalAngle / 2;
  }

  const getArchOffset = (index: number) => {
    if (!HAND_CONFIG.arch.enabled || totalCards <= 2) return 0;
    const center = (totalCards - 1) / 2;
    const distance = Math.abs(index - center);
    const norm = distance / center;
    const maxDrop = isMobile
      ? HAND_CONFIG.arch.heightMobile
      : HAND_CONFIG.arch.heightDesktop;
    return Math.pow(norm, 2) * maxDrop;
  };

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      id="player-hand-container"
      ref={containerRef}
      className="flex-1 h-full relative group/hand select-none pointer-events-none flex flex-col justify-end items-center"
    >
      {/* Container das Cartas */}
      <div
        className={`relative w-full h-full flex items-end pb-4 touch-pan-x ${
          isOverflowing
            ? "justify-start overflow-x-auto scrollbar-hide pointer-events-auto"
            : "justify-center"
        }`}
      >
        <div
          className="relative h-full flex shrink-0 items-end"
          style={{
            width: `${finalHandWidth}px`,
            margin: isOverflowing ? "0 40px" : "0 auto",
          }}
        >
          <AnimatePresence>
            {cards.map((card, i) => {
              const isSelected = selectedCardIds.includes(card.id);
              const isHovered = hoveredIndex === i;

              const x = i * currentSpacing;
              const rotation = startAngle + i * angleStep;
              const archY = getArchOffset(i);

              let translateY = archY;
              let scale = 1;

              if (isSelected) {
                translateY -= isMobile
                  ? HAND_CONFIG.interaction.selectedLiftMobile
                  : HAND_CONFIG.interaction.selectedLiftDesktop;
              }

              if (isHovered && !isMobile) {
                translateY -= HAND_CONFIG.interaction.hoverLift;
                scale = HAND_CONFIG.interaction.hoverScale;
              }

              const bottomPos = isMobile
                ? HAND_CONFIG.position.bottomOffsetMobile
                : HAND_CONFIG.position.bottomOffsetDesktop;

              return (
                <motion.div
                  key={card.id}
                  layout
                  initial={{ opacity: 0, y: 50, scale: 0.8 }}
                  animate={{
                    opacity: 1,
                    x,
                    y: translateY,
                    rotate: rotation,
                    scale: scale,
                  }}
                  exit={{ opacity: 0, y: 20, scale: 0.5 }}
                  // transition removed to use MotionConfig context
                  className="absolute origin-bottom pointer-events-auto"
                  style={{
                    bottom: `${bottomPos}px`,
                    left: 0,
                    width: `${cardWidth}px`,
                    zIndex:
                      isHovered && HAND_CONFIG.hover_zIndex && !isMobile
                        ? 100
                        : "auto",
                  }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <HandCard
                    card={card}
                    isSelected={isSelected}
                    isLastDrawn={card.id === lastDrawnCardId}
                    onClick={() => onCardClick(card.id)}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Botão de Organizar */}
      <div
        id="player-controls"
        className="absolute bottom-1 z-50 pointer-events-auto"
      >
        <button
          onClick={onSortHand}
          className="bg-gray-800/80 hover:bg-gray-700 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full backdrop-blur-md border border-white/10 shadow-lg transition-all active:scale-95 flex items-center gap-1 hover:border-yellow-400/50"
          title="Organizar Mão"
        >
          <span>🪄 Organizar</span>
        </button>
      </div>
    </div>
  );
};
