import { useState } from "react";
import { useGameStore } from "../store/useGameStore-old";
import { useGameBots } from "../hooks/useGameBots";
import { type Card } from "../../common/types/card";
import { organize_meld_visual } from "../../common/utils/sort_cards";
// ADICIONE ESTE IMPORT
import { calculate_score } from "../../common/utils/scoring";

export const DebugGame = () => {
  useGameBots();
  const store = useGameStore();
  const [selectedCards, setSelectedCards] = useState<string[]>([]);

  // --- CÁLCULO DE PONTUAÇÃO EM TEMPO REAL ---
  // Calculamos apenas o total_score baseado nos jogos da mesa
  const scoreTeam1 = calculate_score(store.team_melds[1] || []).total_score;
  const scoreTeam2 = calculate_score(store.team_melds[2] || []).total_score;

  // Helpers UI
  const toggleSelect = (id: string) => {
    setSelectedCards((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const getCardStyle = (card: Card) => {
    const isSelected = selectedCards.includes(card.id);
    return `
      relative w-16 h-24 rounded-md border-2 flex flex-col items-center justify-center cursor-pointer transition-all select-none
      ${
        isSelected
          ? "border-yellow-400 -translate-y-4 shadow-xl z-10"
          : "border-gray-300 hover:-translate-y-1"
      }
      ${
        card.color === "red"
          ? "text-red-600 bg-white"
          : "text-gray-900 bg-white"
      }
    `;
  };

  // --- TELA DE FIM DE JOGO ---
  if (store.status === "FINISHED") {
    // ... (Mantenha o código de fim de jogo igual)
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-10">
        <h1 className="text-5xl font-bold mb-8 text-yellow-500">
          🏆 FIM DE JOGO
        </h1>
        {/* ... resto do código de fim de jogo ... */}
        <button
          onClick={() => window.location.reload()}
          className="bg-green-600 hover:bg-green-500 text-white px-8 py-4 mt-8 rounded-full font-bold text-xl shadow-lg transition-transform hover:scale-105"
        >
          Jogar Novamente
        </button>
      </div>
    );
  }

  // --- LOBBY ---
  if (store.status === "LOBBY") {
    // ... (Mantenha o código de lobby igual)
    return (
      <div className="min-h-screen bg-green-800 flex flex-col gap-8 items-center justify-center text-white">
        {/* ... Botões do Lobby ... */}
        <button
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-6 rounded-xl text-xl font-bold shadow-xl border-b-4 border-blue-800 active:border-0 active:translate-y-1 transition-all"
          onClick={() => store.start_game("1v1")}
        >
          👤 1v1 (vs Bot)
        </button>
        <button
          className="bg-green-600 hover:bg-green-500 text-white px-8 py-6 rounded-xl text-xl font-bold shadow-xl border-b-4 border-green-800 active:border-0 active:translate-y-1 transition-all"
          onClick={() => store.start_game("2v2")}
        >
          👤 2v2 (vs Bot)
        </button>
        {/* ... */}
      </div>
    );
  }

  // --- JOGO RODANDO ---
  return (
    <div className="min-h-screen bg-green-800 font-sans text-white pb-64">
      {/* --- NOVA BARRA DISCRETA (Substitui o HUD antigo) --- */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-white/10 px-4 py-2 mb-6 flex items-center justify-between text-xs shadow-md">
        {/* ESQUERDA: Time 1 (Você) */}
        <div className="flex flex-col">
          <span className="text-blue-300 font-bold uppercase tracking-wider text-[10px]">
            VOCÊ
          </span>
          <span className="text-lg font-bold text-blue-100 leading-none">
            {scoreTeam1} pts
          </span>
        </div>

        {/* CENTRO: Info do Jogo */}
        <div className="flex gap-6 opacity-90">
          {/* Mortos */}
          <div className="flex flex-col items-center">
            <span className="font-bold text-gray-300 text-[10px] uppercase">
              Mortos
            </span>
            <div className="flex items-center gap-1">
              {store.dead_piles.length > 0 ? (
                <>
                  <span className="text-red-400 font-bold text-lg leading-none">
                    {store.dead_piles.length}
                  </span>
                  <div className="w-3 h-4 bg-red-600 border border-white/30 rounded-sm shadow-sm"></div>
                </>
              ) : (
                <span className="text-gray-500 font-bold">0</span>
              )}
            </div>
          </div>

          {/* Deck */}
          <div className="flex flex-col items-center">
            <span className="font-bold text-gray-300 text-[10px] uppercase">
              Monte
            </span>
            <span className="text-lg font-bold leading-none">
              {store.deck.length}
            </span>
          </div>

          {/* Turno */}
          <div className="flex flex-col items-center border-l border-white/20 pl-4 ml-2">
            <span className="font-bold text-gray-300 text-[10px] uppercase">
              Turno
            </span>
            <div className="flex items-center gap-1">
              {store.current_player === 1 && (
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              )}
              <span
                className={`font-bold ${
                  store.current_player === 1
                    ? "text-yellow-400"
                    : "text-gray-400"
                }`}
              >
                {store.current_player === 1 ? "SUA VEZ" : "BOT"}
              </span>
              <span>{store.turn_phase === "DRAW" && "FASE DE COMPRA"}</span>
              <span>{store.turn_phase === "DISCARD" && "DISCARTE"}</span>
              <span>
                {store.turn_phase === "ACTION" && "ABAIXE OU JOGUE FORA"}
              </span>
            </div>
          </div>
        </div>

        {/* DIREITA: Time 2 (Oponentes) */}
        <div className="flex flex-col items-end">
          <span className="text-red-300 font-bold uppercase tracking-wider text-[10px]">
            RIVAL
          </span>
          <span className="text-lg font-bold text-red-100 leading-none">
            {scoreTeam2} pts
          </span>
        </div>
      </div>
      {/* ------------------------------------------------------ */}

      <div className="px-4">
        {/* ÁREA DOS BOTS (Visualização simples das mãos) */}

        {/* MESA (JOGOS BAIXADOS) */}
        <div className="grid grid-cols-1 gap-4 mb-12">
          {/* TIME 1 (SEU TIME) */}
          <div className="bg-green-700/30 p-3 rounded-lg border border-green-600/30 min-h-[150px]">
            {/* Removi o cabeçalho grande, deixando só os jogos */}
            <div className="flex flex-wrap gap-4">
              {store.team_melds[1].map((meld, index) => {
                const visualMeld = organize_meld_visual(meld);
                return (
                  <div key={index} className="flex flex-col items-center gap-1">
                    {/* BOTÕES ESPECÍFICOS DO JOGO (Mantidos) */}
                    <div className="flex gap-1 h-5">
                      {store.current_player === 1 &&
                        store.turn_phase === "ACTION" &&
                        selectedCards.length > 0 && (
                          <button
                            onClick={() => {
                              if (store.add_card_to_meld(selectedCards, index))
                                setSelectedCards([]);
                            }}
                            className="text-[10px] bg-blue-600 hover:bg-blue-500 px-2 rounded text-white shadow"
                          >
                            ↓
                          </button>
                        )}
                      {/* Botão de Ponte (Mantido mas simplificado visualmente) */}
                      {store.current_player === 1 &&
                        store.turn_phase === "DRAW" &&
                        store.discard_pile.length > 0 && (
                          <button
                            onClick={() => {
                              const success = store.pick_up_discard_add_to_meld(
                                index,
                                selectedCards
                              );
                              if (success) setSelectedCards([]);
                              else alert("Inválido!");
                            }}
                            className="text-[10px] bg-orange-600 hover:bg-orange-500 px-2 rounded text-white shadow"
                          >
                            + Lixo
                          </button>
                        )}
                    </div>

                    {/* CARTAS */}
                    <div className="flex -space-x-6 hover:space-x-1 transition-all duration-300 pt-1 px-2">
                      {visualMeld.map((c) => (
                        <div
                          key={c.id}
                          className={`
                                w-9 h-12 flex items-center justify-center bg-white text-xs
                                text font-bold rounded shadow-md border
                                ${
                                  c.color === "red"
                                    ? "text-red-600 border-red-200"
                                    : "text-black border-gray-300"
                                }
                                ${
                                  c.value === "2" &&
                                  c.symbol.name !== meld[0].symbol.name
                                    ? "ring-2 ring-yellow-400 z-10"
                                    : ""
                                }
                            `}
                        >
                          <div className="flex flex-col items-center leading-none scale-90">
                            <span>{c.value}</span>
                            <span className="text-[8px]">{c.symbol.icon}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {visualMeld[0].symbol.name}
                  </div>
                );
              })}
            </div>
          </div>

          {/* TIME 2 (OPONENTES) */}
          <div className="bg-red-900/10 p-3 rounded-lg border border-red-900/20 min-h-[150px]">
            <div className="flex flex-wrap gap-4">
              {store.team_melds[2].map((meld, index) => {
                const visualMeld = organize_meld_visual(meld);
                return (
                  <div
                    key={index}
                    className="flex -space-x-6 pt-6 px-2 opacity-90"
                  >
                    {visualMeld.map((c) => (
                      <div
                        key={c.id}
                        className={`
                                w-9 h-12 flex items-center justify-center bg-gray-100 text-xs font-bold rounded shadow-sm border
                                ${
                                  c.color === "red"
                                    ? "text-red-600"
                                    : "text-black"
                                }
                            `}
                      >
                        <div className="flex flex-col items-center leading-none scale-90">
                          <span>{c.value}</span>
                          <span className="text-[8px]">{c.symbol.icon}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* BARRA INFERIOR (CONTROLES E MÃO) - Mantida igual */}
      <div className="fixed bottom-0 left-0 right-0 bg-green-900 p-4 border-t border-green-700 shadow-2xl z-50">
        {/* ... (Código da barra inferior permanece igual ao original) ... */}
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 items-center">
          {/* ... */}
          <div className="flex gap-4 shrink-0">
            <button
              onClick={store.draw_card_from_deck}
              disabled={
                store.current_player !== 1 || store.turn_phase !== "DRAW"
              }
              className={`w-24 h-32 rounded-lg border-2 border-white/20 bg-blue-900 flex flex-col items-center justify-center shadow-lg transition-transform ${
                store.current_player === 1 && store.turn_phase === "DRAW"
                  ? "cursor-pointer hover:-translate-y-2 ring-4 ring-yellow-400 border-white"
                  : "opacity-60 cursor-not-allowed"
              }`}
            >
              <span className="text-3xl">🎴</span>
              <span className="text-xs text-white font-bold mt-2">MONTE</span>
            </button>
            {/* ... Lixo e Mão ... */}
            <div className="relative group">
              {/* ... código do lixo ... */}
              {store.discard_pile.length > 0 ? (
                <div className="w-24 h-32 bg-white rounded-lg border border-gray-400 flex flex-col items-center justify-center shadow-lg relative">
                  {/* ... conteúdo do lixo ... */}
                  <span
                    className={`text-4xl ${
                      store.discard_pile[0].color === "red"
                        ? "text-red-600"
                        : "text-black"
                    }`}
                  >
                    {store.discard_pile[0].value}
                  </span>
                  <span
                    className={`text-2xl ${
                      store.discard_pile[0].color === "red"
                        ? "text-red-600"
                        : "text-black"
                    }`}
                  >
                    {store.discard_pile[0].symbol.icon}
                  </span>
                </div>
              ) : (
                <div className="w-24 h-32 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-white/30 text-xs">Vazio</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-x-auto pb-4 px-4 scrollbar-thin scrollbar-thumb-green-600">
            <div className="flex gap-[-2.5rem] min-w-max pt-4 pl-4">
              {store.hands[1]?.map((card) => (
                <div
                  key={card.id}
                  onClick={() => toggleSelect(card.id)}
                  className={getCardStyle(card)}
                >
                  <span className="text-xl font-bold">{card.value}</span>
                  <span className="text-2xl">{card.symbol.icon}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col gap-2 min-w-50 shrink-0">
            {store.current_player === 1 && (
              <>
                {store.turn_phase === "DRAW" && (
                  <button
                    onClick={() => {
                      if (store.pick_up_discard_new_meld(selectedCards))
                        setSelectedCards([]);
                    }}
                    disabled={
                      selectedCards.length < 2 ||
                      store.discard_pile.length === 0
                    }
                    className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white py-2 rounded font-bold shadow text-sm"
                  >
                    Pegar Lixo (Baixar)
                  </button>
                )}
                {store.turn_phase === "ACTION" && (
                  <>
                    <button
                      onClick={() => {
                        if (store.meld_cards(selectedCards))
                          setSelectedCards([]);
                      }}
                      disabled={selectedCards.length < 3}
                      className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-3 rounded font-bold shadow flex items-center justify-center gap-2"
                    >
                      📥 Baixar Jogo
                    </button>
                    <button
                      onClick={() => {
                        if (selectedCards.length === 1) {
                          store.discard_card(selectedCards[0]);
                          setSelectedCards([]);
                        }
                      }}
                      disabled={selectedCards.length !== 1}
                      className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-3 rounded font-bold shadow flex items-center justify-center gap-2"
                    >
                      🗑️ Descartar
                    </button>
                  </>
                )}
              </>
            )}
            <button
              onClick={store.sort_my_hand}
              className="text-xs text-green-300 underline hover:text-white mt-2"
            >
              Reordenar Mão
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
