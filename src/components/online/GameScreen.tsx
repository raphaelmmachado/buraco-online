import { useState, useEffect } from "react";
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

      {/* 30% ÁREA DO ADVERSÁRIO (Reduced) */}
      <section
        id="opponent-area"
        className="flex-[0.3] md:flex-[0.35] bg-red-950/10 border-b border-white/5 px-4 md:px-6 py-2 flex flex-col relative z-10 min-h-0"
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

      {/* SEPARATOR / INFO BAR */}
      <section
        id="game-separator"
        className=" flex items-center justify-between h-10 md:h-[5%] bg-white/5 backdrop-blur-md
         px-4 md:px-8 border-y border-white/5 shadow-2xl z-30 shrink-0"
      >
        {/* LEFT: STATUS (DESKTOP ONLY NOW) */}
        <div className="absolute -bottom-5 md:static flex items-center gap-2 md:gap-4 shrink-0">
          {/* DESKTOP: Layout Original */}
          <div className="flex items-center gap-4">
            <span
              className={`w-2 h-2 ${
                isMyTurn ? "bg-green-600 animate-pulse" : "bg-white/40"
              } rounded-full`}
            ></span>

            <span
              className={`text-[9px] font-bold ${
                isMyTurn ? "text-green-500" : "text-white/50"
              } uppercase tracking-[0.2em]`}
            >
              {store.turn_phase === "DRAW"
                ? "FASE DE COMPRA"
                : store.turn_phase === "ACTION"
                ? "FASE DE JOGO"
                : "AGUARDANDO"}
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

      {/* ÁREA DO JOGADOR (FLEX GROWTH) */}
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

        {/* DECK & DISCARD & ACTIONS (MOBILE: FLOATING BOTTOM LEFT) */}
        <div className="absolute bottom-2 left-2 md:bottom-4 md:left-6 flex flex-col gap-2 z-40">
          {/* Botão Baixar (Contextual) - VISIBLE ON BOTH, BUT POSITIONED HERE FOR MOBILE */}
          {canAction && selectedCards.length >= 3 && (
            <button
              onClick={() => {
                store.meld_cards(selectedCards);
                setSelectedCards([]);
              }}
              className="mb-2 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-black px-4 py-2 rounded-full shadow-lg animate-bounce flex items-center gap-2"
            >
              <span>BAIXAR JOGO</span>
              <span className="bg-black/20 rounded px-1">
                {selectedCards.length}
              </span>
            </button>
          )}

          {/* DECK AND DISCARD ROW - MOBILE ONLY */}
          <div className="md:hidden flex items-end gap-2">
            <div id="deck-pile" className="relative group">
              <PileCard onClick={handleDeckClick} active={canDraw} />

              {/* Contadores */}
              <div className="absolute -top-2 -left-2 bg-slate-800 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-lg border border-white/20 z-50">
                {store.deck.length}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-amber-600 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-lg border border-white/20 z-50">
                {store.dead_piles.length}
              </div>
            </div>

            <div id="discard-pile" className="relative group">
              <DiscardCard
                card={store.discard_pile[0]}
                onClick={handleDiscardClick}
                isActionable={
                  canDraw || (canAction && selectedCards.length === 1)
                }
                highlight={
                  (canDraw && selectedCards.length >= 2) || hoveredMeld !== null
                }
              />
            </div>
          </div>
        </div>

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

      {/* FOOTER: MÃO DO JOGADOR (FULL WIDTH) */}
      <footer
        id="game-footer"
        className="h-32 md:h-[20%] bg-linear-to-t from-black/95 via-black/80 to-transparent backdrop-blur-md px-2 pb-2 z-40 relative w-full flex items-end justify-between gap-4"
      >
        {/* DESKTOP ONLY: DECK & DISCARD (Left Side) */}
        <div className="hidden md:flex gap-4 shrink-0 pb-2 pl-4">
          <div id="deck-pile" className="relative group">
            <PileCard onClick={handleDeckClick} active={canDraw} />

            {/* Contadores */}
            <div className="absolute -top-2 -left-2 bg-slate-800 text-white text-xs font-black w-6 h-6 flex items-center justify-center rounded-full shadow-lg border border-white/20 z-50">
              {store.deck.length}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-amber-600 text-white text-xs font-black w-6 h-6 flex items-center justify-center rounded-full shadow-lg border border-white/20 z-50">
              {store.dead_piles.length}
            </div>
          </div>

          <div id="discard-pile" className="relative group">
            <DiscardCard
              card={store.discard_pile[0]}
              onClick={handleDiscardClick}
              isActionable={
                canDraw || (canAction && selectedCards.length === 1)
              }
              highlight={
                (canDraw && selectedCards.length >= 2) || hoveredMeld !== null
              }
            />
          </div>
        </div>

        <div
          id="player-hand"
          className="w-full h-full flex justify-center items-end relative"
        >
          <div className="flex -space-x-8 md:-space-x-14 hover:-space-x-4 transition-all duration-500 items-end origin-bottom pb-2 overflow-x-visible">
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

          {/* ORGANIZAR CARTAS (Moved to top right of footer) */}
          <div
            id="player-controls"
            className="absolute top-0 right-2 md:right-4 -translate-y-1/2 z-50"
          >
            <button
              onClick={store.sort_hand}
              className="bg-gray-700/80 hover:bg-blue-600/80 text-white p-2 rounded-full backdrop-blur-md border border-white/10 shadow-lg transition-all active:scale-95"
              title="Organizar Mão"
            >
              <span className="text-lg">🪄</span>
            </button>
          </div>
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
