import { useState } from "react";
import { useGameStore } from "../../store/useGameStore";
import Card from "../Card";
import { calculate_score, calculate_meld_score } from "../../../common/utils/scoring";
import { type Card as CardType } from "../../../common/types/card";

// Helper para tag visual do meld (Duplicado de DebugGame por enquanto, idealmente mover para componente compartilhado)
const MeldInfo = ({ meld }: { meld: CardType[] }) => {
  const { score, type } = calculate_meld_score(meld);
  
  let badgeColor = "bg-gray-500";
  let badgeText = "Normal";

  switch(type) {
      case "CLEAN": badgeColor = "bg-green-600"; badgeText = "LIMPA"; break;
      case "DIRTY": badgeColor = "bg-yellow-600"; badgeText = "SUJA"; break;
      case "KING": badgeColor = "bg-blue-600"; badgeText = "500"; break;
      case "ACE": badgeColor = "bg-purple-600"; badgeText = "REAL"; break;
      case "INSUFFICIENT": badgeColor = "bg-red-900/50"; badgeText = "Incompleta"; break;
      case "NORMAL": badgeColor = "bg-gray-600"; badgeText = "Normal"; break;
  }

  return (
      <div className="flex flex-col items-center justify-center min-w-[60px] ml-2 opacity-80">
          <div className={`text-[8px] font-bold px-1 py-0.5 rounded text-white ${badgeColor} uppercase tracking-wider shadow-sm text-center w-full`}>
              {badgeText}
          </div>
          <span className="text-[10px] font-mono text-gray-300 mt-0.5">{score} pts</span>
      </div>
  );
};

