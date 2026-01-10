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
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6 font-sans">
      <div className="text-center mb-12 animate-fade-in">
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-600 mb-2 uppercase tracking-tight">
          Sala: {roomId}
        </h1>
        <div className="flex items-center justify-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <p className="text-lg text-slate-400 tracking-widest uppercase">
            Aguardando Jogadores
          </p>
        </div>
      </div>

      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-700">
        <div className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
          <h2 className="text-xl font-bold text-slate-200">
            Jogadores na Mesa
          </h2>
          <span className="bg-slate-900 px-3 py-1 rounded-full text-xs font-mono text-yellow-500">
            {connectedPlayers.length} / {maxPlayers}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-10">
          {connectedPlayers.map((player, idx) => (
            <div
              key={idx}
              className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700 animate-slide-up"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center text-xl font-black text-slate-900">
                {player.userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-slate-100">
                  {player.userName.substring(0, 8)}
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                  Jogador Conectado
                </p>
              </div>
              <div className="ml-auto">
                <span className="text-green-500 text-xs font-bold uppercase">
                  Pronto
                </span>
              </div>
            </div>
          ))}

          {[...Array(missingCount)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700 border-dashed opacity-70"
            >
              <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-xl font-black text-slate-500 italic">
                ?
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-500">Vaga Disponível</p>
                <p className="text-[10px] text-slate-600 uppercase tracking-widest text-xs">
                  Aguardando...
                </p>
              </div>
              {my_player_number === 1 && (
                  <button
                    onClick={useGameStore.getState().addBot}
                    className="text-[10px] font-bold bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-full text-slate-300 transition-colors uppercase tracking-wider"
                  >
                    + Bot
                  </button>
              )}
            </div>
          ))}
        </div>

        <div className="text-center">
          <p className="text-slate-400 text-sm italic mb-6">
            {missingCount > 0
              ? `Faltam ${missingCount} jogador${
                  missingCount > 1 ? "es" : ""
                } para a partida começar.`
              : "Sala cheia! Aguardando o anfitrião iniciar..."}
          </p>

          {/* Botão de Início para o Anfitrião (Player 1) */}
          {my_player_number === 1 && missingCount === 0 && (
            <button
              onClick={() => startGame()}
              className="bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-full font-bold text-xl shadow-lg transition-transform hover:scale-105 animate-pulse mb-4 block mx-auto"
            >
              INICIAR JOGO
            </button>
          )}

          {/* Loading indicator se não for o anfitrião ou se ainda faltar gente */}
          {(my_player_number !== 1 || missingCount > 0) && (
            <div className="flex justify-center mb-6">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce"></div>
              </div>
            </div>
          )}

          {/* Botões de Saída */}
          {my_player_number === 1 ? (
            <button
              onClick={() => useGameStore.getState().closeRoom()}
              className="text-xs font-bold text-red-500 hover:text-red-400 uppercase tracking-widest transition-colors border-b border-transparent hover:border-red-500 pb-0.5"
            >
              Encerrar Sala
            </button>
          ) : (
            <button
              onClick={() => useGameStore.getState().leaveGame()}
              className="text-xs font-bold text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-colors border-b border-transparent hover:border-slate-300 pb-0.5"
            >
              Sair da Sala
            </button>
          )}
        </div>
      </div>

      <p className="mt-8 text-slate-600 text-[10px] uppercase tracking-[0.3em]">
        Dica: Compartilhe o nome da sala para convidar amigos
      </p>
    </div>
  );
};
