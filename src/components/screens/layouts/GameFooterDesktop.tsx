import { PlayerHand } from "../../game-ui/PlayerHand";
import { PileCard } from "../../game-ui/PileCard";
import { DiscardCard } from "../../game-ui/DiscardCard";
import { type GameLayoutProps } from "../types/GameLayoutProps";
import { type Card } from "../../../../common/types/card";

export const GameFooterDesktop = ({
  game,
  selectedCards,
  canDraw,
  canAction,
  isDiscardSelected,
  discardOriginDirection,
  onDeckClick,
  onDiscardClick,
  toggleSelect,
  focusedCardId,
  my_player_id,
}: GameLayoutProps & { my_player_id: number }) => {
  return (
    <>
      {/* DESKTOP LEFT: DECK PILE */}
      <div className="flex flex-col items-center gap-2 shrink-0 pb-1 relative pointer-events-auto">
        <PileCard
          onClick={onDeckClick}
          active={canDraw}
          quantity={game.deck_count}
          dead_piles={game.dead_piles_count}
          draw_phase={game.turn_phase === "DRAW"}
        />
      </div>

      {/* CENTER: PLAYER HAND */}
      <PlayerHand
        cards={(game.hands[my_player_id] as Card[]) || []}
        selectedCardIds={selectedCards}
        lastDrawnCardId={game.last_drawn_card_id}
        onCardClick={toggleSelect}
        onUseJoker={game.useJoker}
        onSortHand={game.sort_hand}
        isMobile={false}
        showSortButton={game.showSortButton}
        showCardMarkers={game.showCardMarkers}
        cardMarkers={game.cardMarkers}
        setCardMarker={game.setCardMarker}
        focusedCardId={focusedCardId}
      />

      {/* RIGHT: DISCARD PILE */}
      <div className="shrink-0 pb-1 relative pointer-events-auto">
        <DiscardCard
          card={game.discard_pile[0]}
          quantity={game.discard_pile.length}
          onClick={onDiscardClick}
          isActionable={canDraw || (canAction && selectedCards.length === 1)}
          highlight={isDiscardSelected}
          subtleHighlight={canAction && selectedCards.length === 1}
          originDirection={discardOriginDirection}
        />
      </div>
    </>
  );
};
