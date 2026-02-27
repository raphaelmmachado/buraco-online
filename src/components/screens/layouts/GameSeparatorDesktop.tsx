import { Fragment } from "react";
import { PlayerTimerBadge } from "../../game-ui/PlayerTimerBadge";
import { type GameLayoutProps } from "../types/GameLayoutProps";
import { type Card } from "../../../../common/types/card";
import CurrentGamePoints from "../../game-ui/CurrentGamePoints";

export const GameSeparatorDesktop = ({
  game,
  my_player_id,
  playerRefs,
  myScore,
  oppScore,
  myTeamHasTaken,
  oppTeamHasTaken,
}: GameLayoutProps & { my_player_id: number }) => {
  return (
    <div className="flex h-full items-center w-full justify-between px-4 overflow-x-auto scrollbar-hide">
      {/* Team Nós - Left Side */}
      <div className="flex items-center gap-2 shrink-0">
        <CurrentGamePoints
          label="NÓS"
          points={myScore}
          hasTakenDeadPile={myTeamHasTaken}
          showSkull={true}
          maxDeadPiles={game.rules.team_can_take_both_dead_piles ? 2 : 1}
          horizontal={true}
          className="bg-blue-950/40 rounded-full border border-blue-500/20 text-blue-400"
        />
      </div>

      {/* Players List - Center */}
      <div className="flex items-center gap-2 justify-center flex-1">
        {Object.entries(game.players_data).map(([id, p]) => {
          return (
            <Fragment key={`${id}_${p.userName}`}>
              <PlayerTimerBadge
                playerId={Number(id)}
                userName={p.userName}
                handSize={
                  typeof game.hands[Number(id)] === "number"
                    ? (game.hands[Number(id)] as number)
                    : (game.hands[Number(id)] as Card[])?.length || 0
                }
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

      {/* Team Eles - Right Side */}
      <div className="flex items-center gap-2 shrink-0">
        <CurrentGamePoints
          label="ELES"
          points={oppScore}
          hasTakenDeadPile={oppTeamHasTaken}
          showSkull={true}
          maxDeadPiles={game.rules.team_can_take_both_dead_piles ? 2 : 1}
          horizontal={true}
          invert={true}
          className="bg-red-950/40 rounded-full border border-red-500/20 text-red-400"
        />
      </div>
    </div>
  );
};
