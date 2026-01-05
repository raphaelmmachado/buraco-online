import { useEffect, useState } from "react";
import { useGameStore } from "../../store/useGameStore";

export const HomeScreen = () => {
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const connect = useGameStore((state) => state.connect);
  const initializeSocket = useGameStore((state) => state.initializeSocket);
  const rooms = useGameStore((state) => state.rooms);
  const fetchRooms = useGameStore((state) => state.fetchRooms);

  // Inicializa o socket e busca as salas ao montar o componente
  useEffect(() => {
    initializeSocket();
  }, [initializeSocket]);

  const handleJoin = (mode: "1v1" | "2v2") => {
    if (roomId.trim() === "") {
      alert("Por favor, digite um nome para a sala.");
      return;
    }
    if (userName.trim() === "") {
      alert("Por favor, digite seu nome.");
      return;
    }
    connect(roomId.trim(), mode, userName.trim());
  };

  return (
    <div className="min-h-screen bg-gray-800 flex flex-col items-center justify-center text-white p-4">
      <div className="text-center mb-8">
        <h1 className="text-6xl font-bold text-yellow-400 mb-2">Buraco Online</h1>
        <p className="text-lg text-gray-300">Jogue com seus amigos!</p>
      </div>

      {/* Seção de Criação de Sala */}
      <div className="bg-gray-900 p-8 rounded-xl shadow-2xl w-full max-w-md mb-8">
        <h2 className="text-2xl font-semibold mb-6 text-center">
          Criar ou Entrar em uma Sala
        </h2>
        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Digite seu nome"
          className="w-full px-4 py-3 rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition mb-4"
        />
        <input
          type="text"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="Digite o nome da sala"
          className="w-full px-4 py-3 rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <button
            onClick={() => handleJoin("1v1")}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-lg text-lg font-bold shadow-lg border-b-4 border-blue-800 active:border-0 active:translate-y-1 transition-all"
          >
            👤 Entrar 1 vs 1
          </button>
          <button
            onClick={() => handleJoin("2v2")}
            className="bg-green-600 hover:bg-green-500 text-white px-6 py-4 rounded-lg text-lg font-bold shadow-lg border-b-4 border-green-800 active:border-0 active:translate-y-1 transition-all"
          >
            👥 Entrar 2 vs 2
          </button>
        </div>
      </div>

      {/* Seção de Salas Disponíveis */}
      <div className="bg-gray-900 p-8 rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-center">
            Salas Disponíveis
          </h2>
          <button onClick={fetchRooms} className="text-sm text-yellow-400 hover:underline">Atualizar</button>
        </div>
        <div className="space-y-4 max-h-60 overflow-y-auto">
          {rooms.length === 0 ? (
            <p className="text-gray-500 text-center">Nenhuma sala encontrada.</p>
          ) : (
            rooms.map((room) => (
              <div key={room.roomId} className="bg-gray-700 p-4 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-bold">{room.roomId}</p>
                  <p className="text-xs text-gray-400">{room.mode} ({room.playerCount}/{room.maxPlayers} jogadores)</p>
                </div>
                <button
                  onClick={() => setRoomId(room.roomId)}
                  className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-bold"
                >
                  Entrar
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