export const GameScreen = () => {
  const store = useGameStore();
  const [selectedCards, setSelectedCards] = useState<string[]>([]);

  const my_player_id = store.my_player_number ?? 1;
  const my_team = my_player_id % 2 !== 0 ? 1 : 2;
  const opponent_team = my_team === 1 ? 2 : 1;
  
  const my_hand = store.hands[my_player_id] || [];
  const scoreTeam1 = calculate_score(store.team_melds[1] || []).total_score;
  const scoreTeam2 = calculate_score(store.team_melds[2] || []).total_score;
  
  const isMyTurn = store.current_player === my_player_id;
  const canDraw = isMyTurn && store.turn_phase === "DRAW";
  const canAction = isMyTurn && store.turn_phase === "ACTION";

  // --- Handlers ---

  const toggleSelect = (id: string) => {
    setSelectedCards((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleDeckClick = () => {
    if (canDraw) {
      store.draw_card();
    }
  };

  const handleDiscardClick = () => {
    if (canDraw) {
      if (selectedCards.length >= 2) {
        store.pick_up_discard_new_meld(selectedCards);
        setSelectedCards([]);
      }
    } else if (canAction) {
      if (selectedCards.length === 1) {
        store.discard_card(selectedCards[0]);
        setSelectedCards([]);
      }
    }
  };

  const handleMyMeldClick = (meldIndex: number) => {
    if (canAction && selectedCards.length > 0) {
      store.add_to_meld(selectedCards, meldIndex);
      setSelectedCards([]);
    }
  };

  const handleCreateMeldClick = () => {
    if (canAction && selectedCards.length >= 3) {
      store.meld_cards(selectedCards);
      setSelectedCards([]);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-green-900 text-white overflow-hidden font-sans select-none">
      
      {/* --- TOP BAR: HUD --- */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/40 backdrop-blur shadow-md z-20">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase text-gray-400 tracking-wider">Time 1</span>
          <span className="text-xl font-bold text-white">{scoreTeam1}</span>
        </div>
        
        {/* Game Status Center */}
        <div className="flex flex-col items-center">
            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${isMyTurn ? "bg-yellow-500 text-black animate-pulse" : "bg-gray-700 text-gray-400"}`}>
                {isMyTurn ? "Sua Vez" : `Vez de P${store.current_player}`}
            </div>
            <span className="text-[10px] text-gray-400 mt-1">{store.turn_phase === 'DRAW' ? 'Comprar' : store.turn_phase === 'ACTION' ? 'Jogar' : 'Aguardando'}</span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase text-gray-400 tracking-wider">Time 2</span>
          <span className="text-xl font-bold text-white">{scoreTeam2}</span>
        </div>
      </div>

      {/* --- OPPONENT AREA (Top Section) --- */}
      <div className="h-1/5 bg-green-950/30 p-4 border-b border-white/5 flex flex-col justify-center relative">
        <span className="absolute top-2 left-2 text-[10px] uppercase text-white/20 font-bold">Oponente (Time {opponent_team})</span>
        <div className="flex gap-4 overflow-x-auto scrollbar-hide items-center px-4">
            {store.team_melds[opponent_team].map((meld, idx) => (
                <div key={idx} className="flex items-center">
                    <div className="flex -space-x-12 scale-[0.4] origin-left opacity-80 hover:opacity-100 transition-opacity">
                        {meld.map((card) => (
                            <div key={card.id}>
                                <Card {...card} />
                            </div>
                        ))}
                    </div>
                    <MeldInfo meld={meld} />
                </div>
            ))}
            {store.team_melds[opponent_team].length === 0 && (
                <span className="text-white/20 text-sm italic w-full text-center">Nenhum jogo baixado</span>
            )}
        </div>
      </div>

      {/* --- MIDDLE AREA: TABLE (Deck, Discard, Dead Piles) --- */}
      <div className="flex-1 flex items-center justify-center gap-12 bg-green-800 relative">
         
         {/* Dead Piles (Mortos) */}
         <div className="absolute left-8 flex flex-col gap-2">
            {store.dead_piles.map((pile, idx) => (
                <div key={idx} className="relative scale-50 origin-left">
                     <Card {...pile[0]} hidden />
                     <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xl w-10 h-10 flex items-center justify-center rounded-full border-2 border-white font-bold">{pile.length}</span>
                </div>
            ))}
         </div>

         {/* Deck (Monte) */}
         <div className="flex flex-col items-center gap-2 group scale-75">
            <div className="relative cursor-pointer transition-transform active:scale-95" onClick={handleDeckClick}>
                 {store.deck.length > 0 ? (
                    <>
                        <div className="absolute inset-0 bg-blue-900 rounded-md translate-y-2 translate-x-2 border border-white/20" />
                        <Card {...store.deck[0]} hidden />
                    </>
                 ) : (
                    <div className="w-24 h-44 border-2 border-white/10 border-dashed rounded-md flex items-center justify-center text-white/20 text-xs uppercase">Vazio</div>
                 )}
            </div>
            <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">Monte ({store.deck.length})</span>
         </div>

         {/* Discard Pile (Lixo) */}
         <div className="flex flex-col items-center gap-2 scale-75">
            <div 
                className={`relative w-24 h-44 transition-all ${canDraw || (canAction && selectedCards.length === 1) ? "cursor-pointer hover:scale-105" : ""}`}
                onClick={handleDiscardClick}
            >
                                {store.discard_pile.length > 0 ? (
                                    store.discard_pile.slice(0, 5).reverse().map((card, i) => (
                                        <div key={card.id} className="absolute inset-0" style={{ transform: `translate(${i * 2}px, ${i * 2}px)` }}>
                                             <Card 
                                                {...card} />
                        </div>
                    ))
                ) : (
                    <div className="w-24 h-44 border-2 border-white/10 border-dashed rounded-md flex items-center justify-center text-white/20 text-xs uppercase">
                        Lixo Vazio
                    </div>
                )}
            </div>
            <span className="text-xs font-bold text-red-200 uppercase tracking-wider">Lixo</span>
         </div>

      </div>

      {/* --- BOTTOM AREA: PLAYER (Melds & Hand) --- */}
      <div className="flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/40 to-transparent pb-4 pt-8">
        
        {/* Error Message Toast */}
        {store.last_error && (
             <div className="absolute bottom-48 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded shadow-lg text-sm font-bold z-50 animate-bounce">
                {store.last_error}
                <button onClick={store.clear_error} className="ml-4 opacity-75 hover:opacity-100">✕</button>
             </div>
        )}

        {/* My Melds Area */}
        <div className="px-4 min-h-[120px] mb-4">
             <div className="flex gap-6 overflow-x-auto scrollbar-hide items-end pb-2">
                {/* Create New Meld Zone (Placeholder) */}
                {canAction && selectedCards.length >= 3 && (
                    <div 
                        onClick={handleCreateMeldClick}
                        className="min-w-[100px] h-32 border-2 border-dashed border-yellow-400/50 bg-yellow-400/10 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-yellow-400/20 transition-colors animate-pulse"
                    >
                        <span className="text-2xl">⊕</span>
                        <span className="text-[10px] uppercase font-bold mt-1">Baixar Jogo</span>
                    </div>
                )}

                {/* Existing Melds */}
                {store.team_melds[my_team].map((meld, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                        <div 
                            onClick={() => handleMyMeldClick(idx)}
                            className={`group flex -space-x-12 scale-50 origin-bottom transition-transform ${canAction && selectedCards.length > 0 ? "cursor-pointer hover:scale-110 hover:sepia" : ""}`}
                        >
                             {meld.map((card) => (
                                <div key={card.id}>
                                    <Card {...card} />
                                </div>
                             ))}
                        </div>
                        <div className="mt-2 origin-top">
                           <MeldInfo meld={meld} />
                        </div>
                    </div>
                ))}
             </div>
        </div>

        {/* My Hand */}
        <div className="px-4 relative">
             <div className="flex justify-center -space-x-10 overflow-visible hover:space-x-[-2rem] transition-all duration-300 py-4 scale-75 origin-bottom">
                {my_hand.map((card, i) => (
                    <div 
                        key={card.id} 
                        className={`transform transition-transform duration-200 hover:-translate-y-6 hover:z-20 ${selectedCards.includes(card.id) ? "-translate-y-12 z-10" : ""}`}
                        style={{ zIndex: i }}
                        onClick={() => toggleSelect(card.id)}
                    >
                        <div className={`rounded-md ${selectedCards.includes(card.id) ? "ring-4 ring-yellow-400 shadow-xl" : ""}`}>
                            <Card {...card} />
                        </div>
                    </div>
                ))}
             </div>
        </div>

      </div>
    </div>
  );
};
