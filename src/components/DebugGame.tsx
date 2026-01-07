// =============================================================================
// COMPONENTE DE DEBUG - TELA PRINCIPAL DE TESTES LOCAIS
// =============================================================================
import { useState } from "react";
import { useGameStore } from "../store/useGameStoreBots";
import { useGameBots } from "../hooks/useGameBots";
import { type Card } from "../../common/types/card";
import { organize_meld } from "../../common/utils/sort_cards";
import {
  calculate_score,
  calculate_meld_score,
} from "../../common/utils/scoring";
import CardComponent from "./Card";

// --- Componente para exibir uma única carta (Helper) ---
// const CardComponent = ({
//   card,
//   isSelected,
//   onClick,
// }: {
//   card: Card;
//   isSelected: boolean;
//   onClick: () => void;
// }) => (
//   <div
//     onClick={onClick}
//     className={`relative w-16 h-24 rounded-md border-2 flex flex-col items-center justify-center cursor-pointer transition-all select-none ${
//       isSelected
//         ? "border-yellow-400 -translate-y-4 shadow-xl z-10"
//         : "border-gray-300 hover:-translate-y-1"
//     } ${
//       card.color === "red" ? "text-red-600 bg-white" : "text-gray-900 bg-white"
//     }`}
//   >
//     <span className="text-xl font-bold">{card.value}</span>
//     <span className="text-2xl">{card.suit.icon}</span>
//   </div>
// );

// Helper para tag visual do meld

