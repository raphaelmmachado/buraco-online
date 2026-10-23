import React, { useEffect, useRef, useState } from "react";
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
  carouselEnabled?: boolean;
  focusedCardId?: string | null;
}

const STACK_CARD_WIDTH = 64;
const STACK_CARD_HEIGHT = 96;
const STACK_VISIBLE_RATIO = 0.5;
const STACK_STEP = STACK_CARD_WIDTH * STACK_VISIBLE_RATIO;
const STACK_ROW_OVERLAP = STACK_CARD_HEIGHT * STACK_VISIBLE_RATIO;
const STACK_HORIZONTAL_PADDING = 8;

export const MobilePlayerHand = ({
  cards,
  selectedCardIds,
  lastDrawnCardId,
  onCardClick,
  onUseJoker,
  onSortHand,
  showSortButton = false,
  carouselEnabled = true,
  focusedCardId,
}: MobilePlayerHandProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const showAnimations = useGameStore((s) => s.showAnimations);
  const [containerWidth, setContainerWidth] = useState(0);

  // Track dealing
  const [prevCount, setPrevCount] = useState(0);
  const [isDealing, setIsDealing] = useState(false);

  if (cards.length !== prevCount) {
    setIsDealing(prevCount === 0 && cards.length > 0);
    setPrevCount(cards.length);
  }

  useEffect(() => {
    const element = scrollContainerRef.current;
    if (!element) return;

    const updateWidth = () => setContainerWidth(element.clientWidth);
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Track pointer for scroll vs click
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDownCapture = (e: React.PointerEvent) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    if (pointerDownPos.current) {
      const dx = Math.abs(e.clientX - pointerDownPos.current.x);
      const dy = Math.abs(e.clientY - pointerDownPos.current.y);
      if (dx > 10 || dy > 10) {
        e.stopPropagation();
        e.preventDefault();
      }
      pointerDownPos.current = null;
    }
  };

  const renderCard = (
    card: CardType,
    index: number,
    stacked: boolean,
    marginLeft = 0,
  ) => {
    const isSelected = selectedCardIds.includes(card.id);
    const isLastDrawn = card.id === lastDrawnCardId;

    // Se foi a última comprada, vem do Deck (Cima Esquerda aprox).
    // Se for deal inicial, vem da esquerda lateral.
    const isHidden = typeof document !== "undefined" && document.hidden;
    const initialPos =
      !showAnimations || isHidden
        ? false
        : isLastDrawn
          ? { opacity: 0, x: -100, y: -200, scale: 0.4, rotate: -45 }
          : { opacity: 0, x: -50, scale: 0.5 };

    const isJoker = card.value === "JOKER";
    const isKeyboardFocused = card.id === focusedCardId;
    const targetY = isSelected
      ? isJoker
        ? -60
        : -10
      : isKeyboardFocused
        ? -10
        : 0;

    return (
      <motion.div
        key={card.id}
        layoutId={showAnimations ? card.id : undefined}
        layout={showAnimations}
        initial={initialPos}
        animate={{
          opacity: 1,
          x: 0,
          y: targetY,
          scale: 1,
          rotate: 0,
          zIndex:
            (isSelected && isJoker) || isKeyboardFocused ? 150 + index : index,
        }}
        transition={
          showAnimations
            ? {
                type: "spring",
                stiffness: 400,
                damping: 30,
                delay: isDealing ? index * 0.04 : 0,
              }
            : { duration: 0 }
        }
        exit={{ opacity: 0, scale: 0.5, y: -50 }}
        className={`relative pointer-events-auto ${
          stacked ? "" : "shrink-0 snap-center"
        }`}
        style={stacked ? { marginLeft } : undefined}
      >
        <HandCard
          card={card}
          isSelected={isSelected}
          isLastDrawn={isLastDrawn}
          onClick={() => onCardClick(card.id)}
          onUseJoker={onUseJoker}
          className="w-16 h-24 shadow-md p-1"
        />
      </motion.div>
    );
  };

  const renderCarousel = () => (
    <div className="flex items-center -space-x-6">
      <AnimatePresence mode="popLayout">
        {cards.map((card, i) => renderCard(card, i, false))}
      </AnimatePresence>
    </div>
  );

  const renderStackedRows = () => {
    const width =
      containerWidth ||
      (typeof window !== "undefined" ? window.innerWidth : 360);
    const availableWidth = Math.max(
      width - STACK_HORIZONTAL_PADDING * 2,
      STACK_CARD_WIDTH,
    );
    const cardsPerRow = Math.max(
      1,
      Math.floor((availableWidth - STACK_CARD_WIDTH) / STACK_STEP) + 1,
    );

    const rows: CardType[][] = [];
    for (let i = 0; i < cards.length; i += cardsPerRow) {
      rows.push(cards.slice(i, i + cardsPerRow));
    }

    return (
      <div className="w-full flex flex-col items-center justify-end">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="flex items-end justify-center"
            style={{ marginTop: rowIndex === 0 ? 0 : -STACK_ROW_OVERLAP }}
          >
            {row.map((card, columnIndex) => {
              const index = rowIndex * cardsPerRow + columnIndex;
              return renderCard(
                card,
                index,
                true,
                columnIndex === 0 ? 0 : -STACK_STEP,
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 w-full h-full relative flex flex-col justify-end pointer-events-auto overflow-visible">
      {/* Scrollable Container - Added pt-32 to allow Joker UI to appear within h-64 */}
      <div
        ref={scrollContainerRef}
        className={`w-full flex items-end pb-4 pt-16 ${
          carouselEnabled
            ? "overflow-x-auto snap-x snap-mandatory scrollbar-hide"
            : "overflow-visible"
        }`}
        onPointerDownCapture={handlePointerDownCapture}
        onClickCapture={handleClickCapture}
        style={
          carouselEnabled
            ? {
                paddingRight: "50%", // Space for the last card to be centered or visible
                paddingLeft: "20px",
              }
            : {
                paddingLeft: `${STACK_HORIZONTAL_PADDING}px`,
                paddingRight: `${STACK_HORIZONTAL_PADDING}px`,
              }
        }
      >
        {carouselEnabled ? renderCarousel() : renderStackedRows()}
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
