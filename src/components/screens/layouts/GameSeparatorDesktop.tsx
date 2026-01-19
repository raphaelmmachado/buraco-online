import { Fragment } from "react";
import { Hand, Dot, ShoppingCart, Trash } from "lucide-react";
import { type GameLayoutProps } from "../types/GameLayoutProps";
import { type Card } from "../../../../common/types/card";

export const GameSeparatorDesktop = ({
  game,
  my_player_id
}: GameLayoutProps & { my_player_id: number }) => {
  return (
    <div className="flex h-full gap-2 items-center w-full justify-between overflow-x-auto scrollbar-hide">
      {Object.entries(game.players_data).map(([id, p]) => {
        return (
          <Fragment key={`${id}_${p.userName}`}>
            <div
              className={`relative shrink-0 flex items-center justify-center px-3 py-1 
              md:px-2 md:py-0.5 rounded-lg border transition-all ${
                Number(id) === game.current_player
                  ? "border-yellow-400/80 bg-yellow-500/20 ring-1 ring-yellow-400/50 animate-pulse shadow-[0_0_10px_rgba(250,204,21,0.3)]"
                  : "border-white/5 bg-black/20"
              }`}
            >
              <span
                className={`flex text-[10px] md:text-sm font-black uppercase ${
                  Number(id) % 2 === my_player_id % 2
                    ? "text-blue-300"
                    : "text-red-300"
                }`}
              >
                {p.userName.substring(0, 8)}
                <span className="text-gray-500 mx-1">
                  <Hand size={16} />{" "}
                </span>
              </span>
              <span className="text-[10px] md:text-sm font-mono font-bold text-white">
                {typeof game.hands[Number(id)] === "number"
                  ? (game.hands[Number(id)] as number)
                  : (game.hands[Number(id)] as Card[])?.length || 0}
              </span>
              <span className="flex items-center">
                <>
                  {" "}
                  {game.turn_phase === "DRAW" &&
                    Number(id) === game.current_player && (
                      <>
                        <Dot size={16} />{" "}
                        <ShoppingCart size={16} fill="white" />
                      </>
                    )}
                  {game.turn_phase === "ACTION" &&
                    Number(id) === game.current_player && (
                      <>
                        <Dot size={16} />{" "}
                        <Trash size={16} fill="white" />
                      </>
                    )}
                </>
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
};
