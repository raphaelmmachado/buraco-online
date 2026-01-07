import { useState } from "react";
import { useGameStore } from "../../store/useGameStore";
import { type Card as CardType } from "../../../common/types/card";
import { organize_meld } from "../../../common/utils/sort_cards";
import {
  calculate_score,
  calculate_meld_score,
} from "../../../common/utils/scoring";

// --- NOVOS COMPONENTES VISUAIS (DESIGN PREMIUN COM PROPORÇÕES REVISADAS) ---

const GameCard = ({
  card,
  isSelected,
  onClick,
  small = false,
  hidden = false,
}: {
  card: CardType;
  isSelected?: boolean;
  onClick?: () => void;
  small?: boolean;
  hidden?: boolean;
}) => {
  const isRed = card.color === "red";

  if (hidden) {
    return (
      <div
        onClick={onClick}
        className={`
          relative rounded-lg shadow-xl border-2 border-white/10 bg-gradient-to-br from-indigo-900 via-blue-950 to-slate-900
          flex items-center justify-center overflow-hidden transition-all duration-200
          ${small ? "w-10 h-14" : "w-16 h-24 md:w-20 md:h-32"}
          ${
            onClick ? "cursor-pointer hover:scale-105 hover:brightness-110" : ""
          }
        `}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)",
            backgroundSize: "10px 10px",
          }}
        ></div>
        <div className="text-white/20 text-4xl">♠</div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-lg shadow-lg border bg-white select-none transition-all duration-300
        flex flex-col items-center justify-between p-1
        ${small ? "w-10 h-14 text-[10px]" : "w-16 h-24 md:w-20 md:h-32"}
        ${
          isSelected
            ? "border-yellow-400 -translate-y-6 shadow-yellow-500/50 shadow-2xl z-50 ring-4 ring-yellow-400/30"
            : "border-slate-300 hover:-translate-y-2"
        }
        ${isRed ? "text-red-600" : "text-slate-900"}
        ${onClick ? "cursor-pointer" : ""}
      `}
    >
      <div className="self-start flex flex-col items-center leading-none">
        <span className="font-black text-lg md:text-2xl">{card.value}</span>
        <span className="text-xs md:text-sm">{card.suit.icon}</span>
      </div>

      {!small && (
        <div className="text-5xl opacity-[0.07] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          {card.suit.icon}
        </div>
      )}

      <div className="self-end flex flex-col items-center leading-none rotate-180">
        <span className="font-black text-lg md:text-2xl">{card.value}</span>
        <span className="text-xs md:text-sm">{card.suit.icon}</span>
      </div>
    </div>
  );
};

const MeldBadge = ({ meld }: { meld: CardType[] }) => {
  const { score, type } = calculate_meld_score(meld);
  if (type === "INSUFFICIENT" && meld.length < 3) return null;

  let color = "bg-slate-700";
  let label = "Normal";

  switch (type) {
    case "CLEAN":
      color = "bg-emerald-600";
      label = "LIMPA";
      break;
    case "DIRTY":
      color = "bg-amber-600";
      label = "SUJA";
      break;
    case "KING":
      color = "bg-blue-600";
      label = "500";
      break;
    case "ACE":
      color = "bg-purple-600";
      label = "REAL";
      break;
  }

  return (
    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center z-20 min-w-max">
      <span
        className={`${color} text-[8px] md:text-[10px] text-white font-black px-2.5 py-0.5 rounded-full shadow-lg uppercase tracking-widest border border-white/10`}
      >
        {label}
      </span>
      <span className="text-[10px] text-white font-black drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] mt-0.5">
        {score} pts
      </span>
    </div>
  );
};

// --- TELA PRINCIPAL ---

export const GameScreen = () => {
  const store = useGameStore();
  const [selectedCards, setSelectedCards] = useState<string[]>([]);

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
    if (teamId === my_team && canAction && selectedCards.length > 0) {
      store.add_to_meld(selectedCards, meldIndex);
      setSelectedCards([]);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#0f2e1a] text-white overflow-hidden flex flex-col select-none relative font-sans">
      {/* TEXTURA DA MESA */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }}
      ></div>

      {/* 37.5% ÁREA DO ADVERSÁRIO */}
      <div className="h-[37.5%] bg-gradient-to-b from-black/40 to-transparent border-b border-white/5 p-6 flex flex-col relative z-10">
        <div className="flex justify-between items-center mb-4">
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
              <div className="flex -space-x-10 md:-space-x-12 transition-all group-hover:-space-x-8">
                {organize_meld(meld).map((card) => (
                  <GameCard key={card.id} card={card} />
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
      </div>

      {/* 5% HUD SLIM / INFORMAÇÕES - VISUAL GLASSMORPHISM */}
      <div className="h-[5%] bg-white/5 backdrop-blur-md flex items-center justify-between px-8 border-y border-white/5 shadow-2xl z-30">
        <div className="flex items-center gap-4">
          <div
            className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-500 shadow-lg ${
              isMyTurn
                ? "bg-yellow-500 text-black scale-110 shadow-yellow-500/20"
                : "bg-slate-800 text-slate-500"
            }`}
          >
            {isMyTurn
              ? "Sua Vez"
              : `Vez de: ${
                  store.players_data[store.current_player]?.userName || "..."
                }`}
          </div>
          <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em]">
            {store.turn_phase === "DRAW"
              ? "Fase de Compra"
              : store.turn_phase === "ACTION"
              ? "Fase de Jogo"
              : "Aguardando"}
          </span>
        </div>

        {/* Quantidade de Cartas na Mão de cada jogador */}
        <div className="flex gap-4 items-center overflow-x-auto scrollbar-hide">
          {Object.entries(store.players_data).map(([id, p]) => (
            <div
              key={id}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${
                Number(id) === store.current_player
                  ? "border-yellow-500/50 bg-yellow-500/10"
                  : "border-white/5 bg-black/20"
              }`}
            >
              <span className="text-[8px] font-black text-slate-500">
                P{id}
              </span>
              <span className="text-[10px] font-mono font-bold text-white">
                {store.hands[Number(id)]?.length || 0}🎴
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-black text-slate-500 uppercase">
              Mortos
            </span>
            <span className="bg-red-600/20 text-red-400 px-2 rounded-md font-mono font-bold text-xs">
              {store.dead_piles.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-black text-slate-500 uppercase">
              Deck
            </span>
            <span className="bg-blue-600/20 text-blue-400 px-2 rounded-md font-mono font-bold text-xs">
              {store.deck.length}
            </span>
          </div>
        </div>
      </div>

      {/* 37.5% ÁREA DO SEU JOGO */}
      <div className="h-[37.5%] bg-gradient-to-t from-black/20 to-transparent p-6 flex flex-col relative z-10">
        <div className="flex justify-between items-center mb-4">
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
          {/* Botão Baixar Novo Jogo - VISUAL DE SLOT */}
          {canAction && selectedCards.length >= 3 && (
            <div
              onClick={() => {
                store.meld_cards(selectedCards);
                setSelectedCards([]);
              }}
              className="w-16 h-24 md:w-20 md:h-32 border-2 border-dashed border-yellow-500/40 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-yellow-500/10 transition-all group animate-pulse"
            >
              <span className="text-yellow-500 text-3xl font-light group-hover:scale-125 transition-transform">
                +
              </span>
              <span className="text-[8px] font-black text-yellow-500/60 uppercase tracking-tighter mt-1">
                Baixar Jogo
              </span>
            </div>
          )}

          {store.team_melds[my_team].map((meld, idx) => (
            <div
              key={idx}
              onClick={() => handleMeldClick(my_team, idx)}
              className="relative flex items-center cursor-pointer group"
            >
              <div className="flex -space-x-10 md:-space-x-12 transition-all group-hover:-space-x-8 group-hover:brightness-110">
                {organize_meld(meld).map((card) => (
                  <GameCard key={card.id} card={card} />
                ))}
              </div>
              <MeldBadge meld={meld} />
            </div>
          ))}
        </div>
      </div>

      {/* 20% RODAPÉ: MONTE, LIXO E MÃO */}
      <div className="h-[20%] bg-black/80 backdrop-blur-2xl border-t border-white/10 flex items-center px-8 gap-12 z-40">
        {/* MONTE E LIXO */}
        <div className="flex gap-6 shrink-0 pt-2">
          <div
            onClick={handleDeckClick}
            className={`relative transition-all ${
              canDraw
                ? "cursor-pointer hover:scale-110 active:scale-95"
                : "opacity-40 grayscale"
            }`}
          >
            <div className="absolute inset-0 bg-blue-600 rounded-lg translate-y-2 translate-x-2 opacity-40"></div>
            <div className="absolute inset-0 bg-blue-800 rounded-lg translate-y-1 translate-x-1 opacity-60"></div>
            <GameCard
              card={{
                value: "A",
                suit: { icon: "♠", name: "espadas" },
                color: "black",
                id: "idididi",
              }}
              hidden
            />
            {canDraw && (
              <div className="absolute inset-0 border-4 border-yellow-400 rounded-lg animate-pulse shadow-[0_0_15px_rgba(234,179,8,0.5)]"></div>
            )}
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-black text-blue-400 tracking-widest">
              MONTE
            </span>
          </div>

          <div
            onClick={handleDiscardClick}
            className={`relative transition-all ${
              canDraw || (canAction && selectedCards.length === 1)
                ? "cursor-pointer hover:scale-110"
                : "opacity-40 grayscale"
            }`}
          >
            {store.discard_pile.length > 0 ? (
              <div
                className={`${
                  canAction && selectedCards.length === 1
                    ? "ring-4 ring-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.6)]"
                    : ""
                } rounded-lg transition-all`}
              >
                <GameCard card={store.discard_pile[0]} />
              </div>
            ) : (
              <div className="w-14 h-20 md:w-16 md:h-24 border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center text-[10px] font-black text-white/10">
                LIXO
              </div>
            )}
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-black text-red-400 tracking-widest">
              LIXO
            </span>
          </div>
        </div>

        {/* SUA MÃO - LEQUE DINÂMICO AMPLIADO */}
        <div className="flex-1 flex justify-center items-end h-full pb-6 relative overflow-visible">
          <div className="flex -space-x-10 md:-space-x-14 hover:-space-x-4 transition-all duration-500 items-end">
            {store.hands[my_player_id]?.map((card, i, arr) => {
              const isSel = selectedCards.includes(card.id);
              const center = (arr.length - 1) / 2;
              const rotate = (i - center) * 4;
              const translateY = Math.abs(i - center) * 4;

              return (
                <div
                  key={card.id}
                  className={`transform transition-all duration-300 origin-bottom ${
                    isSel
                      ? "-translate-y-24 z-[100] scale-110"
                      : "hover:-translate-y-12 hover:z-[90]"
                  }`}
                  style={{
                    zIndex: i,
                    transform: isSel
                      ? `translateY(-40px) rotate(0deg)`
                      : `translateY(${translateY}px) rotate(${rotate}deg)`,
                  }}
                >
                  <GameCard
                    card={card}
                    isSelected={isSel}
                    onClick={() => toggleSelect(card.id)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* ERROR TOAST */}
        {store.last_error && (
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-red-600/90 backdrop-blur text-white px-6 py-2 rounded-full text-xs font-black shadow-2xl animate-bounce flex items-center gap-3 border border-white/20">
            <span>⚠️ {store.last_error}</span>
            <button
              onClick={store.clear_error}
              className="bg-black/20 hover:bg-black/40 rounded-full w-5 h-5 flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
