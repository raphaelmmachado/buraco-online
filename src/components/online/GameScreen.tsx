import { useState, useEffect } from "react";
import { useGameStore } from "../../store/useGameStore";
import { organize_meld } from "../../../common/utils/sort_cards";
import { calculate_score } from "../../../common/utils/scoring";

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
        className="h-[37.5%] bg-linear-to-b from-black/40 to-transparent border-b border-white/5 px-6 py-3 flex flex-col relative z-10"
      >
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_red]"></span>
            <span className="text-xs font-black text-red-300 uppercase tracking-[0.3em]">
              Mesa Adversária
            </span>
          </div>
          <div className="bg-black/40 px-4 py-1 rounded-full border border-white/10 shadow-inner">
            <span className="text-sm font-black font-mono text-white">
              {oppScore}{" "}
              <span className="text-[10px] text-gray-400 uppercase ml-1">
                pts
              </span>
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-wrap content-start gap-x-10 gap-y-14 overflow-y-auto scrollbar-hide pt-2">
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
              <span className="text-white/10 text-xl font-black uppercase tracking-[0.5em] rotate-12">
                Sem Jogos
              </span>
            </div>
          )}
        </div>
      </section>

      {/* 5% HUD SLIM / INFORMAÇÕES - VISUAL GLASSMORPHISM */}
      <section
        id="game-hud"
        className="h-[5%] bg-white/5 backdrop-blur-md flex items-center justify-between px-8 border-y border-white/5 shadow-2xl z-30"
      >
        <div className="flex items-center gap-4">
          <div
            className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-500 shadow-lg ${
              isMyTurn
                ? "bg-yellow-500 text-black scale-110 shadow-yellow-500/20"
                : "bg-slate-800 text-slate-500"
            }`}
          >
            {isMyTurn ? "Sua Vez" : "Aguarde"}
          </div>

          <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em]">
            {store.turn_phase === "DRAW"
              ? "COMPRE OU PEGUE LIXO"
              : store.turn_phase === "ACTION"
              ? "JOGUE UMA CARTA"
              : "Aguardando"}
          </span>
        </div>

        {/* Quantidade de Cartas na Mão de cada jogador */}
        <div className="flex gap-3 items-center overflow-x-auto scrollbar-hide max-w-[40%]">
          {Object.entries(store.players_data).map(([id, p]) => (
            <div
              key={id}
              className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all ${
                Number(id) === store.current_player
                  ? "border-yellow-500 bg-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.2)]"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <span
                className={`text-[9px] font-black truncate max-w-[60px] uppercase ${
                  Number(id) === store.current_player
                    ? "text-yellow-400"
                    : "text-slate-400"
                }`}
              >
                {p.userName}
              </span>
              <span className="text-[10px] font-mono font-bold text-white flex items-center gap-1">
                <span className="opacity-50 text-[8px]">x</span>
                {`${store.hands[Number(id)]?.length || 0} cartas`}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 37.5% ÁREA DO SEU JOGO */}
      <section
        id="player-area"
        className="h-[37.5%] bg-gradient-to-t from-black/20 to-transparent px-6 py-3 flex flex-col relative z-10"
      >
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]"></span>
            <span className="text-xs font-black text-blue-300 uppercase tracking-[0.3em]">
              Seu Time (Time {my_team})
            </span>
          </div>
          <div className="bg-black/40 px-4 py-1 rounded-full border border-white/10 shadow-inner">
            <span className="text-sm font-black font-mono text-white">
              {myScore}{" "}
              <span className="text-[10px] text-gray-400 uppercase ml-1">
                pts
              </span>
            </span>
          </div>
        </div>
        <div className="flex-1 flex flex-wrap content-start gap-x-10 gap-y-14 overflow-y-auto scrollbar-hide pt-4">
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
      </section>

      {/* 20% RODAPÉ: MONTE, LIXO E MÃO */}
      <footer
        id="game-footer"
        className="h-[20%] bg-gradient-to-t from-black/95 via-black/80 to-transparent backdrop-blur-md flex items-end justify-center px-4 pb-4 gap-8 z-40 relative overflow-visible"
      >
        {/* MONTE E LIXO */}
        <div id="deck-discard-area" className="flex gap-4 shrink-0 pb-2">
          <div id="deck-pile" className="relative">
            <PileCard onClick={handleDeckClick} active={canDraw} />
            <span
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-black
             text-white-400 tracking-widest text-center w-full"
            >
              <span>{`${store.deck.length} CARTAS`}</span>
            </span>
          </div>

          <div id="discard-pile" className="relative">
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
            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-black text-white-400 tracking-widest">
              LIXO
            </span>
          </div>
        </div>

        {/* SUA MÃO - LEQUE DINÂMICO AMPLIADO */}
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
        </div>

        {/* CONTROLES DO JOGADOR (Organizar + Menu) - COLUNA DISCRETA */}
        <div
          id="player-controls"
          className="absolute bottom-[22%] right-6 z-50 flex flex-col items-center gap-3"
        >
          <button
            onClick={store.sort_hand}
            className="group relative w-10 h-10 bg-white/5 backdrop-blur-xl border border-white/10 hover:border-blue-500/50 rounded-full transition-all duration-300 shadow-2xl hover:shadow-blue-500/20 active:scale-95 flex items-center justify-center"
            title="Organizar Mão"
          >
            <span className="text-xl group-hover:rotate-12 transition-transform duration-500">
              🪄
            </span>
          </button>

          <GameMenu onOpenRules={() => setShowRules(true)} />
        </div>

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
