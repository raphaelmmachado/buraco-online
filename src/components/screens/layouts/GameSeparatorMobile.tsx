import { Hand, Skull } from "lucide-react";
import { PileCard } from "../../game-ui/PileCard";
import { DiscardCard } from "../../game-ui/DiscardCard";
import { EventBar } from "../../game-ui/EventBar";
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
  my_player_id
}: GameLayoutProps & { my_player_id: number }) => {

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
        <div className="flex flex-col md:flex-row  gap-1">
          {Object.entries(game.players_data)
            .filter(([id]) => Number(id) % 2 === my_player_id % 2)
            .map(([id, p]) => (
              <div
                key={id}
                className={`flex items-center rounded px-1.5 py-0.5 shadow-sm transition-all ${
                  Number(id) === game.current_player
                    ? "bg-yellow-500/20 border border-yellow-400 ring-1 ring-yellow-400/50 animate-pulse"
                    : "bg-blue-900/40 border border-blue-500/30"
                }`}
              >
                <span
                  className={`text-[9px] font-bold mr-1 opacity-80 ${
                    Number(id) === game.current_player
                      ? "text-yellow-100"
                      : "text-blue-100"
                  }`}
                >
                  {p.userName.substring(0, 8).toUpperCase()}
                </span>

                <span className="text-[9px] flex gap-x-1 items-center font-black text-white">
                  <Hand size={12} />{" "}
                  {typeof game.hands[Number(id)] === "number"
                    ? (game.hands[Number(id)] as number)
                    : (game.hands[Number(id)] as Card[])?.length || 0}
                </span>
              </div>
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
          <>
            <span
              className={`text-[8px] font-black ${
                isMyTurn ? "text-yellow-400 animate-pulse" : "text-white/40"
              } uppercase tracking-widest`}
            >
              {isMyTurn ? "SUA VEZ" : "VEZ DELES"}
            </span>

            <span className="text-[9px] text-gray-400 uppercase font-bold tracking-tight mt-0.5">
              {game.turn_phase === "DRAW" ? "COMPRA" : "JOGA"}
            </span>
          </>
        )}
      </div>

      {/* TIME DELES (ELES) */}
      <div className="flex flex-col items-center leading-none px-1 gap-0.5">
        <div className="flex flex-col md:flex-row gap-1">
          {Object.entries(game.players_data)
            .filter(([id]) => Number(id) % 2 !== my_player_id % 2)
            .map(([id, p]) => (
              <div
                key={id}
                className={`flex items-center rounded px-1.5 py-0.5 shadow-sm transition-all ${
                  Number(id) === game.current_player
                    ? "bg-yellow-500/20 border border-yellow-400 ring-1 ring-yellow-400/50 animate-pulse"
                    : "bg-red-900/40 border border-red-500/30"
                }`}
              >
                <span
                  className={`text-[9px] font-bold mr-1 opacity-80 ${
                    Number(id) === game.current_player
                      ? "text-yellow-100"
                      : "text-red-100"
                  }`}
                >
                  {p.userName.substring(0, 8).toUpperCase()}
                </span>

                <span className="text-[9px] flex gap-x-1 items-center font-black text-white">
                  <Hand size={12} />{" "}
                  {typeof game.hands[Number(id)] === "number"
                    ? (game.hands[Number(id)] as number)
                    : (game.hands[Number(id)] as Card[])?.length || 0}
                </span>
              </div>
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
