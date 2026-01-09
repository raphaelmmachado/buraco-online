import { useState, useEffect, useRef } from "react";
import { useGameStore } from "../../store/useGameStore";
import { organize_meld } from "../../../common/utils/sort_cards";
import { calculate_score } from "../../../common/utils/scoring";
import start_sound from "../../assets/sound/start.wav";
// UI Components
import { MeldBadge } from "../game-ui/MeldBadge";
import { RulesModal } from "../game-ui/RulesModal";
import { HandCard } from "../game-ui/HandCard";
import { MeldCard } from "../game-ui/MeldCard";
import { PileCard } from "../game-ui/PileCard";
import { DiscardCard } from "../game-ui/DiscardCard";
// --- TELA PRINCIPAL ---

export const GameScreen = () => {
  const store = useGameStore();
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [hoveredMeld, setHoveredMeld] = useState<{
    teamId: number;
    index: number;
  } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

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
    if (store.last_error) {
      const timer = setTimeout(() => {
        store.clear_error();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [store.last_error]);

  const my_player_id = store.my_player_number ?? 1;
  const my_team = my_player_id % 2 !== 0 ? 1 : 2;
  const opponent_team = my_team === 1 ? 2 : 1;
  const isMyTurn = store.current_player === my_player_id;

  const canDraw = isMyTurn && store.turn_phase === "DRAW";
  const canAction = isMyTurn && store.turn_phase === "ACTION";

  const myScore = calculate_score(store.team_melds[my_team]).total_score;
  const oppScore = calculate_score(store.team_melds[opponent_team]).total_score;

  const start_audio = new Audio(start_sound);

  useEffect(() => {
    if (isMyTurn) {
      start_audio.play();
      if (document.hidden) {
        new Notification("É sua vez!", {
          body: "Volte para o jogo 🎮",
        });
        start_audio.play();
      }
    }
  }, [isMyTurn]);
  const toggleSelect = (id: string) => {
    setSelectedCards((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleDeckClick = () => {
    if (canDraw) store.draw_card();
  };

  const handleDiscardClick = () => {
    if (canDraw && selectedCards.length >= 2) {
      store.pick_up_discard_new_meld(selectedCards);
      setSelectedCards([]);
    } else if (canAction && selectedCards.length === 1) {
      store.discard_card(selectedCards[0]);
      setSelectedCards([]);
    }
  };

  const handleMeldClick = (teamId: number, meldIndex: number) => {
    if (teamId !== my_team) return;

    if (canAction && selectedCards.length > 0) {
      store.add_to_meld(selectedCards, meldIndex);
      setSelectedCards([]);
    } else if (canDraw) {
      store.pick_up_discard_add_to_meld(meldIndex, selectedCards);
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
        className="bg-red-950/10 border-b border-white/5 px-4 md:px-6 py-2 flex flex-col relative z-10 min-h-0 transition-[height] duration-75 ease-linear"
      >
        <div className="flex-1 flex flex-wrap content-start gap-x-4 md:gap-x-10 gap-y-4 md:gap-y-14 overflow-y-auto scrollbar-hide pt-2">
          {store.team_melds[opponent_team].map((meld, idx) => (
            <div key={idx} className="relative group flex items-center">
              <div className="flex -space-x-8 md:-space-x-10 transition-all scale-75 md:scale-100 origin-left">
                {organize_meld(meld).map((card) => (
                  <MeldCard key={card.id} card={card} />
                ))}
              </div>
              <MeldBadge meld={meld} />
            </div>
          ))}
          {store.team_melds[opponent_team].length === 0 && (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-white/5 text-xl md:text-3xl font-black uppercase tracking-[0.5em]">
                ELES
              </span>
            </div>
          )}
        </div>
        {/* PLACAR */}
        <div
          className="absolute bottom-1 right-1 bg-black/40 px-2 md:px-4 py-1 md:py-2 rounded-full
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
        className="relative flex items-center justify-between h-10 md:h-[5%] bg-white/5 backdrop-blur-md
         px-4 md:px-8 border-y border-white/5 shadow-2xl z-30 shrink-0 cursor-row-resize select-none active:bg-white/10 transition-colors group"
      >
        {/* LEFT: STATUS (DESKTOP ONLY NOW) */}
        <div className="absolute -bottom-5 md:static flex items-center gap-2 md:gap-4 shrink-0">
          {/* DESKTOP: Layout Original */}
          <div className="flex items-center gap-4">
            <span
              className={`w-2 h-2 ${
                isMyTurn ? "bg-blue-400 animate-pulse" : "bg-white/40"
              } rounded-full`}
            ></span>

            <span
              className={`text-[8px] font-bold ${
                isMyTurn ? "text-blue-400" : "text-white/50"
              } uppercase tracking-[0.2em]`}
            >
              <>
                {isMyTurn ? "Você deve" : "Alguém deve"}{" "}
                {store.turn_phase === "DRAW"
                  ? "COMPRAR"
                  : store.turn_phase === "ACTION"
                  ? "JOGAR"
                  : "..."}
              </>
            </span>
          </div>
        </div>

        {/* RIGHT: JOGADORES (NAMES VISIBLE ON MOBILE) */}
        <div className="w-full md:w-auto flex gap-2 items-center md:justify-end justify-between overflow-x-auto scrollbar-hide">
          {Object.entries(store.players_data).map(([id, p]) => (
            <div
              key={id}
              className={`relative shrink-0 flex items-center justify-center px-3 py-1 md:px-2 md:py-0.5 rounded-full border transition-all ${
                Number(id) === store.current_player
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
                {store.hands[Number(id)]?.length || 0}
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
        <div className="flex-1 flex flex-wrap content-start gap-x-4 md:gap-x-10 gap-y-4 md:gap-y-14 overflow-y-auto scrollbar-hide pt-2 pb-20">
          {store.team_melds[my_team].map((meld, idx) => {
            const isHovered =
              hoveredMeld?.teamId === my_team && hoveredMeld?.index === idx;
            const canHighlight = canDraw && store.discard_pile.length > 0;

            return (
              <div
                key={idx}
                onClick={() => handleMeldClick(my_team, idx)}
                onMouseEnter={() =>
                  canHighlight &&
                  setHoveredMeld({ teamId: my_team, index: idx })
                }
                onMouseLeave={() => setHoveredMeld(null)}
                className={`relative flex items-center cursor-pointer transition-transform scale-90 md:scale-100 origin-top-left ${
                  isHovered ? "scale-95 md:scale-105" : ""
                }`}
              >
                <div className="flex -space-x-8 md:-space-x-10 transition-all">
                  {organize_meld(meld).map((card) => (
                    <MeldCard key={card.id} card={card} highlight={isHovered} />
                  ))}
                </div>
                <MeldBadge meld={meld} />
              </div>
            );
          })}
          {store.team_melds[my_team].length === 0 && (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-white/5 text-xl md:text-3xl font-black uppercase tracking-[0.5em]">
                NÓS
              </span>
            </div>
          )}
        </div>

        {/* BOTÃO BAIXAR JOGO (FLOATING ABOVE FOOTER) */}
        {canAction && selectedCards.length >= 3 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
            <button
              onClick={() => {
                store.meld_cards(selectedCards);
                setSelectedCards([]);
              }}
              className="bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-black px-6 py-2 rounded-full shadow-2xl animate-bounce flex items-center gap-2 border-2 border-black/10"
            >
              <span>BAIXAR JOGO</span>
              <span className="bg-black/20 rounded px-1">
                {selectedCards.length}
              </span>
            </button>
          </div>
        )}

        {/* PLACAR */}
        <div
          className="absolute top-1 right-1 bg-black/40 px-2 md:px-4 py-1 md:py-2 rounded-full
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
        className="h-28 md:h-[20%] bg-linear-to-t from-black/95 via-black/80 to-transparent backdrop-blur-md px-2 pb-2 z-40 relative w-full flex items-end justify-between gap-2 md:gap-6"
      >
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
            {store.deck.length}
          </div>
          {/* contador de mortos */}
          <div
            title="Quantidade de mortos"
            className={`absolute ${
              isMobile ? " w-4 h-4 text-[8px]" : "w-6 h-6 text-xs"
            } -bottom-2 -right-2 bg-red-600 text-white font-black flex items-center justify-center rounded-full shadow-lg border border-white/20 z-50`}
          >
            {store.dead_piles.length}
          </div>
        </div>

        {/* CENTER: PLAYER HAND */}
        <div
          id="player-hand"
          className="flex-1 h-full flex items-end justify-center px-2 relative"
        >
          <div className="flex -space-x-10 md:-space-x-14 transition-all duration-500 items-end origin-bottom pb-2">
            {(store.hands[my_player_id] || []).map((card, i, arr) => (
              <HandCard
                key={card.id}
                card={card}
                isSelected={selectedCards.includes(card.id)}
                onClick={() => toggleSelect(card.id)}
                index={i}
                totalCards={arr.length}
              />
            ))}
          </div>

          {/* ORGANIZAR CARTAS (Centered below hand) */}
          <div
            id="player-controls"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 translate-y-full z-50 mb-1"
          >
            <button
              onClick={store.sort_hand}
              className="bg-gray-800/90 hover:bg-blue-600/90 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full backdrop-blur-md border border-white/10 shadow-lg transition-all active:scale-95 flex items-center gap-1"
              title="Organizar Mão"
            >
              <span>🪄 Organizar</span>
            </button>
          </div>
        </div>

        {/* RIGHT: DISCARD PILE */}
        <div className="shrink-0 pb-1 relative">
          <DiscardCard
            card={store.discard_pile[0]}
            onClick={handleDiscardClick}
            isActionable={canDraw || (canAction && selectedCards.length === 1)}
            highlight={
              (canDraw && selectedCards.length >= 2) || hoveredMeld !== null
            }
            mini={isMobile}
          />
          {/* Morto Contador */}
        </div>

        {/* ERROR TOAST */}
        {store.last_error && (
          <div
            id="error-toast"
            className="absolute -top-16 left-1/2 -translate-x-1/2 bg-red-600/90 backdrop-blur text-white px-6 py-2 rounded-full text-xs font-black shadow-2xl animate-bounce flex items-center gap-3 border border-white/20 z-[100]"
          >
            <span>⚠️ {store.last_error}</span>
            <button
              onClick={store.clear_error}
              className="bg-black/20 hover:bg-black/40 rounded-full w-5 h-5 flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        )}
      </footer>
    </main>
  );
};
