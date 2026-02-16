import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { type Card as CardType } from "../../../common/types/card";
import { HandCard } from "./HandCard";
import { useGameStore } from "../../store/useGameStore";

interface MobilePlayerHandProps {
  cards: CardType[];
  selectedCardIds: string[];
  lastDrawnCardId?: string | null;
  onCardClick: (id: string) => void;
  onUseJoker?: (cardId: string) => void;
  onSortHand: () => void;
  showSortButton?: boolean;
  showCardMarkers?: boolean;
  cardMarkers: Record<string, string>;
  setCardMarker: (cardId: string, color: string | null) => void;
}

export const MobilePlayerHand = ({
  cards,
  selectedCardIds,
  lastDrawnCardId,
  onCardClick,
  onUseJoker,
  onSortHand,
  showSortButton = false,
  showCardMarkers = false,
  cardMarkers,
  setCardMarker,
}: MobilePlayerHandProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const showAnimations = useGameStore((s) => s.showAnimations);

  // Track dealing
  const [prevCount, setPrevCount] = useState(0);
  const [isDealing, setIsDealing] = useState(false);

  if (cards.length !== prevCount) {
    setIsDealing(prevCount === 0 && cards.length > 0);
    setPrevCount(cards.length);
  }

  return (
    <div className="flex-1 w-full h-full relative flex flex-col justify-end pointer-events-auto overflow-visible">
      {/* Scrollable Container - Added pt-32 to allow Joker UI to appear within h-64 */}
      <div
        ref={scrollContainerRef}
        className="w-full overflow-x-auto flex items-end pb-4 pt-16 snap-x snap-mandatory scrollbar-hide"
        style={{
          paddingRight: "50%", // Space for the last card to be centered or visible
          paddingLeft: "20px",
        }}
      >
        <div className="flex items-center -space-x-6">
          {" "}
          {/* Negative margin for overlap */}
          <AnimatePresence mode="popLayout">
            {cards.map((card, i) => {
              const isSelected = selectedCardIds.includes(card.id);
              const isLastDrawn = card.id === lastDrawnCardId;

              // Se foi a última comprada, vem do Deck (Cima Esquerda aprox).
              // Se for deal inicial, vem da esquerda lateral.
              const initialPos = !showAnimations
                ? false
                : isLastDrawn
                  ? { opacity: 0, x: -100, y: -200, scale: 0.4, rotate: -45 }
                  : { opacity: 0, x: -50, scale: 0.5 };

              const isJoker = card.value === "JOKER";

              return (
                <motion.div
                  key={card.id}
                  layoutId={showAnimations ? card.id : undefined}
                  layout={showAnimations}
                  initial={initialPos}
                  animate={{
                    opacity: 1,
                    x: 0,
                    y: isSelected ? (isJoker ? -60 : -10) : 0,
                    scale: 1,
                    rotate: 0,
                    zIndex: isSelected && isJoker ? 150 + i : i,
                  }}
                  transition={
                    showAnimations
                      ? {
                          type: "spring",
                          stiffness: 400,
                          damping: 30,
                          delay: isDealing ? i * 0.04 : 0,
                        }
                      : { duration: 0 }
                  }
                  exit={{ opacity: 0, scale: 0.5, y: -50 }}
                  className="relative shrink-0 snap-center pointer-events-auto"
                >
                  <HandCard
                    card={card}
                    isSelected={isSelected}
                    isLastDrawn={isLastDrawn}
                    onClick={() => onCardClick(card.id)}
                    onUseJoker={onUseJoker}
                    className="w-16 h-24 shadow-md p-1"
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
      </div>

      {/* Floating Sort Button */}
      {showSortButton && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <button
            onClick={onSortHand}
            className="bg-gray-800/90 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10 shadow-lg active:scale-95 transition-all flex items-center gap-1.5"
          >
            <span className="text-xs">🪄</span>
            <span>Organizar</span>
          </button>
        </div>
      )}
    </div>
  );
};
