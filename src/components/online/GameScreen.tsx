// =============================================================================
// COMPONENTE ONLINE - TELA PRINCIPAL DE JOGO (SOCKET.IO)
// =============================================================================
import { useState } from "react";
import { useGameStore } from "../../store/useGameStore";
import { type Card } from "../../../common/types/card";
import { organize_meld } from "../../../common/utils/sort_cards";
import {
  calculate_score,
  calculate_meld_score,
} from "../../../common/utils/scoring";
// import CardComponent from "../Card";

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

// Na verdade, o usuário quer usar o CardComponent (default export de Card.tsx) DIRETAMENTE
// mas o Card.tsx antigo não aceita onClick/className.
// Vou criar um wrapper simples que imita o visual do DebugGame (que inlineava o HTML).
// O DebugGame usava um HTML inline para renderizar a carta simplificada.
// Vou manter essa consistência para garantir que fique "IGUAL AO DEBUGGAME".

const SimpleCard = ({
  card,
  isSelected,
  onClick,
}: {
  card: Card;
  isSelected: boolean;
  onClick: () => void;
}) => (
  <div
    onClick={onClick}
    className={`relative w-16 h-24 rounded-md border-2 flex flex-col items-center justify-center cursor-pointer transition-all select-none ${
      isSelected
        ? "border-yellow-400 -translate-y-4 shadow-xl z-10"
        : "border-gray-300 hover:-translate-y-1"
    } ${
      card.color === "red" ? "text-red-600 bg-white" : "text-gray-900 bg-white"
    }`}
  >
    <span className="text-xl font-bold">{card.value}</span>
    <span className="text-2xl">{card.suit.icon}</span>
  </div>
);


export const GameScreen = () => {
  const store = useGameStore();
  const [selectedCards, setSelectedCards] = useState<string[]>([]);

  // Deriva dados do jogador atual
  const my_player_id = store.my_player_number ?? 1;
  const my_team = my_player_id % 2 !== 0 ? 1 : 2;
  const opponent_team = my_team === 1 ? 2 : 1;
  const isMyTurn = store.current_player === my_player_id;

  const toggleSelect = (id: string) => {
    setSelectedCards((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

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
            VOCÊ (Time {my_team})
          </span>
          <span className="block text-lg font-bold">
            {calculate_score(store.team_melds[my_team]).total_score} pts
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
                isMyTurn ? "text-yellow-400" : ""
              }`}
            >
              {isMyTurn
                ? "SUA VEZ"
                : `JOGADOR ${store.current_player}`}
            </span>
            <span>{store.turn_phase}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-red-300 font-bold uppercase">
            RIVAL (Time {opponent_team})
          </span>
          <span className="block text-lg font-bold">
            {calculate_score(store.team_melds[opponent_team]).total_score} pts
          </span>
        </div>
      </div>

      {/* Área da Mesa */}
      <div className="px-4">
        {/* Mostra TODOS os melds (Time 1 e Time 2) */}
        {[1, 2].map((teamIdNum) => {
            const teamId = teamIdNum as 1 | 2;
            const melds = store.team_melds[teamId];
            const isMyTeamMeld = teamId === my_team;

            return (
          <div key={teamId} className="mb-4">
            <h2 className={`text-lg font-bold mb-2 ${isMyTeamMeld ? "text-blue-200" : "text-red-200"}`}>
              Jogos Baixados - Time {teamId} {isMyTeamMeld ? "(Seu)" : "(Rival)"}
            </h2>

            <div className={`p-3 rounded-lg min-h-[120px] flex flex-wrap gap-4 items-start ${isMyTeamMeld ? "bg-blue-900/20" : "bg-red-900/20"}`}>
              {melds.map((meld, index) => {
                return (
                  <div key={index} className="flex flex-col items-center gap-1">
                    {/* INFO DO MELD */}
                    <MeldInfo meld={meld} />

                    {/* Botões de Ação no Jogo */}
                    <div className="flex gap-1 h-5">
                      {isMyTurn &&
                        store.turn_phase === "ACTION" &&
                        selectedCards.length > 0 &&
                        isMyTeamMeld && (
                          <button
                            onClick={() => {
                              store.add_to_meld(selectedCards, index);
                              setSelectedCards([]);
                            }}
                            className="text-xs bg-blue-600 hover:bg-blue-500 px-2 py-0.5 rounded text-white shadow"
                          >
                            + Adicionar
                          </button>
                        )}
                      {isMyTurn &&
                        store.turn_phase === "DRAW" &&
                        store.discard_pile.length > 0 &&
                        isMyTeamMeld && (
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
        )})}
      </div>

      {/* Barra Inferior Fixa */}
      <div className="fixed bottom-0 left-0 right-0 bg-green-900 p-4 border-t-2 border-green-700 shadow-2xl z-50">
        <div className="max-w-7xl mx-auto flex gap-6 items-center">
          {/* Ações de Compra */}
          <div className="flex gap-4">
            <button
              onClick={store.draw_card}
              disabled={
                store.turn_phase !== "DRAW" || !isMyTurn
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
                  !isMyTurn ||
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
            <div className="relative flex min-w-max pt-4 pl-4">
              {(store.hands[my_player_id] || []).map((card) => (
                <SimpleCard
                  key={card.id}
                  card={card}
                  isSelected={selectedCards.includes(card.id)}
                  onClick={() => toggleSelect(card.id)}
                />
              ))}
            </div>
          </div>

          {/* Ações de Jogo */}
          <div className="flex flex-col gap-2 w-40">
            {store.turn_phase === "ACTION" && isMyTurn && (
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
            {/* O botão Ordenar é local, mas o store online não tem essa action simples. 
                Poderíamos implementar localmente, mas vou deixar de fora por enquanto 
                ou adicionar dummy action. */}
          </div>
        </div>
      </div>
    </div>
  );
};