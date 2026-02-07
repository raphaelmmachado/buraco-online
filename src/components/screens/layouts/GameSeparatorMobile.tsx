import { useEffect, useState } from "react";
import { Skull } from "lucide-react";
import { PileCard } from "../../game-ui/PileCard";
import { DiscardCard } from "../../game-ui/DiscardCard";
import { EventBar } from "../../game-ui/EventBar";
import { PlayerTimerBadge } from "../../game-ui/PlayerTimerBadge";
import { useGameStore } from "../../../store/useGameStore";
import { type GameLayoutProps } from "../types/GameLayoutProps";
import { type Card } from "../../../../common/types/card";

export const GameSeparatorMobile = ({
  game,
  canDraw,
  canAction,
  selectedCards,
  isMyTurn,
  isDiscardSelected,
  hoveredMeld,
  discardOriginDirection,
  onDeckClick,
  onDiscardClick,
  my_player_id,
  playerRefs,
}: GameLayoutProps & { my_player_id: number }) => {
  const turn_start_time = useGameStore((s) => s.turn_start_time);
  const status = useGameStore((s) => s.status);
  const duration = game.turn_phase === "DRAW" ? 20 : 60;
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    const update = () => {
      if (!turn_start_time || status !== "PLAYING") {
        setTimeLeft(duration);
        return;
      }
      const now = Date.now();
      const elapsed = (now - turn_start_time) / 1000;
      setTimeLeft(Math.max(0, duration - elapsed));
    };

    const timeoutId = setTimeout(update, 0);
    const intervalId = setInterval(update, 500);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [turn_start_time, status, duration]);

  return (
    <>
      {/* MOBILE: DECK ON LEFT */}
      <div className="relative h-full py-1 flex flex-col-reverse gap-y-1 items-center shrink-0 no-drag">
        <PileCard
          onClick={onDeckClick}
          active={canDraw}
          mini={true}
          quantity={game.deck_count}
          draw_phase={game.turn_phase === "DRAW"}
          dead_piles={game.dead_piles_count}
        />
        <div className="bg-red-900 text-white text-xs font-black px-0.5 flex items-center justify-center rounded-md border border-white/20">
          <Skull size={14} /> : {game.dead_piles_count}
        </div>
      </div>

      {/* MEU TIME (NÓS) */}
      <div className="flex flex-col items-center leading-none px-1 gap-0.5">
        <div className="flex flex-col md:flex-row gap-1">
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
      </div>

      {/* CENTER: TURN INFO OR EVENT BAR */}
      <div className="flex flex-col items-center bg-black/40 backdrop-blur-sm px-3 py-1 rounded-lg border border-white/10 shadow-lg mx-1 min-w-[80px] h-[38px] justify-center relative overflow-hidden">
        {game.recentEvents && game.recentEvents.length > 0 ? (
          <EventBar
            message={game.recentEvents[game.recentEvents.length - 1].message}
            type={game.recentEvents[game.recentEvents.length - 1].type}
          />
        ) : (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1">
              <span
                className={`text-xs font-black ${
                  isMyTurn ? "text-yellow-400 animate-pulse" : "text-white/40"
                } uppercase tracking-widest`}
              >
                {isMyTurn ? "SUA VEZ" : "VEZ DELES"}
              </span>
            </div>

            <span
              className={`text-xs text-gray-400 font-bold tracking-tight mt-0.5`}
            >
              {status === "PLAYING" && (
                <span
                  className={`text-xs font-black flex items-center gap-0.5 ${
                    timeLeft < 15
                      ? "text-red-500 animate-pulse"
                      : "text-white/40"
                  }`}
                >
                  {game.turn_phase === "DRAW" ? "COMPRAR" : "JOGAR"}
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* TIME DELES (ELES) */}
      <div className="flex flex-col items-center leading-none px-1 gap-0.5">
        <div className="flex flex-col md:flex-row gap-1">
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

      {/* MOBILE: DISCARD ON RIGHT */}
      <div className="relative h-full py-1 flex items-center shrink-0 no-drag">
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
    </>
  );
};
