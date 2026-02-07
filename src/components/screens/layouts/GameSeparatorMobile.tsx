import { PileCard } from "../../game-ui/PileCard";
import { DiscardCard } from "../../game-ui/DiscardCard";
import { PlayerTimerBadge } from "../../game-ui/PlayerTimerBadge";
import CurrentGamePoints from "../../game-ui/CurrentGamePoints";
import { type GameLayoutProps } from "../types/GameLayoutProps";
import { type Card } from "../../../../common/types/card";

export const GameSeparatorMobile = ({
  game,
  canDraw,
  canAction,
  selectedCards,
  isDiscardSelected,
  hoveredMeld,
  discardOriginDirection,
  onDeckClick,
  onDiscardClick,
  my_player_id,
  playerRefs,
  myScore,
  oppScore,
  myTeamHasTaken,
  oppTeamHasTaken,
}: GameLayoutProps & { my_player_id: number }) => {
  return (
    <div className="flex w-full items-center justify-between px-1 h-full gap-1">
      {/* MEU TIME (NÓS) - LEFT SIDE */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="flex flex-col gap-0.5">
          {Object.entries(game.players_data)
            .filter(([id]) => Number(id) % 2 === my_player_id % 2)
            .map(([id, p]) => (
              <PlayerTimerBadge
                key={id}
                playerId={Number(id)}
                userName={p.userName}
                handSize={
                  typeof game.hands[Number(id)] === "number"
                    ? (game.hands[Number(id)] as number)
                    : (game.hands[Number(id)] as Card[])?.length || 0
                }
                isCurrentPlayer={Number(id) === game.current_player}
                isMyTeam={true}
                turnPhase={game.turn_phase}
                innerRef={(el) => {
                  if (playerRefs && playerRefs.current) {
                    playerRefs.current[id] = el;
                  }
                }}
              />
            ))}
        </div>

        <CurrentGamePoints
          points={myScore}
          hasTakenDeadPile={myTeamHasTaken}
          showSkull={true}
          maxDeadPiles={game.rules.teamCanTakeBothDeadPiles ? 2 : 1}
          className="min-w-[45px]"
        />
      </div>

      {/* CENTER: DECK AND DISCARD */}
      <div className="flex items-center justify-center gap-4 flex-1">
        <div className="relative h-full flex items-center shrink-0 no-drag">
          <PileCard
            onClick={onDeckClick}
            active={canDraw}
            mini={true}
            quantity={game.deck_count}
            draw_phase={game.turn_phase === "DRAW"}
            dead_piles={game.dead_piles_count}
          />
        </div>

        <div className="relative h-full flex items-center shrink-0 no-drag">
          <DiscardCard
            card={game.discard_pile[0]}
            quantity={game.discard_pile.length}
            onClick={onDiscardClick}
            mini={true}
            isActionable={canDraw || (canAction && selectedCards.length === 1)}
            highlight={isDiscardSelected || hoveredMeld !== null}
            subtleHighlight={canAction && selectedCards.length === 1}
            originDirection={discardOriginDirection}
          />
        </div>
      </div>

      {/* TIME DELES (ELES) - RIGHT SIDE */}
      <div className="flex items-center gap-1.5 shrink-0">
        <CurrentGamePoints
          points={oppScore}
          hasTakenDeadPile={oppTeamHasTaken}
          showSkull={true}
          maxDeadPiles={game.rules.teamCanTakeBothDeadPiles ? 2 : 1}
          className="min-w-[45px]"
        />
        <div className="flex flex-col gap-0.5">
          {Object.entries(game.players_data)
            .filter(([id]) => Number(id) % 2 !== my_player_id % 2)
            .map(([id, p]) => (
              <PlayerTimerBadge
                key={id}
                playerId={Number(id)}
                userName={p.userName}
                handSize={
                  typeof game.hands[Number(id)] === "number"
                    ? (game.hands[Number(id)] as number)
                    : (game.hands[Number(id)] as Card[])?.length || 0
                }
                isCurrentPlayer={Number(id) === game.current_player}
                isMyTeam={false}
                turnPhase={game.turn_phase}
                innerRef={(el) => {
                  if (playerRefs && playerRefs.current) {
                    playerRefs.current[id] = el;
                  }
                }}
              />
            ))}
        </div>
      </div>
    </div>
  );
};
