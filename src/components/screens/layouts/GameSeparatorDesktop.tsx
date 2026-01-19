import { Fragment } from "react";
import { PlayerTimerBadge } from "../../game-ui/PlayerTimerBadge";
import { type GameLayoutProps } from "../types/GameLayoutProps";
import { type Card } from "../../../../common/types/card";

export const GameSeparatorDesktop = ({
  game,
  my_player_id,
  playerRefs
}: GameLayoutProps & { my_player_id: number }) => {
  return (
    <div className="flex h-full gap-2 items-center w-full justify-between overflow-x-auto scrollbar-hide">
      {Object.entries(game.players_data).map(([id, p]) => {
        return (
          <Fragment key={`${id}_${p.userName}`}>
            <PlayerTimerBadge
              playerId={Number(id)}
              userName={p.userName}
              handSize={typeof game.hands[Number(id)] === "number"
                ? (game.hands[Number(id)] as number)
                : (game.hands[Number(id)] as Card[])?.length || 0}
              isCurrentPlayer={Number(id) === game.current_player}
              isMyTeam={Number(id) % 2 === my_player_id % 2}
              turnPhase={game.turn_phase}
              innerRef={(el) => {
                if (playerRefs && playerRefs.current) {
                    playerRefs.current[id] = el;
                }
              }}
            />
          </Fragment>
        );
      })}
    </div>
  );
};
