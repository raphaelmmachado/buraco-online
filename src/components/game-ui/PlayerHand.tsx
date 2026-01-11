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
  
  // Maximum rotation spread for the entire hand (degrees)
  const MAX_FAN_ANGLE = 60; 
  // Maximum rotation per card
  const MAX_CARD_ANGLE = 5;

  // Calculate fan geometry
  const availableWidth = Math.min(containerWidth, 1200); // Cap width for ultra-wide screens
  const safePadding = isMobile ? 40 : 100;
  const usableWidth = availableWidth - safePadding;

  // How much space does one card take if fully spread?
  // We want them to overlap slightly even at max spread usually.
  const idealSpacing = isMobile ? 35 : 50; 
  
  // Calculate spacing dynamically to fit container
  // Formula: (n-1)*spacing + cardWidth <= usableWidth
  let spacing = idealSpacing;
  const neededWidth = (totalCards - 1) * idealSpacing + CARD_WIDTH;
  
  if (neededWidth > usableWidth && totalCards > 1) {
    spacing = (usableWidth - CARD_WIDTH) / (totalCards - 1);
  }

  // Calculate rotation steps
  // We want the total angle to be constrained, but also the step per card
  let angleStep = MAX_FAN_ANGLE / (totalCards - 1 || 1);
  if (angleStep > MAX_CARD_ANGLE) angleStep = MAX_CARD_ANGLE;
  
  // Center the fan angle
  const totalAngle = angleStep * (totalCards - 1);
  const startAngle = -totalAngle / 2;

  // Center offset for positioning (relative to container center)
  const totalWidthOfFan = (totalCards - 1) * spacing;
  const startX = -totalWidthOfFan / 2;

  // --- Y-ARC CALCULATION ---
  // A subtle arc: y = x^2 / k
  // We normalize x from -1 to 1 for the calculation
  const getArchOffset = (index: number) => {
    const center = (totalCards - 1) / 2;
    const distance = Math.abs(index - center);
    // Normalized distance (0 to 1)
    const norm = distance / (center || 1);
    
    // Max drop at edges
    const maxDrop = isMobile ? 10 : 20;
    return Math.pow(norm, 2) * maxDrop;
  };

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      id="player-hand"
      ref={containerRef}
      className="flex-1 h-full relative touch-manipulation group/hand pointer-events-none select-none flex justify-center items-end pb-2 md:pb-6"
    >
      <div className="relative h-32 md:h-48 flex justify-center items-end w-full"> 
        {cards.map((card, i) => {
          const isSelected = selectedCardIds.includes(card.id);
          const isHovered = hoveredIndex === i;

          // Base Position
          const x = startX + i * spacing;
          const rotation = startAngle + i * angleStep;
          const yOffset = getArchOffset(i);

          // Interaction Offsets
          let yTrans = yOffset; // The arch curve pushes edges down (positive Y)
          let scale = 1;
          let z = i;

          if (isSelected) {
            yTrans -= isMobile ? 20 : 40; // Pop up significantly
            z = 100 + i; // Always on top of unselected
          }

          if (isHovered && !isMobile) {
             yTrans -= 20; // Pop up on hover
             scale = 1.15;
             z = 200; // Hover is supreme
          }

          // Mobile selection adjustment: if selected, cancel rotation for better readability?
          // No, keep rotation, looks cooler.

          return (
            <div
              key={card.id}
              className="absolute origin-bottom transition-all duration-300 ease-out pointer-events-auto will-change-transform"
              style={{
                transform: `translateX(${x}px) translateY(${yTrans}px) rotate(${rotation}deg) scale(${scale})`,
                zIndex: z,
                bottom: 0, 
                // We assume the container is centered, so 'left: 50%' is implicitly handled by the parent flex-center
                // but since we are using translateX from 0, we need to be careful.
                // Best to anchor at bottom-center.
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

      {/* ORGANIZAR CARTAS - Fixed Position or relative to hand? 
          Keeping it centralized at bottom like before is safe. 
      */}
      <div
        id="player-controls"
        className="absolute bottom-14 md:bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
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