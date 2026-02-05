import { memo, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { organize_meld } from "../../../common/utils/sort_cards";
import { MeldCard } from "./MeldCard";
import { MeldBadge } from "./MeldBadge";
import type { Card } from "../../../common/types/card";
import type { ScreenDirection } from "../../utils/animation_utils";

interface MeldDisplayProps {
  meld: Card[];
  isHovered?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  scale?: string; // e.g. "scale-75 md:scale-100"
  interactive?: boolean;
  enterFrom?: ScreenDirection;
}

export const MeldDisplay = memo(
  ({
    meld,
    isHovered = false,
    onClick,
    onMouseEnter,
    onMouseLeave,
    scale = "scale-75 md:scale-100",
    interactive = false,
    enterFrom = "bottom",
  }: MeldDisplayProps) => {
    // Memoize the expensive organization logic
    const organizedCards = useMemo(() => organize_meld(meld), [meld]);

    return (
      <AnimatePresence>
        <div
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          className={`relative group flex flex-col overflow-visible ${
            interactive
              ? "cursor-pointer origin-top-left transition-transform"
              : "origin-left"
          } ${scale} ${
            interactive && isHovered ? "scale-95 md:scale-105" : ""
          }`}
        >
          <div className="flex -space-x-7.5 md:-space-x-10 transition-all">
            {organizedCards.map((card, i) => (
              <MeldCard
                key={card.id}
                card={card}
                highlight={isHovered}
                enterFrom={enterFrom}
                style={{ zIndex: i }}
              />
            ))}
          </div>
          <MeldBadge meld={meld} />
        </div>
      </AnimatePresence>
    );
  }
);

MeldDisplay.displayName = "MeldDisplay";
