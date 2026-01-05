import { useGameStore } from "../../store/useGameStore";

export const LobbyScreen = () => {
  const roomId = useGameStore((state) => state.roomId);
  const my_player_number = useGameStore((state) => state.my_player_number);

  // Note: In a real app, you'd get the number of connected players from the store,
  // which would be updated by the server. We'll simulate this for now.
  const players_connected = my_player_number ? 1 : 0; // Placeholder

  return (
    <div className="min-h-screen bg-gray-800 flex flex-col items-center justify-center text-white p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-yellow-400 mb-2">
          Sala: <span className="text-white">{roomId}</span>
        </h1>
        <p className="text-lg text-gray-300">Aguardando outros jogadores...</p>
      </div>

      <div className="bg-gray-900 p-8 rounded-xl shadow-2xl w-full max-w-md text-center">
        <h2 className="text-2xl font-semibold mb-6">Jogadores Conectados</h2>
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500"></div>
        </div>
        <p className="mt-4 text-gray-400">
          {/* This would be dynamic based on server events */}
          {players_connected > 0 ? `Você é o jogador #${my_player_number}` : "Conectando..."}
        </p>
      </div>
    </div>
  );
};
