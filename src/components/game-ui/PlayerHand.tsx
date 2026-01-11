import { useState, useRef, useEffect } from "react";
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

  // Update container width on resize
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
  if (totalCards === 0) return <div className="flex-1" />;

  // --- LAYOUT CONFIGURATION ---
  const CARD_WIDTH = isMobile ? 56 : 80; // w-14 vs w-20
  const MIN_SPACING = isMobile ? 18 : 25; // Encurtamento limite para acessibilidade

  // Maximum rotation spread for the entire hand (degrees)
  const MAX_FAN_ANGLE = 60;
  // Maximum rotation per card
  const MAX_CARD_ANGLE = 5;

  // Calculate fan geometry
  const availableWidth = Math.min(containerWidth, 1200);
  const safePadding = isMobile ? 20 : 100; // Reduzido padding no mobile para ganhar espaço
  const usableWidth = availableWidth - safePadding;

  const idealSpacing = isMobile ? 28 : 42;

  // Calculate spacing dynamically to fit container, but respect MIN_SPACING
  let spacing = idealSpacing;
  if (totalCards > 1) {
    const calculatedSpacing = (usableWidth - CARD_WIDTH) / (totalCards - 1);
    spacing = Math.max(Math.min(calculatedSpacing, idealSpacing), MIN_SPACING);
  }

  // Calculate total width of the hand stage
  const totalHandWidth = (totalCards - 1) * spacing + CARD_WIDTH;
  const isOverflowing = totalHandWidth > usableWidth;

  // Calculate rotation steps
  let angleStep = MAX_FAN_ANGLE / (totalCards - 1 || 1);
  if (angleStep > MAX_CARD_ANGLE) angleStep = MAX_CARD_ANGLE;

  const totalAngle = angleStep * (totalCards - 1);
  const startAngle = -totalAngle / 2;

  // Center offset for positioning inside the stage
  const getArchOffset = (index: number) => {
    const center = (totalCards - 1) / 2;
    const distance = Math.abs(index - center);
    const norm = distance / (center || 1);
    const maxDrop = isMobile ? 10 : 20;
    return Math.pow(norm, 2) * maxDrop;
  };

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      id="player-hand-container"
      ref={containerRef}
      className="flex-1 h-full relative touch-manipulation group/hand select-none flex flex-col justify-end pb-2 md:pb-6"
    >
      {/* Scrollable Area for Cards */}
      <div
        className={`w-full overflow-y-hidden ${
          isOverflowing
            ? "overflow-x-auto scrollbar-hide pointer-events-auto"
            : "pointer-events-none"
        }`}
      >
        <div
          className="relative h-32 md:h-48 flex shrink-0 items-end"
          style={{
            width: `${totalHandWidth}px`,
            margin: isOverflowing ? "0 40px" : "0 auto",
          }}
        >
          {cards.map((card, i) => {
            const isSelected = selectedCardIds.includes(card.id);
            const isHovered = hoveredIndex === i;

            const x = i * spacing;
            const rotation = startAngle + i * angleStep;
            const yOffset = getArchOffset(i);

            let yTrans = yOffset;
            let scale = 1;
            let z = i;

            if (isSelected) {
              yTrans -= isMobile ? 20 : 40;
              // z-index remains 'i' to avoid blocking neighbors
            }

            if (isHovered && !isMobile) {
              yTrans -= 20;
              scale = 1.15;
              z = 200;
            }

            return (
              <div
                key={card.id}
                className="absolute origin-bottom transition-all duration-300 ease-out pointer-events-auto will-change-transform"
                style={{
                  transform: `translateX(${x}px) translateY(${yTrans}px) rotate(${rotation}deg) scale(${scale})`,
                  zIndex: z,
                  bottom: 0,
                  left: 0,
                  width: `${CARD_WIDTH}px`,
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
              </div>
            );
          })}
        </div>
      </div>

      {/* ORGANIZAR CARTAS - Fixed at bottom center of the container */}
      <div
        id="player-controls"
        className="absolute bottom-1 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
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