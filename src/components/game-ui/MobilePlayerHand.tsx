import { useRef, useEffect } from "react";
import { type Card as CardType } from "../../../common/types/card";
import { HandCard } from "./HandCard";

interface MobilePlayerHandProps {
  cards: CardType[];
  selectedCardIds: string[];
  lastDrawnCardId?: string | null;
  onCardClick: (id: string) => void;
  onSortHand: () => void;
}

export const MobilePlayerHand = ({
  cards,
  selectedCardIds,
  lastDrawnCardId,
  onCardClick,
  onSortHand,
}: MobilePlayerHandProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to end on new card (optional, but nice)
  // Or maybe keep position? Let's just keep position for now to avoid jumping.

  return (
    <div className="flex-1 w-full h-full relative flex flex-col pointer-events-auto">
      {/* Scrollable Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 w-full overflow-x-auto flex items-end px-4 pb-2 gap-[-10px] snap-x snap-mandatory scrollbar-hide"
        style={{
          paddingRight: "50%", // Space for the last card to be centered or visible
          paddingLeft: "20px",
        }}
      >
        <div className="flex items-center -space-x-10">
          {" "}
          {/* Negative margin for overlap */}
          {cards.map((card) => {
            const isSelected = selectedCardIds.includes(card.id);
            const isLastDrawn = card.id === lastDrawnCardId;

            return (
              <div
                key={card.id}
                className={`
                relative shrink-0 snap-center transition-all duration-200
                ${isSelected ? "-translate-y-2" : "translate-y-0"}
              `}
              >
                <HandCard
                  card={card}
                  isSelected={isSelected}
                  isLastDrawn={isLastDrawn}
                  onClick={() => onCardClick(card.id)}
                  className="w-16 h-24 shadow-md"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Sort Button */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
        <button
          onClick={onSortHand}
          className="bg-gray-800/90 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10 shadow-lg active:scale-95 transition-all flex items-center gap-1.5"
        >
          <span className="text-xs">🪄</span>
          <span>Organizar</span>
        </button>
      </div>
    </div>
  );
};
