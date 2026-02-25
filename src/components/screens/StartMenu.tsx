import { useGameStore } from "../../store/useGameStore";
import { EventBar } from "../game-ui/EventBar";
import { Bot, Globe, Loader2, Wifi, RefreshCw } from "lucide-react";

interface StartMenuProps {
  onPlayOnline: () => void;
  onPlayLocal: () => void;
  onCheckUpdate: () => void;
  isUpdating?: boolean;
}

export const StartMenu = ({
  onPlayOnline,
  onPlayLocal,
  onCheckUpdate,
  isUpdating,
}: StartMenuProps) => {
  const recentEvents = useGameStore((state) => state.recentEvents);
  const connectionStatus = useGameStore((state) => state.connectionStatus);
  const connectSocket = useGameStore((state) => state.connectSocket);

  const isOnlineDisabled = connectionStatus !== "CONNECTED";
  const isConnecting =
    connectionStatus === "CONNECTING" || connectionStatus === "RECONNECTING";

  const renderStatus = () => {
    switch (connectionStatus) {
      case "CONNECTED":
        return <span className="text-green-500 font-bold">Online</span>;
      case "CONNECTING":
      case "RECONNECTING":
        return <span className="text-yellow-500 font-bold">Aguarde</span>;
      case "DISCONNECTED":
        return <span className="text-red-500 font-bold">Offline</span>;
      default:
        return null;
    }
  };

  const renderSearchButton = () => {
    const commonClasses =
      "mt-4 flex items-center justify-center gap-2 py-2 px-6 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border";

    if (connectionStatus === "CONNECTED") {
      return (
        <button
          disabled
          className={`${commonClasses} bg-green-500/10 border-green-500/20 text-green-400 opacity-50 cursor-not-allowed`}
        >
          <Wifi size={12} />
          <span>Servidores encontrados</span>
        </button>
      );
    }

    if (isConnecting) {
      return (
        <button
          disabled
          className={`${commonClasses} bg-yellow-500/10 border-yellow-500/20 text-yellow-400 cursor-not-allowed`}
        >
          <Loader2 size={12} className="animate-spin" />
          <span>Buscando...</span>
        </button>
      );
    }

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          connectSocket();
        }}
        className={`${commonClasses} bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 text-blue-400 active:scale-95 group/btn`}
      >
        <RefreshCw
          size={12}
          className="group-hover/btn:rotate-180 transition-transform duration-500"
        />
        <span>Buscar Servidor</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#0f2e1a] flex flex-col items-center justify-center text-white p-6 font-sans relative overflow-hidden">
      {/* Event Display */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] w-full max-w-md px-4 flex flex-col gap-2 pointer-events-none">
        {recentEvents.map((event) => (
          <EventBar key={event.id} message={event.message} type={event.type} />
        ))}
      </div>

      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50 pointer-events-none"></div>

      <div className="relative z-10 flex flex-col gap-8 max-w-md w-full animate-fade-in">
        <div className="text-center mb-4">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-yellow-500 to-orange-600 mb-2 uppercase tracking-tighter drop-shadow-xl">
            Buraco Resenha
          </h1>
          <p className="text-slate-400 text-xs uppercase tracking-[0.5em]">
            Fechado, sem trinca e vulnerável.
          </p>
        </div>

        <button
          onClick={onPlayLocal}
          className="group bg-black/40 hover:bg-purple-900/20 backdrop-blur-md p-8 rounded-2xl border border-white/10 hover:border-purple-500/50 transition-all hover:scale-[1.02] active:scale-95 flex flex-col items-center gap-4 shadow-2xl"
        >
          <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center border border-purple-500/20 group-hover:border-purple-500 group-hover:bg-purple-500 group-hover:text-black transition-all text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.1)] group-hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]">
            <Bot size={40} />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-black uppercase text-purple-100 mb-1">
              Jogar Offline
            </h2>
            <p className="text-[10px] text-purple-300/60 font-mono uppercase tracking-widest">
              Contra o Computador
            </p>
          </div>
        </button>

        <div
          className={`group bg-black/40 backdrop-blur-md p-8 rounded-2xl border border-white/10 transition-all flex flex-col items-center gap-4 shadow-2xl ${
            isOnlineDisabled
              ? "border-blue-500/10"
              : "hover:bg-blue-900/20 hover:border-blue-500/50 hover:scale-[1.02] cursor-pointer"
          }`}
          onClick={() => !isOnlineDisabled && onPlayOnline()}
        >
          <div
            className={`w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20 transition-all text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)] ${
              !isOnlineDisabled
                ? "group-hover:border-blue-500 group-hover:bg-blue-500 group-hover:text-black group-hover:shadow-[0_0_30px_rgba(59,130,246,0.6)]"
                : "opacity-50 grayscale"
            }`}
          >
            <Globe size={40} />
          </div>
          <div className="text-center flex flex-col items-center gap-1">
            <h2
              className={`text-2xl font-black uppercase mb-0 transition-colors ${isOnlineDisabled ? "text-slate-500" : "text-blue-100"}`}
            >
              Jogar Online
            </h2>
            <p className="text-[10px] text-blue-300/60 font-mono uppercase tracking-widest mb-1">
              Com outros jogadores
            </p>
            <div className="text-[10px] uppercase tracking-[0.2em] opacity-80">
              Status: {renderStatus()}
            </div>
            {renderSearchButton()}
          </div>
        </div>
      </div>

      <div
        onClick={onCheckUpdate}
        className="fixed bottom-4 left-4 text-[10px] text-white/20 font-mono z-50 cursor-help active:text-white/40 transition-colors pointer-events-auto flex items-center gap-2"
      >
        <span>v{__APP_VERSION__} - Coringas Mágicos!</span>
        {isUpdating && (
          <span className="text-blue-400 animate-pulse font-bold bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
            • Baixando novas versões...
          </span>
        )}
      </div>
    </div>
  );
};
