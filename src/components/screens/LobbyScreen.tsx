import { useGameStore, type WinCondition } from "../../store/useGameStore";
import { Users, Bot, Loader2, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";

const ConnectionBadge = () => {
    const connectionStatus = useGameStore((state) => state.connectionStatus);
    switch(connectionStatus) {
        case "CONNECTED":
            return (
                <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full animate-fade-in z-50">
                    <Wifi size={14} className="text-green-500" />
                    <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Conectado</span>
                </div>
            );
        case "CONNECTING":
        case "RECONNECTING":
            return (
                <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full animate-fade-in z-50">
                    <Loader2 size={14} className="text-yellow-500 animate-spin" />
                    <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">
                        {connectionStatus === "CONNECTING" ? "Conectando..." : "Reconectando..."}
                    </span>
                </div>
            );
        case "DISCONNECTED":
            return (
                <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full animate-fade-in z-50">
                    <WifiOff size={14} className="text-red-500" />
                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Desconectado</span>
                </div>
            );
        default:
            return null;
    }
};

const TeamList = ({
    teamName,
    players,
    color,
    myPlayerNumber
  }: {
    teamName: string;
    players: { userName: string; isBot?: boolean; playerId?: string; slotId: number }[];
    color: string;
    myPlayerNumber: number | null;
  }) => (
    <div className={`flex-1 bg-black/20 rounded-xl p-4 border border-white/5 flex flex-col gap-2 ${color}`}>
      <h3 className="text-xs font-black uppercase tracking-widest opacity-70 mb-2 border-b border-white/5 pb-2">
        {teamName}
      </h3>
      {players.length > 0 ? (
        players.map((p, idx) => (
          <div key={idx} className="flex items-center justify-between text-sm font-bold group/item">
             <div className="flex items-center gap-2 overflow-hidden">
                {p.isBot ? <Bot size={14} className="opacity-50 shrink-0" /> : <Users size={14} className="opacity-50 shrink-0" />}
                <span className="truncate" title={p.userName}>{p.userName}</span>
                {p.isBot && <span className="text-[9px] bg-white/10 px-1 rounded text-white/40">BOT</span>}
             </div>
             
             {/* KICK BUTTON (Only for Host, never on self) */}
             {myPlayerNumber === 1 && p.slotId !== 1 && (
                 <button 
                    onClick={() => useGameStore.getState().kickPlayer(p.slotId)}
                    className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-red-500/20 rounded text-red-400/50 hover:text-red-400 transition-all"
                    title="Expulsar Jogador"
                 >
                    ✕
                 </button>
             )}
          </div>
        ))
      ) : (
        <span className="text-white/20 text-xs italic">Aguardando...</span>
      )}
    </div>
  );

const GameConfig = ({ onStart }: { onStart: (winCondition?: WinCondition) => void }) => {
    const [type, setType] = useState<"CLASSIC" | "POINTS" | "ROUNDS">("CLASSIC");
    const [value, setValue] = useState<number>(3000);

    const handleStart = () => {
        if (type === "CLASSIC") {
            onStart();
        } else {
            onStart({ type, value });
        }
    }

    return (
        <div className="flex flex-col gap-3 my-2 p-4 bg-black/20 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-1">
                 <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.8)]"></span>
                 <label className="text-[10px] uppercase tracking-widest text-yellow-500/80 font-bold">Configuração da Partida</label>
            </div>
            
            <div className="flex gap-2">
                <button 
                    onClick={() => setType("CLASSIC")}
                    className={`flex-1 py-3 px-1 text-[9px] md:text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all ${type === "CLASSIC" ? "bg-yellow-500 text-black border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]" : "bg-black/40 text-slate-400 border-white/5 hover:bg-white/5 hover:border-white/10"}`}
                >
                    Rápida
                </button>
                <button 
                    onClick={() => { setType("POINTS"); setValue(3000); }}
                    className={`flex-1 py-3 px-1 text-[9px] md:text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all ${type === "POINTS" ? "bg-yellow-500 text-black border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]" : "bg-black/40 text-slate-400 border-white/5 hover:bg-white/5 hover:border-white/10"}`}
                >
                    Pontos
                </button>
                <button 
                    onClick={() => { setType("ROUNDS"); setValue(3); }}
                    className={`flex-1 py-3 px-1 text-[9px] md:text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all ${type === "ROUNDS" ? "bg-yellow-500 text-black border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]" : "bg-black/40 text-slate-400 border-white/5 hover:bg-white/5 hover:border-white/10"}`}
                >
                    Rodadas
                </button>
            </div>

            {type === "POINTS" && (
                <div className="flex items-center gap-3 mt-2 animate-fade-in bg-black/20 p-2 rounded-lg border border-white/5">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider pl-1">Alvo:</span>
                    <input 
                        type="number" 
                        value={value} 
                        onChange={(e) => setValue(Number(e.target.value))}
                        step={500}
                        min={1000}
                        max={10000}
                        className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-1.5 text-sm font-mono text-yellow-400 focus:outline-none focus:border-yellow-500/50 transition-colors text-right"
                    />
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider pr-1">Pts</span>
                </div>
            )}

             {type === "ROUNDS" && (
                <div className="flex items-center gap-3 mt-2 animate-fade-in bg-black/20 p-2 rounded-lg border border-white/5">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider pl-1">Total:</span>
                     <div className="flex gap-2 flex-1">
                        {[2, 3, 5, 10].map(v => (
                            <button
                                key={v}
                                onClick={() => setValue(v)}
                                className={`flex-1 py-1.5 text-xs font-mono font-bold rounded border transition-all ${value === v ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]" : "bg-black/40 text-slate-500 border-white/5 hover:bg-white/5"}`}
                            >
                                {v}
                            </button>
                        ))}
                     </div>
                </div>
            )}
            
            <button
                onClick={handleStart}
                className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-black text-lg shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all hover:scale-[1.02] active:scale-95 animate-pulse uppercase tracking-[0.2em] border border-white/10 mt-4"
              >
                INICIAR PARTIDA
              </button>
        </div>
    )
}

