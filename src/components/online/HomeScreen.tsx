import { useEffect, useState } from "react";
import { useGameStore } from "../../store/useGameStore";

export const HomeScreen = ({ onPlayLocal }: { onPlayLocal?: () => void }) => {
  const [newRoomId, setNewRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [activeTab, setActiveTab] = useState<"ONLINE" | "OFFLINE">("ONLINE");

  const connect = useGameStore((state) => state.connect);
  const initializeSocket = useGameStore((state) => state.initializeSocket);
  const rooms = useGameStore((state) => state.rooms);
  const fetchRooms = useGameStore((state) => state.fetchRooms);
  const rejoinGame = useGameStore((state) => state.rejoinGame);

  // Check for active session on mount
  const [activeSession, setActiveSession] = useState<string | null>(null);
  useEffect(() => {
      const savedRoom = localStorage.getItem("baralho_active_room");
      if (savedRoom) setActiveSession(savedRoom);
  }, []);

  // Inicializa o socket e busca as salas ao montar o componente
  useEffect(() => {
    initializeSocket();
    const interval = setInterval(fetchRooms, 5000); // Atualiza a cada 5s
    return () => clearInterval(interval);
  }, [initializeSocket, fetchRooms]);

  const handleCreate = (mode: "1v1" | "2v2") => {
    if (userName.trim() === "") {
      alert("Por favor, digite seu nome primeiro.");
      return;
    }
    if (newRoomId.trim() === "") {
      alert("Por favor, digite um nome para a nova sala.");
      return;
    }
    connect(newRoomId.trim(), mode, userName.trim());
  };

  const handleJoinExisting = (roomId: string, mode: "1v1" | "2v2") => {
    if (userName.trim() === "") {
      alert("Por favor, digite seu nome antes de entrar.");
      return;
    }
    connect(roomId, mode, userName.trim());
  };

  return (
    <div className="min-h-screen bg-[#0f2e1a] flex flex-col items-center justify-center text-white p-6 font-sans relative overflow-hidden">
      {/* Background Texture */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "30px 30px" }}></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50 pointer-events-none"></div>

      <div className="text-center mb-12 animate-fade-in relative z-10">
        <h1 className="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-yellow-500 to-orange-600 mb-2 drop-shadow-2xl">
          BARALHO
        </h1>
        <div className="flex items-center justify-center gap-3">
          <div className="h-[1px] w-12 bg-white/20"></div>
          <p className="text-sm md:text-lg text-slate-300 tracking-[0.5em] uppercase font-bold text-shadow-sm">
            Multiplayer Online
          </p>
          <div className="h-[1px] w-12 bg-white/20"></div>
        </div>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
        {/* LADO ESQUERDO: PERFIL E CRIAÇÃO */}
        <div className="flex flex-col gap-6">
          
          {/* REJOIN ALERT */}
          {activeSession && (
            <div className="bg-yellow-500/20 border border-yellow-500/50 p-4 rounded-xl flex items-center justify-between animate-pulse shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                <div>
                    <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Sessão Encontrada</p>
                    <p className="text-sm font-bold text-white">Você estava na sala: {activeSession}</p>
                </div>
                <button 
                    onClick={() => rejoinGame()}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                >
                    Voltar
                </button>
            </div>
          )}

          {/* USERNAME PANEL */}
          <div className="bg-black/40 backdrop-blur-md p-1 rounded-2xl shadow-2xl border border-white/10 group hover:border-yellow-500/30 transition-colors">
            <div className="bg-slate-900/50 p-6 rounded-xl">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.5)]"></span>
                Identificação
              </h2>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                maxLength={8}
                placeholder="SEU NICKNAME"
                className="w-full px-4 py-4 rounded-lg bg-black/50 text-white border border-white/10 focus:outline-none focus:border-yellow-500/50 focus:bg-black/70 transition-all text-xl font-black placeholder:text-white/10 font-mono tracking-wider uppercase text-center"
              />
            </div>
          </div>

          {/* ACTIONS PANEL */}
          <div className="bg-black/40 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden min-h-80 group hover:border-blue-500/30 transition-colors">
            {/* TABS */}
            <div className="flex border-b border-white/5">
              <button
                onClick={() => setActiveTab("ONLINE")}
                className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all relative ${
                  activeTab === "ONLINE"
                    ? "text-blue-400 bg-blue-500/10"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                }`}
              >
                {activeTab === "ONLINE" && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>}
                🌐 Criar Sala
              </button>
              <button
                onClick={() => setActiveTab("OFFLINE")}
                className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all relative ${
                  activeTab === "OFFLINE"
                    ? "text-purple-400 bg-purple-500/10"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                }`}
              >
                {activeTab === "OFFLINE" && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]"></div>}
                🤖 Vs Bot
              </button>
            </div>

            <div className="p-6 flex-1 flex flex-col">
              {activeTab === "ONLINE" ? (
                <div className="flex-1 flex flex-col gap-6 animate-fade-in">
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">
                      Nome da Sala
                    </h3>
                    <input
                      type="text"
                      value={newRoomId}
                      onChange={(e) => setNewRoomId(e.target.value)}
                      placeholder="NOME DA SALA..."
                      className="w-full px-4 py-3 rounded-lg bg-black/50 text-white border border-white/10 focus:outline-none focus:border-blue-500/50 transition-all font-mono text-sm uppercase"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-auto">
                    <button
                      onClick={() => handleCreate("1v1")}
                      className="bg-blue-600/80 hover:bg-blue-500 text-white py-4 rounded-xl font-black shadow-lg shadow-blue-900/20 transition-all active:scale-95 border border-white/10 flex flex-col items-center justify-center gap-1 group/btn"
                    >
                      <span className="text-2xl group-hover/btn:scale-110 transition-transform">👤</span>
                      <span className="text-xs uppercase tracking-widest">1 vs 1</span>
                    </button>
                    <button
                      onClick={() => handleCreate("2v2")}
                      className="bg-purple-600/80 hover:bg-purple-500 text-white py-4 rounded-xl font-black shadow-lg shadow-purple-900/20 transition-all active:scale-95 border border-white/10 flex flex-col items-center justify-center gap-1 group/btn"
                    >
                      <span className="text-2xl group-hover/btn:scale-110 transition-transform">👥</span>
                      <span className="text-xs uppercase tracking-widest">2 vs 2</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-fade-in text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                    <span className="text-3xl grayscale opacity-50">🤖</span>
                  </div>
                  <p className="text-slate-400 text-xs uppercase tracking-widest max-w-[200px] leading-relaxed">
                    Treine suas habilidades localmente contra a I.A.
                  </p>
                  {onPlayLocal && (
                    <button
                      onClick={onPlayLocal}
                      className="w-full bg-green-600/80 hover:bg-green-500 text-white py-5 rounded-xl font-black shadow-lg shadow-green-900/20 transition-all active:scale-95 border border-white/10 flex items-center justify-center gap-3 text-sm uppercase tracking-[0.2em] group/start"
                    >
                      <span className="group-hover/start:animate-pulse">▶</span>
                      Iniciar Partida
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* LADO DIREITO: LISTA DE SALAS */}
        <div className="bg-black/40 backdrop-blur-md p-1 rounded-2xl shadow-2xl border border-white/10 flex flex-col min-h-100 hover:border-white/20 transition-colors">
          <div className="bg-slate-900/50 flex-1 rounded-xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="text-lg">📡</span>
                Salas Disponíveis
              </h2>
              <div className="flex items-center gap-2 bg-black/40 px-2 py-1 rounded border border-white/5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.8)]"></span>
                <span className="text-[10px] text-green-400 font-mono font-bold">
                  {rooms.length} ONLINE
                </span>
              </div>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1 pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {rooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-30 gap-4">
                  <div className="w-20 h-20 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <p className="text-xs font-mono uppercase tracking-widest">Nenhum sinal detectado</p>
                </div>
              ) : (
                rooms.map((room) => {
                  const isFull = room.playerCount >= room.maxPlayers;
                  return (
                    <div
                      key={room.roomId}
                      className={`group p-4 rounded-xl border transition-all flex justify-between items-center relative overflow-hidden ${
                        isFull
                          ? "bg-white/5 border-white/5 opacity-60"
                          : "bg-white/5 border-white/10 hover:border-yellow-500/50 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(234,179,8,0.1)]"
                      }`}
                    >
                      <div className="relative z-10">
                        <div className="flex items-center gap-3">
                          <span className={`w-1 h-8 rounded-full ${isFull ? 'bg-red-500/50' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]'}`}></span>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-white text-sm tracking-wide uppercase">
                                {room.roomId}
                              </p>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/40 text-slate-400 font-mono border border-white/5">
                                {room.mode}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mt-1.5">
                              <div className="flex gap-1">
                                {[...Array(room.maxPlayers)].map((_, i) => (
                                  <div
                                    key={i}
                                    className={`w-1 h-3 rounded-sm ${
                                      i < room.playerCount
                                        ? "bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.5)]"
                                        : "bg-white/10"
                                    }`}
                                  />
                                ))}
                              </div>
                              <p className="text-[9px] text-slate-500 ml-2 font-mono uppercase">
                                {room.playerCount}/{room.maxPlayers}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        disabled={isFull}
                        onClick={() => handleJoinExisting(room.roomId, room.mode)}
                        className={`relative z-10 px-5 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all border ${
                          isFull
                            ? "bg-transparent border-white/10 text-white/20 cursor-not-allowed"
                            : "bg-yellow-500/10 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500 hover:text-black shadow-[0_0_10px_rgba(234,179,8,0.2)] active:scale-95"
                        }`}
                      >
                        {isFull ? "FULL" : "JOIN"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={fetchRooms}
              className="mt-6 w-full py-3 text-[10px] font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-[0.2em] border-t border-white/5 pt-4 flex items-center justify-center gap-2 group/refresh"
            >
              <span className="group-hover/refresh:rotate-180 transition-transform duration-500">↻</span> 
              Atualizar Feed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
