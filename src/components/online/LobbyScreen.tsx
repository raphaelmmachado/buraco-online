import { useGameStore } from "../../store/useGameStore";

export const LobbyScreen = () => {
  const roomId = useGameStore((state) => state.roomId);
  const players_data = useGameStore((state) => state.players_data);
  const mode = useGameStore((state) => state.mode);
  const my_player_number = useGameStore((state) => state.my_player_number);
  const startGame = useGameStore((state) => state.startGame);

  const maxPlayers = mode === "1v1" ? 2 : 4;
  const connectedPlayers = Object.values(players_data);
  const missingCount = maxPlayers - connectedPlayers.length;

  return (
    <div className="min-h-screen bg-[#0f2e1a] flex flex-col items-center justify-center text-white p-6 font-sans relative overflow-hidden">
      {/* Background Texture */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "30px 30px" }}></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50 pointer-events-none"></div>

      <div className="text-center mb-12 animate-fade-in relative z-10">
        <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-yellow-500 to-orange-600 mb-4 uppercase tracking-tighter drop-shadow-xl">
          Sala: {roomId}
        </h1>
        <div className="flex items-center justify-center gap-3 bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full border border-white/5 inline-flex shadow-lg">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
          <p className="text-xs md:text-sm text-slate-300 tracking-[0.2em] uppercase font-bold">
            Lobby de Espera
          </p>
        </div>
      </div>

      <div className="bg-black/40 backdrop-blur-md p-1 rounded-2xl shadow-2xl w-full max-w-2xl border border-white/10 relative z-10 group hover:border-yellow-500/20 transition-colors">
        <div className="bg-slate-900/60 p-8 rounded-xl">
          <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="text-xl">👥</span>
              Jogadores
            </h2>
            <div className="bg-black/40 px-4 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
              <span className="text-yellow-500 text-xs font-mono font-bold">
                {connectedPlayers.length}
              </span>
              <span className="text-slate-600 text-[10px] font-mono">/</span>
              <span className="text-slate-500 text-xs font-mono font-bold">
                {maxPlayers}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 mb-10">
            {connectedPlayers.map((player, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5 animate-slide-up group/player hover:bg-white/10 hover:border-white/10 transition-all relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center text-xl font-black text-black shadow-lg">
                  {player.userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-white text-lg uppercase tracking-wide">
                    {player.userName.substring(0, 8)}
                  </p>
                  <p className="text-[9px] text-green-400 uppercase tracking-widest font-mono">
                    ● Conectado
                  </p>
                </div>
                {player.isBot && (
                   <span className="ml-2 text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 uppercase font-bold tracking-wider">
                     BOT AI
                   </span>
                )}
                <div className="ml-auto">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest group-hover/player:text-white transition-colors">
                    Pronto
                  </span>
                </div>
              </div>
            ))}

            {[...Array(missingCount)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 bg-black/20 p-4 rounded-xl border border-dashed border-white/10 opacity-60"
              >
                <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-xl font-black text-white/20">
                  ?
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-500 uppercase text-sm tracking-wide">Vaga Aberta</p>
                  <p className="text-[9px] text-slate-600 uppercase tracking-widest font-mono">
                    Aguardando...
                  </p>
                </div>
                {my_player_number === 1 && (
                    <button
                      onClick={useGameStore.getState().addBot}
                      className="text-[9px] font-black bg-white/5 hover:bg-purple-600 hover:text-white px-4 py-2 rounded-lg text-slate-400 transition-all uppercase tracking-widest border border-white/5 hover:border-purple-500/50 hover:shadow-[0_0_10px_rgba(147,51,234,0.4)] active:scale-95"
                    >
                      + Adicionar Bot
                    </button>
                )}
              </div>
            ))}
          </div>

          <div className="text-center pt-4 border-t border-white/5">
            <p className="text-slate-500 text-xs uppercase tracking-widest mb-8 font-mono">
              {missingCount > 0
                ? `Aguardando ${missingCount} jogador${missingCount > 1 ? "es" : ""}...`
                : "Sistema pronto. Iniciando sequência..."}
            </p>

            {/* Botão de Início para o Anfitrião (Player 1) */}
            {my_player_number === 1 && missingCount === 0 && (
              <button
                onClick={() => startGame()}
                className="w-full bg-green-600 hover:bg-green-500 text-white py-5 rounded-xl font-black text-xl shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all hover:scale-[1.02] active:scale-95 animate-pulse mb-6 uppercase tracking-[0.2em] border border-white/10"
              >
                INICIAR PARTIDA
              </button>
            )}

            {/* Loading indicator */}
            {(my_player_number !== 1 || missingCount > 0) && (
              <div className="flex justify-center mb-8">
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-sm animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-yellow-500 rounded-sm animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-yellow-500 rounded-sm animate-bounce"></div>
                </div>
              </div>
            )}

            {/* Botões de Saída */}
            {my_player_number === 1 ? (
              <button
                onClick={() => useGameStore.getState().closeRoom()}
                className="text-[10px] font-bold text-red-500/70 hover:text-red-400 uppercase tracking-[0.3em] transition-colors hover:underline decoration-red-500/30 underline-offset-4"
              >
                Encerrar Sessão
              </button>
            ) : (
              <button
                onClick={() => useGameStore.getState().leaveGame()}
                className="text-[10px] font-bold text-slate-500 hover:text-slate-300 uppercase tracking-[0.3em] transition-colors hover:underline decoration-slate-500/30 underline-offset-4"
              >
                Desconectar
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="mt-8 text-slate-500/50 text-[9px] uppercase tracking-[0.5em] font-mono">
        ID DO SERVIDOR: {roomId} // STATUS: ONLINE
      </p>
    </div>
  );
};
