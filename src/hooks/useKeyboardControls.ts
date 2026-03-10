import { useState, useEffect, useCallback } from "react";
import { type Card } from "../../common/types/card";

interface UseKeyboardControlsProps {
  myHand: Card[];
  topDiscardCard?: Card;
  selectedCards: string[];
  isMyTurn: boolean;
  canDraw: boolean;
  canAction: boolean;
  isDiscardSelected: boolean;
  onToggleSelect: (id: string) => void;
  onDeckClick: () => void;
  onDiscardClick: () => void;
  onNewMeldClick: () => void;
  onMeldClick: (teamId: number, meldIndex: number) => void;
  myTeam: number;
}

export const useKeyboardControls = ({
  myHand,
  topDiscardCard,
  selectedCards,
  isMyTurn,
  canDraw,
  canAction,
  isDiscardSelected,
  onToggleSelect,
  onDeckClick,
  onDiscardClick,
  onNewMeldClick,
  onMeldClick,
  myTeam,
}: UseKeyboardControlsProps) => {
  const [focusedCardIdState, setFocusedCardId] = useState<string | null>(null);

  // Derive the active focused card directly during render to avoid cascading updates
  const focusedCardId =
    focusedCardIdState && myHand.find((c) => c.id === focusedCardIdState)
      ? focusedCardIdState
      : null;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isMyTurn) return; // Only process if it's my turn

      // Ignore interactions if typing in an input (e.g., chat, if any)
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
        case "ArrowRight": {
          e.preventDefault();
          if (myHand.length === 0) return;

          if (!focusedCardId) {
            // Focus first card if nothing is focused
            setFocusedCardId(myHand[0].id);
          } else {
            const currentIndex = myHand.findIndex((c) => c.id === focusedCardId);
            if (currentIndex === -1) {
                setFocusedCardId(myHand[0].id);
                return;
            }

            let nextIndex = currentIndex;
            if (e.key === "ArrowLeft") {
              nextIndex = currentIndex > 0 ? currentIndex - 1 : myHand.length - 1;
            } else {
              nextIndex = currentIndex < myHand.length - 1 ? currentIndex + 1 : 0;
            }
            setFocusedCardId(myHand[nextIndex].id);
          }
          break;
        }

        case "ArrowUp": {
          e.preventDefault();
          if (focusedCardId && !selectedCards.includes(focusedCardId)) {
             onToggleSelect(focusedCardId);
          }
          break;
        }
        case "ArrowDown": {
          e.preventDefault();
          if (focusedCardId && selectedCards.includes(focusedCardId)) {
             onToggleSelect(focusedCardId);
          }
          break;
        }

        case "Enter": {
          e.preventDefault();
          // Try to create a new meld
          if (canAction || canDraw) {
              onNewMeldClick();
          }
          break;
        }

        case "Delete": {
          e.preventDefault();
          if (canAction && selectedCards.length === 1) {
            onDiscardClick();
          }
          break;
        }

        case "Control": {
            e.preventDefault();
            if (canDraw && topDiscardCard) {
                onToggleSelect(topDiscardCard.id);
            }
            break;
        }

        case " ": {
            // Optional shortcut to draw from deck
            e.preventDefault();
            if (canDraw) {
                onDeckClick();
            }
            break;
        }

        default: {
            // Handle number keys (1-9) for meld adding
            if (/^[1-9]$/.test(e.key)) {
                e.preventDefault();
                const index = parseInt(e.key, 10) - 1;
                // We don't have the exact length of team melds in this hook to bounds-check perfectly here,
                // but the parent handler should reject invalid indices safely.
                if (selectedCards.length > 0 || isDiscardSelected) {
                    onMeldClick(myTeam, index);
                }
            }
            break;
        }
      }
    },
    [
      isMyTurn,
      myHand,
      focusedCardId,
      topDiscardCard,
      selectedCards,
      canDraw,
      canAction,
      isDiscardSelected,
      onToggleSelect,
      onDeckClick,
      onDiscardClick,
      onNewMeldClick,
      onMeldClick,
      myTeam,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return { focusedCardId };
};
