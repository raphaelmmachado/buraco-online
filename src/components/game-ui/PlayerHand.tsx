import { useState, useRef, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { type Card as CardType } from "../../../common/types/card";
import { HandCard } from "./HandCard";
import { useGameStore } from "../../store/useGameStore";

interface PlayerHandProps {
  cards: CardType[];
  selectedCardIds: string[];
  lastDrawnCardId?: string | null;
  onCardClick: (id: string) => void;
  onUseJoker?: (cardId: string) => void;
  onSortHand: () => void;
  isMobile: boolean;
  showSortButton?: boolean;
  showCardMarkers?: boolean;
  cardMarkers: Record<string, string>;
  setCardMarker: (cardId: string, color: string | null) => void;
}

// --- CONFIGURAÇÃO FÁCIL DE EDITAR ---
const HAND_CONFIG = {
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
    hoverLift: 20,
    hoverScale: 1.05,
  },

  // Posicionamento
  position: {
    bottomOffsetMobile: -5, // Lowered from 10
    bottomOffsetDesktop: -5, // Lowered from 15
  },
  hover_zIndex: false,
};

export const PlayerHand = ({
  cards,
  selectedCardIds,
  lastDrawnCardId,
  onCardClick,
  onUseJoker,
  onSortHand,
  isMobile,
  showSortButton = false,
  showCardMarkers = false,
  cardMarkers,
  setCardMarker,
}: PlayerHandProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1000);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredSuit, setHoveredSuit] = useState<string | null>(null);
  const showAnimations = useGameStore((s) => s.showAnimations);

  const [prevCount, setPrevCount] = useState(0);
  const [isDealing, setIsDealing] = useState(false);

  // --- MODO GRUPAMENTO (ESPECIAL DESKTOP > 25) ---
  // Alterado de 11 para 25 conforme solicitado
  const isGroupingMode = !isMobile && cards.length > 30;

  const groupedCards = useMemo(() => {
    // Sempre retorna um objeto, mesmo vazio, para evitar erros de leitura,
    // mas só popula se estiver em modo agrupamento.
    if (!isGroupingMode) return {};
    // Alterado para nomes em português conforme common/types/card.ts
    const order = ["copas", "espadas", "ouro", "paus"];
    const groups: Record<string, CardType[]> = {};
    order.forEach((s) => (groups[s] = cards.filter((c) => c.suit.name === s)));
    return groups;
  }, [cards, isGroupingMode]);

  const activeSuits = useMemo(() => {
    return Object.keys(groupedCards).filter(
      (s) => groupedCards[s] && groupedCards[s].length > 0,
    );
  }, [groupedCards]);

  if (cards.length !== prevCount) {
    setIsDealing(prevCount === 0 && cards.length > 0);
    setPrevCount(cards.length);
  }

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

  // --- LÓGICA DE CÁLCULO PADRÃO ---
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

  const getArchOffset = (index: number, count: number) => {
    if (!HAND_CONFIG.arch.enabled || count <= 2) return 0;
    const center = (count - 1) / 2;
    const distance = Math.abs(index - center);
    const norm = distance / center;
    const maxDrop = isMobile
      ? HAND_CONFIG.arch.heightMobile
      : HAND_CONFIG.arch.heightDesktop;
    return Math.pow(norm, 2) * maxDrop;
  };

  if (totalCards === 0) return <div className="flex-1 h-full" />;

  // Renderiza o modo normal (Leque)
  const renderNormalHand = () => {
    let angleStep = 0;
    let startAngle = 0;
    if (HAND_CONFIG.rotation.enabled && totalCards > 1) {
      const calculatedStep =
        HAND_CONFIG.rotation.maxTotalAngle / (totalCards - 1);
      angleStep = Math.min(
        calculatedStep,
        HAND_CONFIG.rotation.maxPerCardAngle,
      );
      startAngle = -(angleStep * (totalCards - 1)) / 2;
    }

    return (
      <div
        className="relative h-full flex shrink-0 items-end"
        style={{
          width: `${finalHandWidth}px`,
          margin: isOverflowing ? "0 40px" : "0 auto",
        }}
      >
        <AnimatePresence mode="popLayout">
          {cards.map((card, i) => {
            const isSelected = selectedCardIds.includes(card.id);
            const isHovered = hoveredIndex === i;
            const x = i * currentSpacing;
            const rotation = startAngle + i * angleStep;
            const archY = getArchOffset(i, totalCards);

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

            const initialPos = !showAnimations
              ? false
              : card.id === lastDrawnCardId
                ? { opacity: 0, x: -600, y: 0, scale: 0.6, rotate: -20 }
                : { opacity: 0, x: 0, y: 200, scale: 0.5 };

            return (
              <motion.div
                key={card.id}
                layoutId={showAnimations ? card.id : undefined}
                layout={showAnimations}
                initial={initialPos}
                animate={{
                  opacity: 1,
                  x,
                  y: translateY,
                  rotate: rotation,
                  scale,
                }}
                transition={
                  showAnimations
                    ? {
                        type: "spring",
                        stiffness: 350,
                        damping: 25,
                        delay: isDealing ? i * 0.04 : 0,
                      }
                    : { duration: 0 }
                }
                exit={{ opacity: 0, y: -200, scale: 0.5, rotate: 10 }}
                className="absolute origin-bottom pointer-events-auto"
                style={{
                  bottom: `${isMobile ? HAND_CONFIG.position.bottomOffsetMobile : HAND_CONFIG.position.bottomOffsetDesktop}px`,
                  left: 0,
                  width: `${cardWidth}px`,
                  zIndex:
                    isHovered && HAND_CONFIG.hover_zIndex && !isMobile
                      ? 100
                      : i, // Ensure stacking context respects card order
                }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <HandCard
                  card={card}
                  isSelected={isSelected}
                  isLastDrawn={card.id === lastDrawnCardId}
                  onClick={() => onCardClick(card.id)}
                  onUseJoker={onUseJoker}
                  markerColor={showCardMarkers ? cardMarkers[card.id] : null}
                  onSetMarker={
                    showCardMarkers
                      ? (color) => setCardMarker(card.id, color)
                      : undefined
                  }
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    );
  };

  // Renderiza o modo agrupado (Desktop > 25)

  const renderGroupedHand = () => {
    // Garante que não renderiza se não houver grupos ou naipes ativos

    if (activeSuits.length === 0) return null;

    // Distribuímos os naipes uniformemente

    // Usamos Math.max para evitar divisão por zero ou espaços negativos

    const safeUsableWidth = Math.max(usableWidth, 600);

    const groupGap = safeUsableWidth / (activeSuits.length + 1);

    // Encontra o índice do naipe focado para calcular os afastamentos

    const hoveredSuitIndex = activeSuits.indexOf(hoveredSuit || "");

    const PUSH_DISTANCE = 180; // Distância que os outros naipes se afastam (px)

    return (
      <div className="relative w-full h-full flex items-end justify-center">
        {activeSuits.map((suit, suitIdx) => {
          const suitCards = groupedCards[suit];

          if (!suitCards) return null;

          const isSuitHovered = hoveredSuit === suit;

          const baseX = (suitIdx + 1) * groupGap - safeUsableWidth / 2;

          // Lógica de Acordeão: Afasta os vizinhos para dar espaço

          let xOffset = 0;

          if (hoveredSuit) {
            if (suitIdx < hoveredSuitIndex) xOffset = -PUSH_DISTANCE;
            else if (suitIdx > hoveredSuitIndex) xOffset = PUSH_DISTANCE;
          }

          return (
            <motion.div
              key={suit}
              className="absolute bottom-0 h-full flex items-end justify-center pointer-events-none"
              initial={false}
              animate={{
                left: `calc(50% + ${baseX + xOffset}px)`,

                zIndex: isSuitHovered ? 50 : 10,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onMouseEnter={() => setHoveredSuit(suit)}
              onMouseLeave={() => setHoveredSuit(null)}
            >
              {/* Área invisível de detecção de hover maior */}

              <div className="absolute bottom-0 w-32 h-full pointer-events-auto cursor-pointer" />

              <div className="relative flex items-end justify-center">
                <AnimatePresence>
                  {suitCards.map((card, i) => {
                    const isSelected = selectedCardIds.includes(card.id);

                    // Ajuste de ID para evitar conflito com índice normal

                    const isCardHovered =
                      hoveredIndex === (suitIdx + 1) * 1000 + i;

                    // Se o naipe está em hover, espalhamos as cartas. Se não, ficam empilhadas.

                    // Aumentado de 25 para 45 para abrir mais horizontalmente

                    const spreadSpacing = 45;

                    const x = isSuitHovered
                      ? (i - (suitCards.length - 1) / 2) * spreadSpacing
                      : i * 2;

                    const archY = isSuitHovered
                      ? getArchOffset(i, suitCards.length)
                      : 0;

                    let translateY = archY;

                    let scale = isSuitHovered ? 1 : 0.9;

                    if (isSelected)
                      translateY -= HAND_CONFIG.interaction.selectedLiftDesktop;

                    if (isCardHovered) {
                      translateY -= HAND_CONFIG.interaction.hoverLift;

                      scale = HAND_CONFIG.interaction.hoverScale;
                    }

                    return (
                      <motion.div
                        key={card.id}
                        layoutId={showAnimations ? card.id : undefined}
                        layout={showAnimations}
                        initial={{ opacity: 0, y: 100 }}
                        animate={{
                          opacity: 1,

                          x,

                          y: translateY,

                          scale,

                          rotate: isSuitHovered
                            ? (i - (suitCards.length - 1) / 2) * 2
                            : 0,

                          zIndex: isSuitHovered ? 50 + i : i,
                        }}
                        className="absolute origin-bottom pointer-events-auto"
                        style={{
                          bottom: `${HAND_CONFIG.position.bottomOffsetDesktop}px`,

                          width: `${HAND_CONFIG.cardWidth.desktop}px`,
                        }}
                        onMouseEnter={() =>
                          setHoveredIndex((suitIdx + 1) * 1000 + i)
                        }
                        onMouseLeave={() => setHoveredIndex(null)}
                      >
                        <HandCard
                          card={card}
                          isSelected={isSelected}
                          isLastDrawn={card.id === lastDrawnCardId}
                          onClick={() => onCardClick(card.id)}
                          onUseJoker={onUseJoker}
                          markerColor={
                            showCardMarkers ? cardMarkers[card.id] : null
                          }
                          onSetMarker={
                            showCardMarkers
                              ? (color) => setCardMarker(card.id, color)
                              : undefined
                          }
                        />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      id="player-hand-container"
      ref={containerRef}
      className="flex-1 h-full relative group/hand select-none pointer-events-none flex flex-col justify-end items-center"
    >
      <div
        className={`relative w-full h-full flex items-end pb-4 touch-pan-x ${
          isOverflowing && !isGroupingMode
            ? "justify-start overflow-x-auto scrollbar-hide pointer-events-auto"
            : "justify-center"
        }`}
      >
        {isGroupingMode ? renderGroupedHand() : renderNormalHand()}
      </div>

      {/* Botão de Organizar */}
      {showSortButton && (
        <div
          id="player-controls"
          className="absolute bottom-1 z-100 pointer-events-auto"
        >
          <button
            onClick={onSortHand}
            className="bg-gray-800/80 hover:bg-gray-700 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full backdrop-blur-md border border-white/10 shadow-lg transition-all active:scale-95 flex items-center gap-1 hover:border-yellow-400/50"
            title="Organizar Mão"
          >
            <span>🪄 Organizar</span>
          </button>
        </div>
      )}
    </div>
  );
};
