import { useState, useEffect, useRef } from "react";
import { useGameStore } from "../../store/useGameStore";
import { organize_meld } from "../../../common/utils/sort_cards";
import { calculate_score } from "../../../common/utils/scoring";
import start_sound from "../../sound/start.wav";
// UI Components
import { MeldBadge } from "../game-ui/MeldBadge";
import { GameMenu } from "../game-ui/GameMenu";
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
  const [hudTicker, setHudTicker] = useState(0);

  // Ticker timer for HUD
  useEffect(() => {
    const timer = setInterval(
      () => setHudTicker((prev) => (prev + 1) % 2),
      3500
    );
    return () => clearInterval(timer);
  }, []);

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

      {/* 37.5% ÁREA DO ADVERSÁRIO */}
      <section
        id="opponent-area"
        className="h-[37.5%] bg-red-950/10 border-b border-white/5 px-4 md:px-6 py-2 flex flex-col relative z-10"
      >
        <div className="flex-1 flex flex-wrap content-start gap-x-4 md:gap-x-10 gap-y-8 md:gap-y-14 overflow-y-auto scrollbar-hide pt-2">
          {store.team_melds[opponent_team].map((meld, idx) => (
            <div key={idx} className="relative group flex items-center">
              <div className="flex -space-x-8 md:-space-x-10 transition-all">
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

      {/* 5% SEPARATOR SLIM / INFORMAÇÕES - VISUAL GLASSMORPHISM */}
      <section
        id="game-separator"
        className="h-[6%] md:h-[5%] bg-white/5 backdrop-blur-md flex items-center justify-between px-4 md:px-8 border-y border-white/5 shadow-2xl z-30"
      >
        <div className="flex items-center gap-2 md:gap-4">
          {/* MOBILE: Ticker Animado (Economiza espaço) */}
          <div className="md:hidden">
            <div
              className={`
                relative overflow-hidden w-28 h-7 rounded-full shadow-lg transition-colors duration-500 
                flex items-center justify-center border border-white/10
                ${
                  isMyTurn
                    ? "bg-blue-600 shadow-blue-500/20"
                    : "bg-gray-700 shadow-gray-500/20"
                }
              `}
            >
              {/* Texto 1: Status */}
              <div
                className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-in-out transform ${
                  hudTicker === 0
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 -translate-y-full"
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-white">
                  {isMyTurn ? "SUA VEZ" : "AGUARDE"}
                </span>
              </div>

              {/* Texto 2: Fase */}
              <div
                className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-in-out transform ${
                  hudTicker === 1
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-full"
                }`}
              >
                <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest">
                  {isMyTurn
                    ? store.turn_phase === "DRAW"
                      ? "COMPRE"
                      : store.turn_phase === "ACTION"
                      ? "JOGUE"
                      : "..."
                    : store.turn_phase === "DRAW"
                    ? "COMPRANDO"
                    : store.turn_phase === "ACTION"
                    ? "JOGANDO"
                    : "..."}
                </span>
              </div>
            </div>
          </div>

          {/* DESKTOP: Layout Original */}
          <div className="hidden md:flex items-center gap-4">
            <div
              className={`px-3 md:px-4 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-500 shadow-lg ${
                isMyTurn
                  ? "bg-blue-600 text-white scale-105 md:scale-110 shadow-blue-500/20"
                  : "bg-gray-600 text-white shadow-gray-500/20"
              }`}
            >
              {isMyTurn ? "Sua Vez" : `Aguarde sua vez`}
            </div>

            <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em]">
              {store.turn_phase === "DRAW"
                ? "FASE DE COMPRA"
                : store.turn_phase === "ACTION"
                ? "FASE DE JOGO"
                : "AGUARDANDO"}
            </span>
          </div>
        </div>

        {/* JOGADORES NO HUD (MOBILE OPTIMIZED) */}
        <div
          className="flex gap-2 items-center overflow-x-auto 
        scrollbar-hide "
        >
          {Object.entries(store.players_data).map(([id, p]) => (
            <div
              key={id}
              title="Cartas na mão"
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-all ${
                Number(id) === store.current_player
                  ? "border-yellow-500 bg-yellow-500/20"
                  : "border-white/5 bg-black/20"
              }`}
            >
              <span
                className={`hidden sm:block text-sm font-black uppercase ${
                  Number(id) % 2 === my_player_id % 2
                    ? "text-blue-300"
                    : "text-red-300"
                }`}
              >
                {p.userName}
                <span className="text-sm text-gray-600">{" : "}</span>
              </span>

              <span
                className={`block sm:hidden text-xs font-semibold uppercase ${
                  Number(id) % 2 === my_player_id % 2
                    ? "text-blue-300"
                    : "text-red-300"
                }`}
              >
                {p.userName.substring(0, 3)}
                <span className="text-xs text-gray-600">{" | "}</span>
              </span>

              <span className="text-xs font-mono font-bold text-white">
                {store.hands[Number(id)]?.length || 0}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 37.5% ÁREA DO SEU JOGO */}
      <section
        id="player-area"
        className="h-[37.5%] bg-blue-950/10 px-4 md:px-6 py-2 flex flex-col relative z-10"
      >
        <div className="flex-1 flex flex-wrap content-start gap-x-4 md:gap-x-10 gap-y-8 md:gap-y-14 overflow-y-auto scrollbar-hide pt-4">
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
                className={`relative flex items-center cursor-pointer transition-transform ${
                  isHovered ? "scale-105" : ""
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
          {/* Botão Baixar Novo Jogo - VISUAL DE SLOT */}
          {canAction && selectedCards.length >= 3 && (
            <div
              onClick={() => {
                store.meld_cards(selectedCards);
                setSelectedCards([]);
              }}
              className="w-14 h-20 md:w-16 md:h-24 border-2 border-dashed border-yellow-500/40 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-yellow-500/10 transition-all group animate-pulse"
            >
              <span className="text-yellow-500 text-3xl font-light group-hover:scale-125 transition-transform">
                +
              </span>
              <span className="text-[8px] font-black text-yellow-500/60 uppercase tracking-tighter mt-1">
                Baixar
              </span>
            </div>
          )}
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

      {/* 20% RODAPÉ: MÃO E CONTROLES (REORGANIZADO PARA MOBILE) */}
      <footer
        id="game-footer"
        className="flex items-center justify-between
         h-[20%] bg-linear-to-t from-black/95 via-black/80 to-transparent backdrop-blur-md px-4 pb-4 gap-4 z-40 relative overflow-visible"
      >
        {/* MONTE E LIXO - FLUTUANTE NO MOBILE, INTEGRADO NO DESKTOP */}
        <div
          id="deck-discard-area"
          className="flex gap-2 md:gap-4 shrink-0 pb-2 md:pb-0 z-50"
        >
          <div id="deck-pile" className="relative group">
            <PileCard onClick={handleDeckClick} active={canDraw} />

            {/* Contadores Integrados ao Monte */}
            <div
              className="absolute -top-2 -left-2 bg-slate-800 text-white text-[10px] font-black w-6 h-6
                 flex items-center justify-center rounded-full shadow-lg border border-white/20 z-50"
              title="Cartas no deck"
            >
              {store.deck.length}
            </div>
            <div
              className="absolute -bottom-2 -right-2 bg-amber-600 text-white text-[10px] font-black w-6 h-6
                 flex items-center justify-center rounded-full shadow-lg border border-white/20 z-50"
              title="Mortos disponíveis"
            >
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

        {/* SUA MÃO */}
        <div
          id="player-hand"
          className="flex-1 flex justify-center items-end h-full relative overflow-visible pb-2"
        >
          <div className="flex -space-x-10 md:-space-x-14 hover:-space-x-4 transition-all duration-500 items-end origin-bottom">
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
          {/* ORGANIZAR CARTAS */}
          <div
            id="player-controls"
            className="z-50 absolute -bottom-3 right-1/3 md:right-1/3 md:-translate-x-1/2"
          >
            <button
              onClick={store.sort_hand}
              className="group relative bg-gray-600 px-2 backdrop-blur-xl border-3 border-white/10 hover:border-blue-500/50 rounded-full transition-all duration-300 shadow-2xl hover:shadow-blue-500/20 active:scale-95 flex items-center justify-center"
              title="Organizar Mão"
            >
              <span className="text-sm md:text-md group-hover:rotate-12 transition-transform duration-500">
                🪄 Organizar
              </span>
            </button>
          </div>
        </div>

        {/* <GameMenu onOpenRules={() => setShowRules(true)} /> */}
        {/* ERROR TOAST */}
        {store.last_error && (
          <div
            id="error-toast"
            className="absolute -top-16 left-1/2 -translate-x-1/2 bg-red-600/90 backdrop-blur text-white px-6 py-2 rounded-full text-xs font-black shadow-2xl animate-bounce flex items-center gap-3 border border-white/20"
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
