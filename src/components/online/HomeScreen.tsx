import { useEffect, useState } from "react";
import { useGameStore } from "../../store/useGameStore";

export const HomeScreen = () => {
  const [newRoomId, setNewRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  const connect = useGameStore((state) => state.connect);
  const initializeSocket = useGameStore((state) => state.initializeSocket);
  const rooms = useGameStore((state) => state.rooms);
  const fetchRooms = useGameStore((state) => state.fetchRooms);

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
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6 font-sans">
      <div className="text-center mb-12 animate-fade-in">
        <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-600 mb-2">
          BURACO
        </h1>
        <p className="text-xl text-slate-400 tracking-[0.2em] uppercase">Multiplayer Online</p>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* LADO ESQUERDO: PERFIL E CRIAÇÃO */}
        <div className="flex flex-col gap-6">
            <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Nome de Usuário</h2>
                <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    maxLength={8}
                    placeholder="Ex: Player1 (Máx 8 letras)"
                    className="w-full px-4 py-4 rounded-xl bg-slate-900 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all text-lg font-bold placeholder:text-slate-600"
                />
            </div>

            <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 flex-1">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nova Sala</h2>
                    <button 
                        onClick={() => setIsCreating(!isCreating)}
                        className={`text-xs px-3 py-1 rounded-full font-bold transition-colors ${isCreating ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}
                    >
                        {isCreating ? "CANCELAR" : "CRIAR NOVA"}
                    </button>
                </div>

                {isCreating ? (
                    <div className="space-y-4 animate-slide-up">
                        <input
                            type="text"
                            value={newRoomId}
                            onChange={(e) => setNewRoomId(e.target.value)}
                            placeholder="Nome da sala (ex: Amigos)"
                            className="w-full px-4 py-3 rounded-xl bg-slate-900 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handleCreate("1v1")}
                                className="bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold shadow-lg transition-all active:scale-95"
                            >
                                👤 1 vs 1
                            </button>
                            <button
                                onClick={() => handleCreate("2v2")}
                                className="bg-purple-600 hover:bg-purple-500 py-4 rounded-xl font-bold shadow-lg transition-all active:scale-95"
                            >
                                👥 2 vs 2
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-700 rounded-xl p-8 text-center">
                        <p className="text-slate-500 text-sm italic">Clique em "Criar Nova" para abrir uma mesa ou escolha uma ao lado.</p>
                    </div>
                )}
            </div>
        </div>

        {/* LADO DIREITO: LISTA DE SALAS */}
        <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 flex flex-col min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Salas Ativas</h2>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-[10px] text-slate-500 font-mono">{rooms.length} online</span>
                </div>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 scrollbar-thin scrollbar-thumb-slate-600">
                {rooms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 opacity-30">
                        <span className="text-4xl mb-2">📭</span>
                        <p className="text-sm">Nenhuma sala aberta no momento</p>
                    </div>
                ) : (
                    rooms.map((room) => {
                        const isFull = room.playerCount >= room.maxPlayers;
                        return (
                            <div 
                                key={room.roomId} 
                                className={`group bg-slate-900/50 p-4 rounded-xl border transition-all flex justify-between items-center ${isFull ? "border-slate-800 opacity-60" : "border-slate-700 hover:border-yellow-500/50 hover:bg-slate-900"}`}
                            >
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-slate-200">{room.roomId}</p>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">{room.mode}</span>
                                    </div>
                                    <div className="flex items-center gap-1 mt-1">
                                        <div className="flex gap-0.5">
                                            {[...Array(room.maxPlayers)].map((_, i) => (
                                                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < room.playerCount ? "bg-yellow-500" : "bg-slate-700"}`} />
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-slate-500 ml-1">{room.playerCount}/{room.maxPlayers} players</p>
                                    </div>
                                </div>
                                <button
                                    disabled={isFull}
                                    onClick={() => handleJoinExisting(room.roomId, room.mode)}
                                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${isFull ? "bg-slate-800 text-slate-600 cursor-not-allowed" : "bg-yellow-600 hover:bg-yellow-500 text-white shadow-lg active:scale-95"}`}
                                >
                                    {isFull ? "CHEIA" : "ENTRAR"}
                                </button>
                            </div>
                        )
                    })
                )}
            </div>
            
            <button 
                onClick={fetchRooms}
                className="mt-6 w-full py-3 text-xs font-bold text-slate-500 hover:text-yellow-500 transition-colors uppercase tracking-tighter border-t border-slate-700/50 pt-4"
            >
                ↻ Atualizar Lista
            </button>
        </div>

      </div>
    </div>
  );
};
