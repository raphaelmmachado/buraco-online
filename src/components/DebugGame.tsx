import { useState } from "react";
import { useGameStore } from "../store/useGameStore";
import { useGameBots } from "../hooks/useGameBots"; // Importa o hook dos bots
import { organize_meld_visual } from "../utils/sort_cards";
export const DebugGame = () => {
  // Inicializa os Bots
  useGameBots();

  const store = useGameStore();
  const [selectedCards, setSelectedCards] = useState<string[]>([]);

  // Helpers para UI
  const toggleSelect = (id: string) => {
    setSelectedCards((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  if (store.status === "FINISHED") {
    return (
      <div className="p-10 text-center">
        <h1 className="text-4xl font-bold mb-4">FIM DE JOGO</h1>
        <pre className="text-left bg-gray-100 p-4 rounded">
          {JSON.stringify(store.final_score, null, 2)}
        </pre>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-500 text-white px-4 py-2 mt-4 rounded"
        >
          Reiniciar
        </button>
      </div>
    );
  }

  if (store.status === "LOBBY") {
    return (
      <div className="flex flex-col gap-4 items-center justify-center h-screen">
        <h1 className="text-2xl font-bold">Lobby de Teste</h1>
        <div className="flex gap-4">
          <button
            className="bg-green-500 text-white px-6 py-3 rounded text-xl"
            onClick={() => store.start_game("1v1")}
          >
            Iniciar 1v1 (vs Bot)
          </button>
          <button
            className="bg-purple-500 text-white px-6 py-3 rounded text-xl"
            onClick={() => store.start_game("2v2")}
          >
            Iniciar 2v2 (vs 3 Bots)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-green-800 min-h-screen text-white font-mono">
      {/* HUD SUPERIOR */}
      <div className="flex justify-between mb-4 border-b pb-2">
        <div>
          <h2 className="text-xl font-bold">
            Turno: Jogador {store.current_player}
          </h2>
          <p>Fase: {store.turn_phase}</p>
          <p>Deck: {store.deck.length} cartas</p>
        </div>
        <div>
          <h3 className="font-bold">Times:</h3>
          <p>Time 1 (P1+P3): {store.team_melds[1].length} jogos</p>
          <p>Time 2 (P2+P4): {store.team_melds[2].length} jogos</p>
        </div>
      </div>

      {/* ÁREA DO LIXO E BOTÕES DE AÇÃO */}
      <div className="mb-8 p-4 bg-green-700 rounded flex gap-8 items-start">
        <div>
          <h3 className="font-bold mb-2">Lixo (Discard Pile)</h3>
          {store.discard_pile.length === 0 ? (
            <div className="w-24 h-32 border-2 border-dashed border-white flex items-center justify-center">
              Vazio
            </div>
          ) : (
            <div className="flex flex-col">
              <div
                className={`w-24 h-32 bg-white ${
                  store.discard_pile[0].color === "red"
                    ? "text-red-600"
                    : "text-black"
                } border rounded flex items-center justify-center text-2xl font-bold`}
              >
                {store.discard_pile[0].value}{" "}
                {store.discard_pile[0].symbol.icon}
              </div>
              <span className="text-sm mt-1">
                {store.discard_pile.length} cartas
              </span>
            </div>
          )}
        </div>

        {/* CONTROLES DO JOGADOR 1 */}
        {store.current_player === 1 && (
          <div className="flex flex-col gap-2">
            <h3 className="font-bold text-yellow-300">Suas Ações:</h3>

            {store.turn_phase === "DRAW" && (
              <div className="flex gap-2">
                <button
                  onClick={store.draw_card_from_deck}
                  className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded"
                >
                  Comprar do Monte
                </button>
                <button
                  onClick={() => {
                    if (store.pick_up_discard_new_meld(selectedCards)) {
                      setSelectedCards([]); // Limpa seleção se der certo
                    }
                  }}
                  className="bg-orange-600 hover:bg-orange-500 px-4 py-2 rounded"
                >
                  Pegar Lixo (Criar Jogo)
                </button>
              </div>
            )}

            {store.turn_phase === "ACTION" && (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    if (store.meld_cards(selectedCards)) setSelectedCards([]);
                  }}
                  className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded"
                  disabled={selectedCards.length < 3}
                >
                  Baixar Jogo Selecionado
                </button>

                <button
                  onClick={() => {
                    if (selectedCards.length > 0) {
                      // Agora aceita mais de 1
                      // Tenta adicionar TODAS as selecionadas ao primeiro jogo do time
                      // (Na UI real o usuário escolheria qual jogo)
                      store.team_melds[1].forEach((_, index) => {
                        store.add_card_to_meld(selectedCards, index);
                      });
                      setSelectedCards([]);
                    }
                  }}
                  className="bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded"
                >
                  Colar Selecionadas
                </button>

                <button
                  onClick={() => {
                    if (selectedCards.length === 1) {
                      store.discard_card(selectedCards[0]);
                      setSelectedCards([]);
                    }
                  }}
                  className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded"
                  disabled={selectedCards.length !== 1}
                >
                  Descartar Selecionada
                </button>
              </div>
            )}

            <button
              onClick={store.sort_my_hand}
              className="mt-2 text-sm underline text-gray-300"
            >
              Ordenar Mão
            </button>
          </div>
        )}
      </div>

      {/* MÃO DO JOGADOR 1 */}
      <div>
        <h3 className="text-xl font-bold mb-2">
          Sua Mão ({store.hands[1]?.length || 0})
        </h3>
        <div className="flex flex-wrap gap-2">
          {store.hands[1]?.map((card) => {
            const isSelected = selectedCards.includes(card.id);
            return (
              <div
                key={card.id}
                onClick={() => toggleSelect(card.id)}
                className={`
                  w-20 h-28 bg-white text-black rounded cursor-pointer border-2 flex flex-col items-center justify-center transition-all
                  ${
                    isSelected
                      ? "border-yellow-400 -translate-y-4 shadow-xl"
                      : "border-gray-300 hover:-translate-y-1"
                  }
                `}
              >
                <span
                  className={`text-2xl font-bold ${
                    card.color === "red" ? "text-red-600" : "text-black"
                  }`}
                >
                  {card.value}
                </span>
                <span
                  className={`text-3xl ${
                    card.color === "red" ? "text-red-600" : "text-black"
                  }`}
                >
                  {card.symbol.icon}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* JOGOS NA MESA (TEAM 1) */}
      <div className="mt-8">
        <h3 className="text-xl font-bold text-blue-300">
          Jogos do Seu Time (Team 1)
        </h3>
        <div className="flex gap-4 overflow-x-auto p-2 pb-12">
          {" "}
          {/* Aumentei o padding bottom para caber o botão */}
          {store.team_melds[1].map((meld, index) => {
            // Função visual para organizar (se você já tiver adicionado)
            // Se não tiver, use: const visualMeld = meld;
            const visualMeld = organize_meld_visual
              ? organize_meld_visual(meld)
              : meld;

            return (
              <div key={index} className="flex flex-col gap-2">
                {/* BOTÃO 1: ENCAIXAR MANUALMENTE (Cartas da Mão -> Este Jogo) */}
                {store.turn_phase === "ACTION" &&
                  store.current_player === 1 &&
                  selectedCards.length > 0 && (
                    <button
                      onClick={() => {
                        // Tenta adicionar ao jogo específico (index)
                        const success = store.add_card_to_meld(
                          selectedCards,
                          index
                        );
                        if (success) {
                          setSelectedCards([]); // Limpa a seleção só se der certo
                        } else {
                          alert("Essas cartas não encaixam aqui!"); // Feedback visual simples
                        }
                      }}
                      className="text-xs bg-teal-600 hover:bg-teal-500 text-white py-1 px-3 rounded shadow-sm w-full"
                    >
                      ↓ Encaixar Seleção
                    </button>
                  )}
                {/* O Jogo em si */}
                <div className="bg-green-900 p-2 rounded border border-green-600 min-w-[100px] flex gap-1">
                  {visualMeld.map((c) => (
                    <div
                      key={c.id}
                      className={`
                                text-xs px-2 py-4 rounded font-bold shadow-md
                                ${
                                  c.color === "red"
                                    ? "bg-white text-red-600"
                                    : "bg-white text-black"
                                }
                                ${
                                  c.value === "2" &&
                                  c.symbol.name !== meld[0].symbol.name
                                    ? "border-2 border-yellow-400"
                                    : ""
                                } 
                            `}
                    >
                      {c.value} {c.symbol.icon}
                    </div>
                  ))}
                </div>

                {/* BOTÃO NOVO: Pegar Lixo e Encaixar neste jogo */}
                {store.turn_phase === "DRAW" &&
                  store.discard_pile.length > 0 &&
                  store.current_player === 1 && (
                    <button
                      onClick={() => store.pick_up_discard_add_to_meld(index)}
                      className="text-xs bg-orange-600 hover:bg-orange-500 text-white py-1 px-2 rounded shadow-sm"
                    >
                      + Lixo ({store.discard_pile[0].value})
                    </button>
                  )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
