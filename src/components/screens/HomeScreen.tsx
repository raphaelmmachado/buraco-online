import { useEffect, useState } from "react";
import { useGameStore } from "../../store/useGameStore";
import {
  Loader2,
  Wifi,
  WifiOff,
  User,
  Users,
  Play,
  RefreshCw,
} from "lucide-react";
import { StyledButton } from "../ui/StyledButton";

const ConnectionBadge = () => {
  const connectionStatus = useGameStore((state) => state.connectionStatus);

  switch (connectionStatus) {
    case "CONNECTED":
      return (
        <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full animate-fade-in z-50">
          <Wifi size={14} className="text-green-500" />
          <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">
            Conectado
          </span>
        </div>
      );
    case "CONNECTING":
    case "RECONNECTING":
      return (
        <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full animate-fade-in z-50">
          <Loader2 size={14} className="text-yellow-500 animate-spin" />
          <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">
            {connectionStatus === "CONNECTING"
              ? "Ligando servidor..."
              : "Reconectando..."}
          </span>
        </div>
      );
    case "DISCONNECTED":
      return (
        <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full animate-fade-in z-50">
          <WifiOff size={14} className="text-red-500" />
          <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">
            Desconectado
          </span>
        </div>
      );
    default:
      return null;
  }
};

export const HomeScreen = ({ onPlayLocal }: { onPlayLocal?: () => void }) => {
  const [newRoomId, setNewRoomId] = useState("");
  const [activeTab, setActiveTab] = useState<"ONLINE" | "OFFLINE">("ONLINE");

  const connect = useGameStore((state) => state.connect);
  const initializeSocket = useGameStore((state) => state.initializeSocket);
  const rooms = useGameStore((state) => state.rooms);
  const fetchRooms = useGameStore((state) => state.fetchRooms);
  const rejoinGame = useGameStore((state) => state.rejoinGame);
  const totalOnline = useGameStore((state) => state.totalOnline);
  const onlineNames = useGameStore((state) => state.onlineNames);
  const connectionStatus = useGameStore((state) => state.connectionStatus);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check for active session on mount
  const [activeSession] = useState<string | null>(() =>
    localStorage.getItem("baralho_active_room"),
  );

  const [userName, setUserName] = useState(
    () => localStorage.getItem("baralho_user_name") || "",
  );

  const handleUserNameChange = (val: string) => {
    const cleaned = val.toUpperCase();
    setUserName(cleaned);
    if (cleaned) {
      localStorage.setItem("baralho_user_name", cleaned);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchRooms();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // VALIDATE ACTIVE SESSION
  useEffect(() => {
    if (rooms.length > 0 && activeSession) {
      const roomExists = rooms.some((r) => r.roomId === activeSession);
      if (!roomExists) {
        localStorage.removeItem("baralho_active_room");
      }
    }
  }, [rooms, activeSession]);

  // Inicializa o socket e busca as salas ao montar o componente
  useEffect(() => {
    initializeSocket();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, [initializeSocket, fetchRooms]);

  const handleCreate = (mode: "1v1" | "2v2") => {
    if (connectionStatus !== "CONNECTED") {
      return; // Prevent action if disconnected
    }
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
    if (connectionStatus !== "CONNECTED") return;

    if (userName.trim() === "") {
      alert("Por favor, digite seu nome antes de entrar.");
      return;
    }
    connect(roomId, mode, userName.trim());
  };

  return (
    <div className="min-h-screen bg-[#0f2e1a] flex flex-col items-center justify-center text-white p-6 font-sans relative overflow-hidden">
      {/* Connection Status Indicator */}
      <ConnectionBadge />

      {/* Background Texture */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50 pointer-events-none"></div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
        {/* LADO ESQUERDO: PERFIL E CRIAÇÃO */}
        <div className="flex flex-col gap-6">
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
                onChange={(e) => {
                  handleUserNameChange(e.target.value);
                }}
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
                {activeTab === "ONLINE" && (
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                )}
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
                {activeTab === "OFFLINE" && (
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]"></div>
                )}
                🤖 OFFLINE Vs Bot
              </button>
            </div>

            <div className="p-6 flex-1 flex flex-col">
              {activeTab === "ONLINE" ? (
                <div
                  className={`flex-1 flex flex-col gap-6 animate-fade-in ${
                    connectionStatus !== "CONNECTED"
                      ? "opacity-50 pointer-events-none grayscale"
                      : ""
                  }`}
                >
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
                    <StyledButton
                      onClick={() => handleCreate("1v1")}
                      variant="secondary"
                      size="lg"
                      icon={<User size={20} />}
                      className="bg-blue-600/80 hover:bg-blue-500 shadow-blue-900/20"
                    >
                      1 vs 1
                    </StyledButton>
                    <StyledButton
                      onClick={() => handleCreate("2v2")}
                      variant="secondary"
                      size="lg"
                      icon={<Users size={20} />}
                      className="bg-purple-600/80 hover:bg-purple-500 shadow-purple-900/20"
                    >
                      2 vs 2
                    </StyledButton>
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
                    <StyledButton
                      onClick={onPlayLocal}
                      variant="primary"
                      size="lg"
                      fullWidth
                      icon={<Play size={20} />}
                      className="bg-green-600/80 hover:bg-green-500 shadow-green-900/20"
                    >
                      Iniciar Partida
                    </StyledButton>
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
              <div className="flex flex-col gap-1">
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="text-lg">📡</span>
                  Salas Disponíveis
                </h2>
                {totalOnline > 0 && (
                  <p className="text-[10px] text-slate-500 font-medium">
                    <span className="text-yellow-500/80">
                      {onlineNames.slice(0, 3).join(", ")}
                    </span>
                    {totalOnline > 3
                      ? ` e mais ${totalOnline - 3}`
                      : totalOnline === 1
                        ? ""
                        : ""}
                    {totalOnline > 1 ? " estão " : " está "} online
                  </p>
                )}
              </div>
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
                  {connectionStatus === "CONNECTED" ? (
                    <>
                      <div className="w-20 h-20 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center">
                        <span className="text-2xl">⚡</span>
                      </div>
                      <p className="text-xs font-mono uppercase tracking-widest">
                        Nenhum sinal detectado
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 flex items-center justify-center">
                        <Loader2
                          className="animate-spin text-white/20"
                          size={40}
                        />
                      </div>
                      <p className="text-xs font-mono uppercase tracking-widest">
                        Procurando Servidor...
                      </p>
                    </>
                  )}
                </div>
              ) : (
                rooms.map((room) => {
                  const isFull = room.playerCount >= room.maxPlayers;
                  const isPlaying = room.status !== "LOBBY";
                  const canJoin =
                    !isFull && !isPlaying && connectionStatus === "CONNECTED";

                  return (
                    <div
                      key={room.roomId}
                      className={`group p-4 rounded-xl border transition-all flex justify-between items-center relative overflow-hidden ${
                        !canJoin
                          ? "bg-white/5 border-white/5 opacity-60"
                          : "bg-white/5 border-white/10 hover:border-yellow-500/50 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(234,179,8,0.1)]"
                      }`}
                    >
                      <div className="relative z-10">
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-1 h-8 rounded-full ${
                              isPlaying
                                ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                                : isFull
                                  ? "bg-red-500/50"
                                  : "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"
                            }`}
                          ></span>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-white text-sm tracking-wide uppercase">
                                {room.roomId}
                              </p>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/40 text-slate-400 font-mono border border-white/5">
                                {room.mode}
                              </span>
                              {isPlaying && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-200 font-black border border-blue-500/30 uppercase tracking-wider animate-pulse">
                                  EM JOGO
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-1.5">
                              <div className="flex gap-1">
                                {[...Array(room.maxPlayers)].map((_, i) => (
                                  <div
                                    key={i}
                                    className={`w-1 h-3 rounded-sm ${
                                      i < room.playerCount
                                        ? isPlaying
                                          ? "bg-blue-500"
                                          : "bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.5)]"
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

                      <div className="relative z-10">
                        {activeSession === room.roomId ? (
                          <button
                            onClick={() => rejoinGame()}
                            className="bg-green-500 hover:bg-green-400 text-black px-5 py-2 rounded text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(34,197,94,0.4)] active:scale-95 transition-all animate-pulse"
                          >
                            Voltar
                          </button>
                        ) : (
                          <button
                            disabled={!canJoin}
                            onClick={() =>
                              handleJoinExisting(room.roomId, room.mode)
                            }
                            className={`px-5 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all border ${
                              !canJoin
                                ? "bg-transparent border-white/10 text-white/20 cursor-not-allowed"
                                : "bg-yellow-500/10 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500 hover:text-black shadow-[0_0_10px_rgba(234,179,8,0.2)] active:scale-95"
                            }`}
                          >
                            {isPlaying ? "EM JOGO" : isFull ? "FULL" : "JOIN"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <StyledButton
              onClick={handleRefresh}
              variant="ghost"
              fullWidth
              icon={
                <RefreshCw
                  size={14}
                  className={`${isRefreshing ? "animate-spin" : ""}`}
                />
              }
              className="mt-6 border-t border-white/5 pt-4 text-[10px] text-slate-500 hover:text-white justify-center"
            >
              {isRefreshing ? "Buscando salas..." : "Atualizar Feed"}
            </StyledButton>
          </div>
        </div>
      </div>
    </div>
  );
};
