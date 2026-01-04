import { useState } from "react";
import { useGameStore } from "../store/useGameStore-old";
import { useGameBots } from "../hooks/useGameBots";
import { type Card } from "../types/card";
// AQUI: Importamos a função do arquivo de sort_cards
import { organize_meld_visual } from "../utils/sort_cards";

export const DebugGame = () => {
  useGameBots();
  const store = useGameStore();
  const [selectedCards, setSelectedCards] = useState<string[]>([]);

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
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-10">
        <h1 className="text-5xl font-bold mb-8 text-yellow-500">
          🏆 FIM DE JOGO
        </h1>
        <div className="bg-gray-800 p-8 rounded-lg shadow-2xl border border-gray-700 max-w-2xl w-full">
          <div className="grid grid-cols-2 gap-8 text-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-blue-400">Time 1</h2>
              <p className="text-6xl font-black mt-2">
                {store.final_score?.team_1}
              </p>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-red-400">Time 2</h2>
              <p className="text-6xl font-black mt-2">
                {store.final_score?.team_2}
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-400 bg-black/30 p-4 rounded overflow-auto max-h-60">
            <pre>{JSON.stringify(store.final_score, null, 2)}</pre>
          </div>
        </div>
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
    return (
      <div className="min-h-screen bg-green-800 flex flex-col gap-8 items-center justify-center text-white">
        <h1 className="text-4xl font-bold drop-shadow-md">
          ♠️ Buraco Online{" "}
          <span className="text-sm font-normal bg-yellow-600 px-2 py-1 rounded">
            Local/Bots
          </span>
        </h1>
        <div className="flex gap-6">
          <button
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-6 rounded-xl text-xl font-bold shadow-xl border-b-4 border-blue-800 active:border-0 active:translate-y-1 transition-all"
            onClick={() => store.start_game("1v1")}
          >
            👤 1v1 (vs Bot)
          </button>
          <button
            className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-6 rounded-xl text-xl font-bold shadow-xl border-b-4 border-purple-800 active:border-0 active:translate-y-1 transition-all"
            onClick={() => store.start_game("2v2")}
          >
            👥 2v2 (vs 3 Bots)
          </button>
        </div>
      </div>
    );
  }

  // --- JOGO RODANDO ---
  return (
    <div className="min-h-screen bg-green-800 p-4 font-sans text-white pb-64">
      {/* HUD SUPERIOR */}
      <div className="flex justify-between items-start mb-6 bg-green-900/80 p-4 rounded-lg shadow-lg border border-green-700">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            Turno: Jogador {store.current_player}
            {store.current_player === 1 && (
              <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded animate-pulse">
                SUA VEZ
              </span>
            )}
          </h2>
          <p className="text-sm opacity-80 mt-1">
            Fase:{" "}
            <span className="font-mono bg-black/40 px-1 rounded">
              {store.turn_phase}
            </span>
          </p>
          <p className="text-sm opacity-80">Deck: {store.deck.length} cartas</p>
        </div>
        <div className="text-right text-sm">
          <h3 className="font-bold text-green-300">Placar de Jogos (Mesa)</h3>
          <p>Time 1 (Você): {store.team_melds[1].length} jogos</p>
          <p>Time 2 (Bots): {store.team_melds[2].length} jogos</p>
        </div>
      </div>

      {/* ÁREA DOS BOTS (Visualização simples das mãos) */}
      <div className="flex justify-center gap-8 mb-8">
        {[2, 3, 4].map((pid) => {
          // Só mostra se o jogador existir no modo atual
          if (!store.hands[pid]) return null;
          return (
            <div key={pid} className="flex flex-col items-center">
              <div className="bg-red-900/50 p-2 rounded border border-red-800">
                <span className="text-xs font-bold mb-1 block text-center">
                  Bot {pid}
                </span>
                <div className="flex -space-x-3">
                  {store.hands[pid].map((_, i) => (
                    <div
                      key={i}
                      className="w-6 h-8 bg-red-800 border border-white/30 rounded shadow-sm"
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MESA (JOGOS BAIXADOS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* TIME 1 (SEU TIME) */}
        <div className="bg-green-700/40 p-4 rounded-lg border border-green-600/50 min-h-[200px]">
          <h3 className="font-bold mb-4 text-green-200 border-b border-green-600 pb-2">
            Jogos do Seu Time
          </h3>
          <div className="flex flex-wrap gap-6">
            {store.team_melds[1].map((meld, index) => {
              // USA A FUNÇÃO IMPORTADA (Não mais local)
              const visualMeld = organize_meld_visual(meld);
              return (
                <div key={index} className="flex flex-col items-center gap-2">
                  {/* BOTÕES ESPECÍFICOS DO JOGO */}
                  <div className="flex gap-1">
                    {store.current_player === 1 &&
                      store.turn_phase === "ACTION" &&
                      selectedCards.length > 0 && (
                        <button
                          onClick={() => {
                            if (store.add_card_to_meld(selectedCards, index))
                              setSelectedCards([]);
                          }}
                          className="text-[10px] bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded text-white shadow"
                        >
                          ↓ Encaixar
                        </button>
                      )}
                    {store.current_player === 1 &&
                      store.turn_phase === "DRAW" &&
                      store.discard_pile.length > 0 && (
                        <button
                          onClick={() => {
                            // ENVIA CARTAS SELECIONADAS PARA A LÓGICA DE PONTE
                            const success = store.pick_up_discard_add_to_meld(
                              index,
                              selectedCards
                            );
                            if (success) {
                              setSelectedCards([]);
                            } else {
                              alert(
                                "Jogada inválida! Verifique se selecionou a carta de conexão."
                              );
                            }
                          }}
                          className="text-[10px] bg-orange-600 hover:bg-orange-500 px-2 py-1 rounded text-white shadow"
                        >
                          {selectedCards.length > 0
                            ? "+ Lixo (Ponte)"
                            : "+ Lixo"}
                        </button>
                      )}
                  </div>

                  {/* CARTAS */}
                  <div className="flex -space-x-5 hover:space-x-1 transition-all duration-300 p-2">
                    {visualMeld.map((c) => (
                      <div
                        key={c.id}
                        className={`
                                        w-10 h-14 flex items-center justify-center bg-white text-sm font-bold rounded shadow-md border
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
                        <div className="flex flex-col items-center leading-none">
                          <span>{c.value}</span>
                          <span className="text-[10px]">{c.symbol.icon}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* TIME 2 (OPONENTES) */}
        <div className="bg-red-900/20 p-4 rounded-lg border border-red-900/30 min-h-[200px]">
          <h3 className="font-bold mb-4 text-red-200 border-b border-red-900/30 pb-2">
            Jogos dos Bots
          </h3>
          <div className="flex flex-wrap gap-6">
            {store.team_melds[2].map((meld, index) => {
              const visualMeld = organize_meld_visual(meld);
              return (
                <div key={index} className="flex -space-x-5 p-2 opacity-90">
                  {visualMeld.map((c) => (
                    <div
                      key={c.id}
                      className={`
                                    w-10 h-14 flex items-center justify-center bg-gray-100 text-sm font-bold rounded shadow-sm border
                                    ${
                                      c.color === "red"
                                        ? "text-red-600"
                                        : "text-black"
                                    }
                                `}
                    >
                      <div className="flex flex-col items-center leading-none">
                        <span>{c.value}</span>
                        <span className="text-[10px]">{c.symbol.icon}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* BARRA INFERIOR (CONTROLES E MÃO) */}
      <div className="fixed bottom-0 left-0 right-0 bg-green-900 p-4 border-t border-green-700 shadow-2xl z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 items-center">
          {/* ÁREA DE COMPRA / LIXO */}
          <div className="flex gap-4 shrink-0">
            {/* MONTE */}
            <button
              onClick={store.draw_card_from_deck}
              disabled={
                store.current_player !== 1 || store.turn_phase !== "DRAW"
              }
              className={`
                        w-24 h-32 rounded-lg border-2 border-white/20 bg-blue-900 flex flex-col items-center justify-center shadow-lg transition-transform
                        ${
                          store.current_player === 1 &&
                          store.turn_phase === "DRAW"
                            ? "cursor-pointer hover:-translate-y-2 ring-4 ring-yellow-400 border-white"
                            : "opacity-60 cursor-not-allowed"
                        }
                    `}
            >
              <span className="text-3xl">🎴</span>
              <span className="text-xs text-white font-bold mt-2">MONTE</span>
            </button>

            {/* LIXO */}
            <div className="relative group">
              {store.discard_pile.length > 0 ? (
                <div className="w-24 h-32 bg-white rounded-lg border border-gray-400 flex flex-col items-center justify-center shadow-lg relative">
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
                  <span className="absolute top-1 right-1 text-[10px] text-gray-400 font-mono">
                    LIXO
                  </span>
                </div>
              ) : (
                <div className="w-24 h-32 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-white/30 text-xs">Vazio</span>
                </div>
              )}
            </div>
          </div>

          {/* MÃO DO JOGADOR */}
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
              {store.hands[1]?.length === 0 && (
                <span className="text-white/50 text-sm self-center">
                  Mão vazia (Já pegou o morto?)
                </span>
              )}
            </div>
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="flex flex-col gap-2 min-w-[200px] shrink-0">
            {/* BOTÕES DE TURNO (Só aparecem na sua vez) */}
            {store.current_player === 1 && (
              <>
                {/* AÇÕES DE DRAW */}
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
                    className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded font-bold shadow text-sm"
                  >
                    Pegar Lixo (Baixar Jogo)
                  </button>
                )}

                {/* AÇÕES DE ACTION */}
                {store.turn_phase === "ACTION" && (
                  <>
                    <button
                      onClick={() => {
                        if (store.meld_cards(selectedCards))
                          setSelectedCards([]);
                      }}
                      disabled={selectedCards.length < 3}
                      className="bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded font-bold shadow flex items-center justify-center gap-2"
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
                      className="bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded font-bold shadow flex items-center justify-center gap-2"
                    >
                      🗑️ Descartar
                    </button>
                  </>
                )}
              </>
            )}

            {/* CONTROLES EXTRAS */}
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