export const LobbyScreen = () => {
  const roomId = useGameStore((state) => state.roomId);
  const players_data = useGameStore((state) => state.players_data);
  const mode = useGameStore((state) => state.mode);
  const my_player_number = useGameStore((state) => state.my_player_number);
  const startGame = useGameStore((state) => state.startGame);
  
  const maxPlayers = mode === "1v1" ? 2 : 4;
  const missingCount = maxPlayers - Object.keys(players_data).length;
  
  // Mapeia para array incluindo o Slot ID (Chave do objeto)
  const allPlayers = Object.entries(players_data).map(([id, data]) => ({
      ...data,
      slotId: Number(id)
  }));

  const team1 = allPlayers.filter((p) => (p.slotId % 2 !== 0)); // 1, 3
  const team2 = allPlayers.filter((p) => (p.slotId % 2 === 0)); // 2, 4

  // Logic for Switch Team Button
  const isTeam1Full = players_data[1] && players_data[3];
  const isTeam2Full = players_data[2] && players_data[4];
  
  const canSwitch = my_player_number !== 1 && mode === "2v2" && (
      (my_player_number === 3 && !isTeam2Full) || // Sou Time 1, quero ir pro 2
      ((my_player_number === 2 || my_player_number === 4) && !isTeam1Full) // Sou Time 2, quero ir pro 1
  );

  return (
    <div className="min-h-screen bg-[#0f2e1a] flex flex-col items-center justify-center text-white p-6 font-sans relative overflow-hidden">
      <ConnectionBadge />
      {/* Background Texture */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "30px 30px" }}></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50 pointer-events-none"></div>

      <div className="text-center mb-8 animate-fade-in relative z-10">
        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-yellow-500 to-orange-600 mb-2 uppercase tracking-tighter drop-shadow-xl">
          Sala: {roomId}
        </h1>
        <div className="flex items-center justify-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full border border-white/5 inline-flex shadow-lg">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
          <p className="text-[10px] md:text-xs text-slate-300 tracking-[0.2em] uppercase font-bold">
            Aguardando Jogadores
          </p>
        </div>
      </div>

      <div className="bg-black/40 backdrop-blur-md p-1 rounded-2xl shadow-2xl w-full max-w-lg border border-white/10 relative z-10 group hover:border-yellow-500/20 transition-colors">
        <div className="bg-slate-900/60 p-6 rounded-xl">
          
          <div className="flex gap-4 mb-6">
            <TeamList teamName="Equipe 1" players={team1} color="border-blue-500/20 bg-blue-900/10 text-blue-200" myPlayerNumber={my_player_number} />
            
            <div className="flex items-center justify-center">
               <span className="text-2xl font-black text-white/10 italic">VS</span>
            </div>

            <TeamList teamName="Equipe 2" players={team2} color="border-red-500/20 bg-red-900/10 text-red-200" myPlayerNumber={my_player_number} />
          </div>

          <div className="flex flex-col gap-3">
             {/* Info Slots */}
             <div className="text-center text-xs text-slate-500 uppercase tracking-wider font-mono mb-2">
                {missingCount > 0 ? `Vagas restantes: ${missingCount}` : "Sala Cheia"}
             </div>

             {/* Actions */}
             <div className="flex gap-3">
               {my_player_number === 1 && missingCount > 0 && (
                  <button
                    onClick={useGameStore.getState().addBot}
                    className="flex-1 bg-purple-600/40 hover:bg-purple-500/50 text-purple-200 border border-purple-500/30 py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Bot size={16} /> Add Bot
                  </button>
               )}
               
               {canSwitch && (
                  <button
                    onClick={useGameStore.getState().switchTeam}
                    className="flex-1 bg-slate-600/40 hover:bg-slate-500/50 text-slate-200 border border-slate-500/30 py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                  >
                    ⇄ Trocar Time
                  </button>
               )}
             </div>

            {my_player_number === 1 && missingCount === 0 ? (
                <GameConfig onStart={startGame} />
            ) : (
                missingCount === 0 && (
                    <div className="w-full bg-slate-700/30 text-slate-400 py-4 rounded-xl font-bold text-xs uppercase tracking-[0.2em] border border-white/5 mt-2 text-center">
                        Aguardando anfitrião iniciar...
                    </div>
                )
            )}

            <div className="mt-4 pt-4 border-t border-white/5 flex justify-center">
              {my_player_number === 1 ? (
                <button
                  onClick={() => useGameStore.getState().closeRoom()}
                  className="text-[10px] font-bold text-red-500/70 hover:text-red-400 uppercase tracking-[0.2em] transition-colors hover:underline decoration-red-500/30 underline-offset-4"
                >
                  Cancelar Sala
                </button>
              ) : (
                <button
                  onClick={() => useGameStore.getState().leaveGame()}
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-300 uppercase tracking-[0.2em] transition-colors hover:underline decoration-slate-500/30 underline-offset-4"
                >
                  Sair da Sala
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
      
      <p className="mt-8 text-slate-500/50 text-[9px] uppercase tracking-[0.5em] font-mono">
        ID: {roomId}
      </p>
    </div>
  );
};