const MeldInfo = ({ meld }: { meld: Card[] }) => {
  const { score, type } = calculate_meld_score(meld);

  let badgeColor = "bg-gray-500";

  let badgeText = "Normal";

  switch (type) {
    case "CLEAN":
      badgeColor = "bg-green-600";
      badgeText = "LIMPA";
      break;

    case "DIRTY":
      badgeColor = "bg-yellow-600";
      badgeText = "SUJA";
      break;

    case "KING":
      badgeColor = "bg-blue-600";
      badgeText = "EXCELENTE";
      break;

    case "ACE":
      badgeColor = "bg-purple-600";
      badgeText = "PERFEITA";
      break;

    case "INSUFFICIENT":
      badgeColor = "bg-gray-600";
      badgeText = "Insuficiente";
      break;
  }

  return (
    <div className="flex flex-col items-center mb-1 w-full">
      <div
        className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${badgeColor} uppercase tracking-wider shadow-sm w-full text-center`}
      >
        {badgeText}
      </div>

      <span className="text-xs font-mono text-gray-300 mt-0.5">
        {score} pts
      </span>
    </div>
  );
};

export const DebugGame = () => {
  // --- Hooks e Estado Local ---
  const store = useGameStore();
  useGameBots(); // Ativa a lógica dos bots para o jogo local
  const [selectedCards, setSelectedCards] = useState<string[]>([]);

  // --- Funções Auxiliares ---
  const toggleSelect = (id: string) => {
    setSelectedCards((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  // ... (RESTO DO CÓDIGO IGUAL ATÉ O MAP DOS MELDS)

  // TELA DE LOBBY
  if (store.status === "LOBBY") {
    return (
      <div className="min-h-screen bg-green-800 flex flex-col gap-8 items-center justify-center text-white">
        <h1 className="text-3xl font-bold">Buraco - Debug Local</h1>
        <button
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-6 rounded-xl text-xl font-bold shadow-xl"
          onClick={() => store.start_game("1v1")}
        >
          👤 1v1 (vs Bot)
        </button>
        <button
          className="bg-green-600 hover:bg-green-500 text-white px-8 py-6 rounded-xl text-xl font-bold shadow-xl"
          onClick={() => store.start_game("2v2")}
        >
          👥 2v2 (Bots)
        </button>
      </div>
    );
  }

  // TELA DE FIM DE JOGO
  if (store.status === "FINISHED" && store.final_score) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-10">
        <h1 className="text-5xl font-bold mb-8 text-yellow-500">
          🏆 FIM DE JOGO
        </h1>
        <div className="flex gap-16 text-center">
          <div>
            <h2 className="text-2xl text-blue-300">Time 1</h2>
            <p className="text-4xl font-bold">
              {store.final_score.team_1.total_score} pts
            </p>
          </div>
          <div>
            <h2 className="text-2xl text-red-300">Time 2</h2>
            <p className="text-4xl font-bold">
              {store.final_score.team_2.total_score} pts
            </p>
          </div>
        </div>
        <button
          onClick={() => store.start_game(store.mode)}
          className="bg-green-600 hover:bg-green-500 text-white px-8 py-4 mt-8 rounded-full font-bold text-xl"
        >
          Jogar Novamente
        </button>
      </div>
    );
  }

  // --- TELA PRINCIPAL DO JOGO ---
  return (
    <div className="min-h-screen bg-green-800 font-sans text-white pb-64">
      {/* Barra de Erro */}
      {store.last_error && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-red-600 text-white p-3 rounded-lg shadow-lg text-center flex items-center justify-between z-50">
          <span>⚠️ {store.last_error}</span>
          <button
            onClick={store.clear_error}
            className="ml-4 px-2 py-1 bg-red-800 rounded text-xs"
          >
            OK
          </button>
        </div>
      )}
      {/* HUD Superior */}
      <div className="sticky top-0 bg-black/30 backdrop-blur-sm border-b border-white/10 px-4 py-2 mb-6 flex items-center justify-between text-xs shadow-md z-40">
        <div>
          <span className="text-blue-300 font-bold uppercase">
            VOCÊ (Time 1)
          </span>
          <span className="block text-lg font-bold">
            {calculate_score(store.team_melds[1]).total_score} pts
          </span>
        </div>
        <div className="flex gap-6 items-center">
          <div>
            <span className="font-bold text-gray-300 uppercase">Mortos</span>
            <span className="block text-lg font-bold">
              {store.dead_piles.length}
            </span>
          </div>
          <div>
            <span className="font-bold text-gray-300 uppercase">Monte</span>
            <span className="block text-lg font-bold">{store.deck.length}</span>
          </div>
          <div className="border-l border-white/20 pl-4">
            <span className="font-bold text-gray-300 uppercase">Turno</span>
            <span
              className={`block font-bold text-lg ${
                store.current_player === 1 ? "text-yellow-400" : ""
              }`}
            >
              {store.current_player === 1
                ? "SUA VEZ"
                : `BOT ${store.current_player}`}
            </span>
            <span>{store.turn_phase}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-red-300 font-bold uppercase">
            RIVAL (Time 2)
          </span>
          <span className="block text-lg font-bold">
            {calculate_score(store.team_melds[2]).total_score} pts
          </span>
        </div>
      </div>
      {/* Área da Mesa */}
      <div className="px-4">
        {Object.entries(store.team_melds).map(([teamId, melds]) => (
          <div key={teamId} className="mb-4">
            <h2 className="text-lg font-bold mb-2">
              Jogos Baixados - Time {teamId}
            </h2>

            <div className="bg-black/20 p-3 rounded-lg min-h-[120px] flex flex-wrap gap-4 items-start">
              {melds.map((meld, index) => {
                return (
                  <div key={index} className="flex flex-col items-center gap-1">
                    {/* INFO DO MELD (NOVO) */}
                    <MeldInfo meld={meld} />

                    {/* Botões de Ação no Jogo */}
                    <div className="flex gap-1 h-5">
                      {" "}
                      {/* Adicionado h-5 para manter o layout estável */}
                      {store.current_player === 1 &&
                        store.turn_phase === "ACTION" &&
                        selectedCards.length > 0 &&
                        Number(teamId) === 1 && (
                          <button
                            onClick={() => {
                              store.add_card_to_meld(selectedCards, index);
                              setSelectedCards([]);
                            }}
                            className="text-xs bg-blue-600 hover:bg-blue-500 px-2 py-0.5 rounded text-white shadow"
                          >
                            + Adicionar
                          </button>
                        )}
                      {store.current_player === 1 &&
                        store.turn_phase === "DRAW" &&
                        store.discard_pile.length > 0 &&
                        Number(teamId) === 1 && (
                          <button
                            onClick={() => {
                              store.pick_up_discard_add_to_meld(
                                index,
                                selectedCards
                              );
                              setSelectedCards([]);
                            }}
                            className="text-xs bg-orange-600 hover:bg-orange-500 px-2 py-0.5 rounded text-white shadow"
                          >
                            + Lixo
                          </button>
                        )}
                    </div>

                    {/* Cartas do Jogo */}
                    <div className="flex -space-x-7 transition-all ">
                      {organize_meld(meld).map((c) => (
                        <div
                          key={c.id}
                          className={`relative w-12 h-16 bg-white rounded shadow
                           ${
                             c.color === "red" ? "text-red-600" : "text-black"
                           } tracking-tighter leading-none text-xs border-2 border-gray-300`}
                        >
                          <span className="absolute left-0 flex flex-col items-center justify-center ">
                            <p className="font-bold text-base">{c.value}</p>
                            <p className="text-lg">{c.suit.icon}</p>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Barra Inferior Fixa */}
      <div className="fixed bottom-0 left-0 right-0 bg-green-900 p-4 border-t-2 border-green-700 shadow-2xl z-50">
        <div className="max-w-7xl mx-auto flex gap-6 items-center">
          {/* Ações de Compra */}
          <div className="flex gap-4">
            <button
              onClick={store.draw_card_from_deck}
              disabled={
                store.turn_phase !== "DRAW" || store.current_player !== 1
              }
              className="w-24 h-32 rounded-lg bg-blue-900 flex flex-col items-center justify-center disabled:opacity-50 hover:enabled:-translate-y-2 transition-transform"
            >
              <span className="text-3xl">🎂</span>
              <span className="text-xs font-bold mt-2">COMPRAR</span>
            </button>
            <div className="flex flex-col items-center">
              {store.discard_pile.length > 0 ? (
                <div
                  className={`w-24 h-32 bg-white rounded-lg flex flex-col items-center justify-center ${
                    store.discard_pile[0].color === "red"
                      ? "text-red-600"
                      : "text-black"
                  } shadow-lg`}
                >
                  <span className="text-4xl font-bold">
                    {store.discard_pile[0].value}
                  </span>
                  <span className="text-2xl">
                    {store.discard_pile[0].suit.icon}
                  </span>
                </div>
              ) : (
                <div className="w-24 h-32 rounded-lg bg-black/20 flex items-center justify-center">
                  Lixo Vazio
                </div>
              )}
              <button
                onClick={() => {
                  store.pick_up_discard_new_meld(selectedCards);
                  setSelectedCards([]);
                }}
                disabled={
                  store.turn_phase !== "DRAW" ||
                  store.current_player !== 1 ||
                  selectedCards.length < 2
                }
                className="mt-1 text-xs bg-orange-500 rounded px-2 py-0.5 disabled:opacity-50"
              >
                Pegar Lixo
              </button>
            </div>
          </div>

          {/* Mão do Jogador */}
          <div className="flex-1 overflow-x-auto pb-2">
            <div className="relative flex min-w-max pt-4">
              {(store.hands[1] || []).map((card) => (
                <CardComponent
                  key={card.id}
                  {...card}
                  isSelected={selectedCards.includes(card.id)}
                  onClick={() => toggleSelect(card.id)}
                />
              ))}
            </div>
          </div>

          {/* Ações de Jogo */}
          <div className="flex flex-col gap-2 w-40">
            {store.turn_phase === "ACTION" && store.current_player === 1 && (
              <>
                <button
                  onClick={() => {
                    store.meld_cards(selectedCards);
                    setSelectedCards([]);
                  }}
                  disabled={selectedCards.length < 3}
                  className="bg-green-600 p-3 rounded font-bold shadow disabled:opacity-50"
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
                  className="bg-red-600 p-3 rounded font-bold shadow disabled:opacity-50"
                >
                  Descartar
                </button>
              </>
            )}
            <button
              onClick={store.sort_my_hand}
              className="text-xs text-green-300 underline hover:text-white mt-2"
            >
              Ordenar Mão
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
