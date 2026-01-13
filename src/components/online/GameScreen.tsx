import { useState, useEffect } from "react";
import { Dot, Hand, ShoppingCart, Skull, Trash } from "lucide-react";
import { calculate_score } from "../../../common/utils/scoring";
// UI Components
import { MeldDisplay } from "../game-ui/MeldDisplay";
import { GameMenu } from "../game-ui/GameMenu";
import { RulesModal } from "../game-ui/RulesModal";
import { FinishScreen } from "./FinishScreen";
import { PlayerHand } from "../game-ui/PlayerHand";
import { MobilePlayerHand } from "../game-ui/MobilePlayerHand";
import { PileCard } from "../game-ui/PileCard";
import { DiscardCard } from "../game-ui/DiscardCard";
import { type GameAdapterInterface } from "../game-ui/useLocalGameAdapter";

// Custom Hooks
import { useWakeLock } from "../../hooks/useWakeLock";
import { useScreenDrag } from "../../hooks/useScreenDrag";
import { useGameAudio } from "../../hooks/useGameAudio";
import { useMobileCheck } from "../../hooks/useMobileCheck";
import CurrentGamePoints from "../game-ui/CurrentGamePoints";

// --- TELA PRINCIPAL ---

export const GameScreen = ({ game }: { game: GameAdapterInterface }) => {
  // State
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [hoveredMeld, setHoveredMeld] = useState<{
    teamId: number;
    index: number;
  } | null>(null);

  // Computed Values
  const my_player_id = game.my_player_number ?? 1;
  const my_team = my_player_id % 2 !== 0 ? 1 : 2;
  const opponent_team = my_team === 1 ? 2 : 1;
  const isMyTurn = game.current_player === my_player_id;
  const canDraw = isMyTurn && game.turn_phase === "DRAW";
  const canAction = isMyTurn && game.turn_phase === "ACTION";
  const myScore = calculate_score(game.team_melds[my_team]).total_score;
  const oppScore = calculate_score(game.team_melds[opponent_team]).total_score;

  // Hooks Integration
  useWakeLock();
  const { isMobile } = useMobileCheck();
  const { opponentHeight, startDrag } = useScreenDrag(35);
  useGameAudio(game, isMyTurn);

  // Auto-clear error after 3 seconds
  useEffect(() => {
    if (game.last_error) {
      const timer = setTimeout(() => {
        game.clear_error();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [game.last_error]);

  // --- RENDER FINISH SCREEN ---
  if (game.status === "FINISHED" && game.final_score) {
    return (
      <FinishScreen
        finalScore={game.final_score}
        myTeam={my_team}
        onPlayAgain={() => game.startGame(game.mode)}
        onLeave={game.leaveGame}
      />
    );
  }

  // --- HANDLERS ---
  const toggleSelect = (id: string) => {
    setSelectedCards((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleDeckClick = () => {
    if (canDraw) game.draw_card();
  };

  const handleDiscardClick = () => {
    if (canDraw && selectedCards.length >= 2) {
      game.pick_up_discard_new_meld(selectedCards);
      setSelectedCards([]);
    } else if (canAction && selectedCards.length === 1) {
      game.discard_card(selectedCards[0]);
      setSelectedCards([]);
    }
  };

  const handleMeldClick = (teamId: number, meldIndex: number) => {
    if (teamId !== my_team) return;

    if (canAction && selectedCards.length > 0) {
      game.add_to_meld(selectedCards, meldIndex);
      setSelectedCards([]);
    } else if (canDraw) {
      game.pick_up_discard_add_to_meld(meldIndex, selectedCards);
      setSelectedCards([]);
    }
  };

  return (
    <main
      id="game-screen"
      className="h-screen w-screen bg-[#0f2e1a] text-white overflow-hidden flex flex-col select-none relative font-sans"
    >
      {/* Rules Modal */}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      {/* Menu Dropdown */}
      <div className="absolute top-4 right-4 z-100">
        <GameMenu onOpenRules={() => setShowRules(true)} />
      </div>

      {/* TEXTURA DA MESA */}
      <div
        id="table-texture"
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }}
      ></div>

      {/* ÁREA DO ADVERSÁRIO (Resizable) */}
      <section
        id="opponent-area"
        style={{ height: `${opponentHeight}%` }}
        className="bg-red-950/10 border-b border-white/5 px-2 md:px-6 py-2 flex flex-col relative z-10 min-h-0 transition-[height] duration-75 ease-linear"
      >
        <div className="flex-1 flex flex-wrap content-start md:gap-x-4 gap-y-2 md:gap-y-8 overflow-y-auto scrollbar-hide pt-2">
          {game.team_melds[opponent_team].map((meld, idx) => (
            <MeldDisplay key={idx} meld={meld} scale="scale-90 md:scale-100" />
          ))}
          {
            <div className="absolute text-center w-full h-full flex items-center justify-center pointer-events-none">
              <span className="text-white/5 text-xl md:text-3xl font-black uppercase tracking-[0.5em]">
                ELES
              </span>
            </div>
          }
        </div>
        {/* PLACAR */}
        <CurrentGamePoints points={oppScore} position="right-1 bottom-1" />
      </section>

      {/* SEPARATOR / INFO BAR (Draggable) */}
      <section
        id="game-separator"
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        className="md:h-[5%] bg-white/5 backdrop-blur-md
         px-2 md:px-8 border-y border-white/5 shadow-2xl z-30 shrink-0
          cursor-grab active:cursor-grabbing select-none active:bg-white/10 transition-colors group overflow-hidden"
      >
        <div className="flex h-full items-center justify-between">
          {isMobile ? (
            <>
              {/* MOBILE: DECK ON LEFT */}
              <div className="relative h-full py-1 flex flex-col-reverse gap-y-1 items-center shrink-0">
                <PileCard
                  onClick={handleDeckClick}
                  active={canDraw}
                  mini={true}
                  quantity={game.deck.length}
                />
                <div
                  className="bg-red-900 text-white text-xs font-black
                  px-0.5 flex items-center justify-center rounded-md border border-white/20"
                >
                  <Skull size={14} /> : {game.dead_piles.length}
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
                          {game.hands[Number(id)]?.length || 0}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* CENTER: TURN INFO */}

              <div className="flex flex-col items-center bg-black/40 backdrop-blur-sm px-3 py-1 rounded-lg border border-white/10 shadow-lg mx-1">
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
                          {game.hands[Number(id)]?.length || 0}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* MOBILE: DISCARD ON RIGHT */}
              <div className="relative h-full py-1 flex items-center shrink-0">
                <DiscardCard
                  card={game.discard_pile[0]}
                  onClick={handleDiscardClick}
                  mini={true}
                  isActionable={
                    canDraw || (canAction && selectedCards.length === 1)
                  }
                  highlight={
                    (canDraw && selectedCards.length >= 2) ||
                    hoveredMeld !== null
                  }
                  subtleHighlight={canAction && selectedCards.length === 1}
                />
              </div>
            </>
          ) : (
            /* DESKTOP: JOGADORES */
            <div className="flex h-full gap-2 items-center w-full justify-between overflow-x-auto scrollbar-hide">
              {Object.entries(game.players_data).map(([id, p]) => (
                <>
                  {" "}
                  <div
                    key={id}
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
                      {game.hands[Number(id)]?.length || 0}
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
                              <Dot size={16} /> <Trash size={16} fill="white" />
                            </>
                          )}
                      </>
                    </span>
                  </div>
                </>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ÁREA DO JOGADOR (Resizable) */}
      <section
        id="player-area"
        className="flex-1 bg-blue-950/10 px-2 md:px-6 py-2 flex flex-col relative z-10 min-h-0"
      >
        <div
          className="flex-1 flex flex-wrap content-start md:gap-x-4
         gap-y-2 md:gap-y-8 overflow-y-auto scrollbar-hide pt-2 pb-20"
        >
          {game.team_melds[my_team].map((meld, idx) => {
            // Logic: Can interact if (Draw Phase & Discard Avail) OR (Action Phase & Hand Cards Selected)
            const canInteractWithMeld =
              (canDraw && game.discard_pile.length > 0) ||
              (canAction && selectedCards.length > 0);

            const isHovered =
              hoveredMeld?.teamId === my_team &&
              hoveredMeld?.index === idx &&
              canInteractWithMeld;

            return (
              <MeldDisplay
                key={idx}
                meld={meld}
                isHovered={isHovered}
                interactive={true}
                onClick={() => handleMeldClick(my_team, idx)}
                onMouseEnter={() =>
                  canInteractWithMeld &&
                  setHoveredMeld({ teamId: my_team, index: idx })
                }
                onMouseLeave={() => setHoveredMeld(null)}
                scale="scale-90 md:scale-100"
              />
            );
          })}
          {
            <div className="absolute w-full h-full flex items-center justify-center pointer-events-none">
              <span className="text-white/5 text-xl md:text-3xl font-black uppercase tracking-[0.5em]">
                NÓS
              </span>
            </div>
          }
          {/* Botão Baixar Novo Jogo - VISUAL DE SLOT RETANGULAR */}
          {canAction && selectedCards.length >= 3 && (
            <div
              onClick={() => {
                game.meld_cards(selectedCards);
                setSelectedCards([]);
              }}
              className="shrink-0 w-32 h-20 md:w-48 md:h-32 border-2 border-dotted border-yellow-600/40 bg-yellow-600/5 cursor-pointer hover:bg-yellow-600/10 shadow-sm rounded-xl flex flex-col items-center justify-center transition-all duration-300"
            >
              <div className="flex items-center gap-3 text-yellow-600/60">
                <span className="text-3xl md:text-5xl font-light">+</span>
                <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-left leading-tight">
                  Novo
                  <br />
                  Jogo
                </span>
              </div>
            </div>
          )}{" "}
        </div>

        {/* PLACAR */}
        <CurrentGamePoints points={myScore} position="right-1 top-1" />
      </section>

      {/* FOOTER: [MONTE] [MÃO] [LIXO] */}
      <footer
        id="game-footer"
        className="h-36 md:h-[20%] bg-linear-to-t from-black/95 via-black/80 to-transparent backdrop-blur-md px-2 pb-2 z-40
         relative w-full flex items-end justify-between gap-2 md:gap-6 pointer-events-none"
      >
        {/*  DESKTOP LEFT: DECK PILE */}
        {!isMobile && (
          <div className="flex flex-col items-center gap-2 shrink-0 pb-1 relative pointer-events-auto">
            <PileCard
              onClick={handleDeckClick}
              active={canDraw}
              mini={isMobile}
              quantity={game.deck.length}
            />

            {/* Contadores */}
            {/* contador de mortos */}
            <div
              title="Quantidade de mortos"
              className={`z-50 w-fit px-2 py-1 text-xs bg-red-600 text-white font-black 
              flex items-center justify-center rounded-full shadow-lg border border-white/20`}
            >
              <Skull size={16} />: {game.dead_piles.length}{" "}
              <span className="font-light">{"/2"}</span>
            </div>
          </div>
        )}

        {/* CENTER: PLAYER HAND */}
        {isMobile ? (
          <MobilePlayerHand
            cards={game.hands[my_player_id] || []}
            selectedCardIds={selectedCards}
            lastDrawnCardId={game.last_drawn_card_id}
            onCardClick={toggleSelect}
            onSortHand={game.sort_hand}
          />
        ) : (
          <PlayerHand
            cards={game.hands[my_player_id] || []}
            selectedCardIds={selectedCards}
            lastDrawnCardId={game.last_drawn_card_id}
            onCardClick={toggleSelect}
            onSortHand={game.sort_hand}
            isMobile={false}
          />
        )}
        {/* RIGHT: DISCARD PILE */}
        {!isMobile && (
          <div className="shrink-0 pb-1 relative pointer-events-auto">
            <DiscardCard
              card={game.discard_pile[0]}
              onClick={handleDiscardClick}
              isActionable={
                canDraw || (canAction && selectedCards.length === 1)
              }
              highlight={
                (canDraw && selectedCards.length >= 2) || hoveredMeld !== null
              }
              subtleHighlight={canAction && selectedCards.length === 1}
              mini={isMobile}
            />
            {/* Morto Contador */}
          </div>
        )}

        {/* ADICIONE AQUI UM TOASTER para informar jogadas - por exemplo: Jogador['nome do jogador'] pegou o morto */}

        {/* ERROR TOAST */}
        {game.last_error && (
          <div
            id="error-toast"
            className="absolute -top-16 left-1/2 -translate-x-1/2 bg-red-600/90 backdrop-blur
             text-white px-6 py-2 rounded-md text-sm font-black shadow-2xl
              flex items-center gap-3 border border-white/20 z-100"
          >
            <span>⚠️ {game.last_error}</span>
            <button
              onClick={game.clear_error}
              className="bg-black/20 hover:bg-black/40 rounded-lg w-5 h-5 flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        )}
      </footer>
    </main>
  );
};
