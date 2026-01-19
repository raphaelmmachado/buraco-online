import { MobilePlayerHand } from "../../game-ui/MobilePlayerHand";
import { type GameLayoutProps } from "../types/GameLayoutProps";
import { type Card } from "../../../../common/types/card";

export const GameFooterMobile = ({
  game,
  selectedCards,
  toggleSelect,
  my_player_id
}: GameLayoutProps & { my_player_id: number }) => {
  return (
    <MobilePlayerHand
      cards={(game.hands[my_player_id] as Card[]) || []}
      selectedCardIds={selectedCards}
      lastDrawnCardId={game.last_drawn_card_id}
      onCardClick={toggleSelect}
      onSortHand={game.sort_hand}
    />
  );
};
