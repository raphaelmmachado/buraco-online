import { useState, useEffect, useRef, useMemo } from "react";
import { calculate_score } from "../../../common/utils/scoring";
import start_sound from "../../assets/sound/start.wav";
import pounding_card_sound from "../../assets/sound/pounding.mp3";
import flick_card_sound from "../../assets/sound/flick-card.mp3";
import flip_card_sound from "../../assets/sound/flipcard.mp3";
import card_placement_sound from "../../assets/sound/card-placement.mp3";
// UI Components
import { MeldDisplay } from "../game-ui/MeldDisplay";
import { GameMenu } from "../game-ui/GameMenu";
import { RulesModal } from "../game-ui/RulesModal";
import { FinishScreen } from "./FinishScreen";
import { HandCard } from "../game-ui/HandCard";
import { PileCard } from "../game-ui/PileCard";
import { DiscardCard } from "../game-ui/DiscardCard";
import { type GameAdapterInterface } from "../game-ui/useLocalGameAdapter";

// --- TELA PRINCIPAL ---

export const GameScreen = ({ game }: { game: GameAdapterInterface }) => {
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [hoveredMeld, setHoveredMeld] = useState<{
    teamId: number;
    index: number;
  } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isTouched, setIsTouched] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Splitter State
  const [opponentHeight, setOpponentHeight] = useState(35); // Percentage
  const isDragging = useRef(false);

  // Drag Logic
  useEffect(() => {
    const handleMove = (y: number) => {
      if (!isDragging.current) return;
      const percentage = (y / window.innerHeight) * 100;
      // Clamp between 15% and 60% to prevent breaking layout
      if (percentage >= 15 && percentage <= 60) {
        setOpponentHeight(percentage);
      }
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientY);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientY);

    const onEnd = () => {
      isDragging.current = false;
      document.body.style.cursor = "default";
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchend", onEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchend", onEnd);
    };
  }, []);

  const startDrag = () => {
    isDragging.current = true;
    document.body.style.cursor = "row-resize";
  };

  // Auto-clear error after 3 seconds
  useEffect(() => {
    if (game.last_error) {
      const timer = setTimeout(() => {
        game.clear_error();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [game.last_error]);

  const my_player_id = game.my_player_number ?? 1;
  const my_team = my_player_id % 2 !== 0 ? 1 : 2;
  const opponent_team = my_team === 1 ? 2 : 1;
  const isMyTurn = game.current_player === my_player_id;

  const canDraw = isMyTurn && game.turn_phase === "DRAW";
  const canAction = isMyTurn && game.turn_phase === "ACTION";

  const myScore = calculate_score(game.team_melds[my_team]).total_score;
  const oppScore = calculate_score(game.team_melds[opponent_team]).total_score;

  // --- AUDIO SYSTEM (Optimized) ---
  // Memoize audio instances so they are not re-created on every render
  const sfx = useMemo(
    () => ({
      start: new Audio(start_sound),
      deadPile: new Audio(pounding_card_sound),
      flick: new Audio(flick_card_sound),
      flip: new Audio(flip_card_sound),
      placement: new Audio(card_placement_sound),
    }),
    []
  );

  // Helper to safely play sound
  const playSound = (audio: HTMLAudioElement) => {
    audio.currentTime = 0; // Rewind to start for rapid playback
    audio.play().catch((e) => console.warn("Audio play blocked:", e));
  };

  // State trackers to prevent sounds on mount
  const isMounted = useRef(false);
  const prevDeckLen = useRef(game.deck.length);
  const prevDeadPileLen = useRef(game.dead_piles.length);
  const prevMeldsStr = useRef(JSON.stringify(game.team_melds)); // Deep compare string trick

  // Notification & Start Sound
  useEffect(() => {
    if (isMyTurn) {
      playSound(sfx.start);
      if (document.hidden) {
        new Notification("É sua vez!", {
          body: "Compre uma carta do monte ou pegue o lixo.",
        });
      }
    }
  }, [isMyTurn, sfx]);

  // SFX Triggers
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }

    // Dead Pile Taken
    if (game.dead_piles.length < prevDeadPileLen.current) {
      playSound(sfx.deadPile);
    }
    prevDeadPileLen.current = game.dead_piles.length;

    // Deck Draw (Deck size decreased)
    if (game.deck.length < prevDeckLen.current) {
      playSound(sfx.flip);
    }
    prevDeckLen.current = game.deck.length;

    // Meld Change (Card placed)
    const currentMeldsStr = JSON.stringify(game.team_melds);
    if (currentMeldsStr !== prevMeldsStr.current) {
      playSound(sfx.flick);
      prevMeldsStr.current = currentMeldsStr;
    }
  }, [game.dead_piles.length, game.deck.length, game.team_melds, sfx]);

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
        <div className="flex-1 flex flex-wrap content-start md:gap-x-8 gap-y-4 md:gap-y-14 overflow-y-auto scrollbar-hide pt-2">
          {game.team_melds[opponent_team].map((meld, idx) => (
            <MeldDisplay key={idx} meld={meld} />
          ))}
          {game.team_melds[opponent_team].length === 0 && (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-white/5 text-xl md:text-3xl font-black uppercase tracking-[0.5em]">
                ELES
              </span>
            </div>
          )}
        </div>
        {/* PLACAR */}
        <div
          className="absolute bottom-1 right-1 bg-black/40 px-2 md:px-4 py-1 md:py-2 rounded-lg
         border border-white/10 shadow-inner flex items-center"
        >
          <span className="text-[10px] md:text-sm font-black text-white leading-none">
            {oppScore}{" "}
            <span className="text-[8px] md:text-[10px] text-gray-400 uppercase ml-1">
              pts
            </span>
          </span>
        </div>
      </section>

      {/* SEPARATOR / INFO BAR (Draggable) */}
      <section
        id="game-separator"
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        className="h-10 md:h-[5%] bg-white/5 backdrop-blur-md
         px-4 md:px-8 border-y border-white/5 shadow-2xl z-30 shrink-0
          cursor-row-resize select-none active:bg-white/10 transition-colors group overflow-hidden"
      >
        {/* JOGADORES*/}
        <div className="flex h-full gap-2 items-center  justify-between overflow-x-auto scrollbar-hide">
          {Object.entries(game.players_data).map(([id, p]) => (
            <div
              key={id}
              className={`relative shrink-0 flex items-center justify-center px-3 py-1 md:px-2 md:py-0.5 rounded-lg border transition-all ${
                Number(id) === game.current_player
                  ? "border-yellow-500 bg-yellow-500/20"
                  : "border-white/5 bg-black/20"
              }`}
            >
              <span
                className={`text-[10px] md:text-sm font-black uppercase ${
                  Number(id) % 2 === my_player_id % 2
                    ? "text-blue-300"
                    : "text-red-300"
                }`}
              >
                {p.userName.substring(0, 8)}
                <span className="text-gray-500 mx-1">:</span>
              </span>
              <span className="text-[10px] md:text-sm font-mono font-bold text-white">
                {game.hands[Number(id)]?.length || 0}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ÁREA DO JOGADOR (Resizable) */}
      <section
        id="player-area"
        className="flex-1 bg-blue-950/10 px-2 md:px-6 py-2 flex flex-col relative z-10 min-h-0"
      >
        <div className="flex-1 flex flex-wrap content-start md:gap-x-8 gap-y-4 md:gap-y-14 overflow-y-auto scrollbar-hide pt-2 pb-20">
          {game.team_melds[my_team].map((meld, idx) => {
            const isHovered =
              hoveredMeld?.teamId === my_team && hoveredMeld?.index === idx;
            const canHighlight = canDraw && game.discard_pile.length > 0;

            return (
              <MeldDisplay
                key={idx}
                meld={meld}
                isHovered={isHovered}
                interactive={true}
                onClick={() => handleMeldClick(my_team, idx)}
                onMouseEnter={() =>
                  canHighlight &&
                  setHoveredMeld({ teamId: my_team, index: idx })
                }
                onMouseLeave={() => setHoveredMeld(null)}
                scale="scale-90 md:scale-100"
              />
            );
          })}
          {game.team_melds[my_team].length === 0 && (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-white/5 text-xl md:text-3xl font-black uppercase tracking-[0.5em]">
                NÓS
              </span>
            </div>
          )}
          {/* Botão Baixar Novo Jogo - VISUAL DE SLOT RETANGULAR */}
          {canAction && selectedCards.length >= 3 && (
            <div
              onClick={() => {
                game.meld_cards(selectedCards);
                setSelectedCards([]);
              }}
              className="w-24 h-12 md:w-44 md:h-24 border-2 border-dashed border-yellow-500/40 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-yellow-500/10 transition-all group animate-pulse"
            >
              <div className="flex items-center gap-2">
                <span className="text-yellow-500 text-xl font-light group-hover:scale-125 transition-transform">
                  +
                </span>
                <span className="text-[10px] font-black text-yellow-500/60 uppercase tracking-widest">
                  Novo Jogo
                </span>
              </div>
            </div>
          )}{" "}
        </div>

        {/* PLACAR */}
        <div
          className="absolute top-1 right-1 bg-black/40 px-2 md:px-4 py-1 md:py-2 rounded-lg
         border border-white/10 shadow-inner flex items-center"
        >
          <span className="text-[10px] md:text-sm font-black text-white leading-none">
            {myScore}{" "}
            <span className="text-[8px] md:text-[10px] text-gray-400 uppercase ml-1">
              pts
            </span>
          </span>
        </div>
      </section>

      {/* FOOTER: [MONTE] [MÃO] [LIXO] */}
      <footer
        id="game-footer"
        className="h-28 md:h-[20%] bg-linear-to-t from-black/95 via-black/80 to-transparent backdrop-blur-md px-2 pb-2 z-40
         relative w-full flex items-end justify-between gap-2 md:gap-6"
      >
        <div className="absolute top-1 md:-top-10 flex items-center gap-2 md:gap-4 shrink-0">
          {/* DESKTOP: Layout Original */}
          <div className="flex items-center gap-x-1">
            <span
              className={`w-2 h-2 ${
                isMyTurn ? "bg-blue-400 animate-pulse" : "bg-white/40"
              } rounded-full`}
            ></span>

            <span
              className={`text-[8px] sm:text-xs font-bold ${
                isMyTurn ? "text-blue-400" : "text-white/50"
              } uppercase tracking-[0.2em]`}
            >
              <>
                {isMyTurn ? "Você" : "Alguém"}{" "}
                {game.turn_phase === "DRAW"
                  ? "COMPRA"
                  : game.turn_phase === "ACTION"
                  ? "JOGA"
                  : "..."}
              </>
            </span>
          </div>
        </div>
        {/* LEFT: DECK PILE */}
        <div className="shrink-0 pb-1 relative">
          <PileCard
            onClick={handleDeckClick}
            active={canDraw}
            mini={isMobile}
          />

          {/* Contadores */}
          {/* contador de deck */}
          <div
            title="Cartas no monte"
            className={`absolute ${
              isMobile ? "w-4 h-4 text-[8px]" : "w-6 h-6 text-xs"
            } -top-2 -right-2 bg-slate-800 text-white font-black flex items-center justify-center rounded-full shadow-lg border border-white/20 z-50`}
          >
            {game.deck.length}
          </div>
          {/* contador de mortos */}
          <div
            title="Quantidade de mortos"
            className={`absolute ${
              isMobile ? " w-4 h-4 text-[8px]" : "w-6 h-6 text-xs"
            } -bottom-2 -right-2 bg-red-600 text-white font-black flex items-center justify-center rounded-full shadow-lg border border-white/20 z-50`}
          >
            {game.dead_piles.length}
          </div>
        </div>

        {/* CENTER: PLAYER HAND */}
        <div
          onContextMenu={(e) => e.preventDefault()}
          onTouchMove={() => {
            setIsTouched((prev) => (prev ? false : true));
          }}
          // onTouchEndCapture={() => {
          //   setTimeout(() => {
          //     setIsTouched(false);
          //   }, 3200);
          // }}
          id="player-hand"
          className="flex-1 h-full flex items-end justify-center select-none touch-manipulation
          group/hand px-2 pt-8 relative overflow-x-auto md:overflow-visible scrollbar-hide"
        >
          <div
            className={`flex md:-space-x-14 ${
              isTouched ? "-space-x-8" : "-space-x-10"
            }
            transition-all duration-500 items-end origin-bottom pb-2`}
          >
            {(game.hands[my_player_id] || []).map((card, i, arr) => (
              <HandCard
                key={card.id}
                card={card}
                isSelected={selectedCards.includes(card.id)}
                onClick={() => toggleSelect(card.id)}
                index={i}
                totalCards={arr.length}
                isMobile={isMobile}
              />
            ))}
          </div>

          {/* ORGANIZAR CARTAS (Centered below hand) */}
          <div
            id="player-controls"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 translate-y-full z-50 mb-1"
          >
            <button
              onClick={game.sort_hand}
              className="bg-gray-800/90 hover:bg-gray-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full backdrop-blur-md border border-white/10 shadow-lg transition-all active:scale-95 flex items-center gap-1"
              title="Organizar Mão"
            >
              <span>🪄 Organizar</span>
            </button>
          </div>
        </div>

        {/* RIGHT: DISCARD PILE */}
        <div className="shrink-0 pb-1 relative">
          <DiscardCard
            card={game.discard_pile[0]}
            onClick={handleDiscardClick}
            isActionable={canDraw || (canAction && selectedCards.length === 1)}
            highlight={
              (canDraw && selectedCards.length >= 2) || hoveredMeld !== null
            }
            mini={isMobile}
          />
          {/* Morto Contador */}
        </div>

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
