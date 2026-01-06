import { useState } from "react";
import { useGameStore } from "../../store/useGameStore";
import { type Card } from "../../../common/types/card";
import { organize_meld_visual } from "../../../common/utils/sort_cards";
import { calculate_score } from "../../../common/utils/scoring";

export const GameScreen = () => {
  const store = useGameStore();
  const [selectedCards, setSelectedCards] = useState<string[]>([]);

  // Deriva a mão do jogador a partir do objeto `hands`
  const my_hand = store.hands[store.my_player_number ?? 0] || [];

  const scoreTeam1 = calculate_score(store.team_melds[1] || []).total_score;
  const scoreTeam2 = calculate_score(store.team_melds[2] || []).total_score;

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

  return (
    <div className="min-h-screen bg-green-800 font-sans text-white pb-64">
      {/* HUD */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-white/10 px-4 py-2 mb-6 flex items-center justify-between text-xs shadow-md">
        <div className="flex flex-col">
          <span className="text-blue-300 font-bold uppercase tracking-wider text-[10px]">
            Seu Time (Time 1)
          </span>
          <span className="text-lg font-bold text-blue-100 leading-none">
            {scoreTeam1} pts
          </span>
        </div>

        <div className="flex gap-6 opacity-90">
          <div className="flex flex-col items-center">
            <span className="font-bold text-gray-300 text-[10px] uppercase">
              Monte
            </span>
            <span className="text-lg font-bold leading-none">
              {store.deck.length}
            </span>
          </div>

          <div className="flex flex-col items-center border-l border-white/20 pl-4 ml-2">
            <span className="font-bold text-gray-300 text-[10px] uppercase">
              Turno
            </span>
            <div className="flex items-center gap-1">
              {store.current_player === store.my_player_number && (
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              )}
              <span
                className={`font-bold ${
                  store.current_player === store.my_player_number
                    ? "text-yellow-400"
                    : "text-gray-400"
                }`}
              >
                {store.current_player === store.my_player_number
                  ? "SUA VEZ"
                  : "Aguarde"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-red-300 font-bold uppercase tracking-wider text-[10px]">
            Rival (Time 2)
          </span>
          <span className="text-lg font-bold text-red-100 leading-none">
            {scoreTeam2} pts
          </span>
        </div>
      </div>

      {/* Mesa */}
      <div className="px-4">
        <div className="grid grid-cols-1 gap-4 mb-12">
          {/* Melds do Time 1 */}
          <div className="bg-green-700/30 p-3 rounded-lg border border-green-600/30 min-h-[150px]">
            <div className="flex flex-wrap gap-4">
              {store.team_melds[1].map((meld, index) => (
                <div key={index} className="flex flex-col items-center gap-1">
                  {/* Botão de Adicionar à Canastra */}
                  {store.current_player === store.my_player_number &&
                    store.turn_phase === "ACTION" &&
                    selectedCards.length > 0 && (
                      <button
                        onClick={() => {
                          store.add_to_meld(selectedCards, index);
                          setSelectedCards([]);
                        }}
                        className="text-[10px] bg-blue-600 hover:bg-blue-500 px-2 rounded text-white shadow"
                      >
                        Adicionar
                      </button>
                    )}
                  {/* Cartas */}
                  <div className="flex -space-x-6 hover:space-x-1 transition-all duration-300 pt-1 px-2">
                    {organize_meld_visual(meld).map((c) => (
                      <div
                        key={c.id}
                        className={`w-9 h-12 flex items-center justify-center bg-white text-xs font-bold rounded shadow-md border ${
                          c.color === "red"
                            ? "text-red-600 border-red-200"
                            : "text-black border-gray-300"
                        }`}
                      >
                        <div className="flex flex-col items-center leading-none scale-90">
                          <span>{c.value}</span>
                          <span className="text-[8px]">{c.suit.icon}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Melds do Time 2 */}
          <div className="bg-red-900/10 p-3 rounded-lg border border-red-900/20 min-h-[150px]">
            <div className="flex flex-wrap gap-4">
              {store.team_melds[2].map((meld, index) => (
                <div
                  key={index}
                  className="flex -space-x-6 pt-6 px-2 opacity-90"
                >
                  {organize_meld_visual(meld).map((c) => (
                    <div
                      key={c.id}
                      className={`w-9 h-12 flex items-center justify-center bg-gray-100 text-xs font-bold rounded shadow-sm border ${
                        c.color === "red" ? "text-red-600" : "text-black"
                      }`}
                    >
                      <div className="flex flex-col items-center leading-none scale-90">
                        <span>{c.value}</span>
                        <span className="text-[8px]">{c.suit.icon}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Controles e Mão */}
      <div className="fixed bottom-0 left-0 right-0 bg-green-900 p-4 border-t border-green-700 shadow-2xl z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 items-center">
          {/* Deck e Lixo */}
          <div className="flex gap-4 shrink-0">
            <button
              onClick={store.draw_card}
              disabled={
                store.current_player !== store.my_player_number ||
                store.turn_phase !== "DRAW"
              }
              className={`w-24 h-32 rounded-lg border-2 border-white/20 bg-blue-900 flex flex-col items-center justify-center shadow-lg transition-transform ${
                store.current_player === store.my_player_number &&
                store.turn_phase === "DRAW"
                  ? "cursor-pointer hover:-translate-y-2 ring-4 ring-yellow-400 border-white"
                  : "opacity-60 cursor-not-allowed"
              }`}
            >
              <span className="text-3xl">🎴</span>
              <span className="text-xs text-white font-bold mt-2">MONTE</span>
            </button>
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
                    {store.discard_pile[0].suit.icon}
                  </span>
                </div>
              ) : (
                <div className="w-24 h-32 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-white/30 text-xs">Vazio</span>
                </div>
              )}
            </div>
          </div>

          {/* Mão */}
          <div className="flex-1 overflow-x-auto pb-4 px-4 scrollbar-thin scrollbar-thumb-green-600">
            <div className="flex gap-[-2.5rem] min-w-max pt-4 pl-4">
              {my_hand.map((card) => (
                <div
                  key={card.id}
                  onClick={() => toggleSelect(card.id)}
                  className={getCardStyle(card)}
                >
                  <span className="text-xl font-bold">{card.value}</span>
                  <span className="text-2xl">{card.suit.icon}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ações */}
          <div className="flex flex-col gap-2 min-w-50 shrink-0">
            {store.current_player === store.my_player_number &&
              store.turn_phase === "ACTION" && (
                <>
                  <button
                    onClick={() => {
                      store.meld_cards(selectedCards);
                      setSelectedCards([]);
                    }}
                    disabled={selectedCards.length < 3}
                    className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-3 rounded font-bold shadow"
                  >
                    Baixar Jogo
                  </button>
                  <button
                    onClick={() => {
                      if (selectedCards.length === 1) {
                        store.discard_card(selectedCards[0]);
                        setSelectedCards([]);
                      }
                    }}
                    disabled={selectedCards.length !== 1}
                    className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-3 rounded font-bold shadow"
                  >
                    Descartar
                  </button>
                </>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};
