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
    <div className="flex w-full h-full items-center justify-between px-1 gap-1">
      {/* LEFT: MY TEAM BLOCK */}
      <div className="flex flex-col gap-1 items-start min-w-[90px]">
        {/* TOP SPACER to push names down */}
        <div className="h-5 invisible select-none pointer-events-none" aria-hidden="true" />
        
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
          horizontal={true}
          className="py-0 h-5"
        />
      </div>

      {/* CENTER: CARDS (LARGER) */}
      <div className="flex items-center justify-center gap-4 shrink-0">
        <div className="relative h-full flex items-center shrink-0 no-drag">
          <PileCard
            onClick={onDeckClick}
            active={canDraw}
            mini={false}
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
            mini={false}
            isActionable={canDraw || (canAction && selectedCards.length === 1)}
            highlight={isDiscardSelected || hoveredMeld !== null}
            subtleHighlight={canAction && selectedCards.length === 1}
            originDirection={discardOriginDirection}
          />
        </div>
      </div>

      {/* RIGHT: OPPONENT TEAM BLOCK */}
      <div className="flex flex-col gap-1 items-end min-w-[90px]">
        <CurrentGamePoints
          points={oppScore}
          hasTakenDeadPile={oppTeamHasTaken}
          showSkull={true}
          maxDeadPiles={game.rules.teamCanTakeBothDeadPiles ? 2 : 1}
          horizontal={true}
          className="py-0 h-5"
        />
        <div className="flex flex-col gap-0.5 items-end">
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
        
        {/* BOTTOM SPACER to push names up */}
        <div className="h-5 invisible select-none pointer-events-none" aria-hidden="true" />
      </div>
    </div>
  );
};
