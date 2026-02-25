import { useGameStore } from "../../store/useGameStore";
import { EventBar } from "../game-ui/EventBar";
import { Bot, Globe, Loader2, Check, Sparkles } from "lucide-react";

interface StartMenuProps {
  onPlayOnline: () => void;
  onPlayLocal: () => void;
  onCheckUpdate: () => void;
  onUpdateApp: () => void;
  isUpdating?: boolean;
  needRefresh?: boolean;
  updateSuccess?: boolean;
}

export const StartMenu = ({
  onPlayOnline,
  onPlayLocal,
  onCheckUpdate,
  onUpdateApp,
  isUpdating,
  needRefresh,
  updateSuccess,
}: StartMenuProps) => {
  const recentEvents = useGameStore((state) => state.recentEvents);
  const connectionStatus = useGameStore((state) => state.connectionStatus);
  const connectSocket = useGameStore((state) => state.connectSocket);

  const isConnected = connectionStatus === "CONNECTED";
  const isConnecting =
    connectionStatus === "CONNECTING" || connectionStatus === "RECONNECTING";

  const handleOnlineClick = () => {
    if (isConnected) {
      onPlayOnline();
    } else if (!isConnecting) {
      connectSocket();
    }
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

        {/* JOGAR OFFLINE */}
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

        {/* JOGAR ONLINE */}
        <button
          onClick={handleOnlineClick}
          disabled={isConnecting}
          className={`group bg-black/40 backdrop-blur-md p-8 rounded-2xl border transition-all flex flex-col items-center gap-4 shadow-2xl relative overflow-hidden ${
            isConnected
              ? "hover:bg-blue-900/20 border-white/10 hover:border-blue-500/50 hover:scale-[1.02] active:scale-95"
              : "border-blue-500/5 opacity-60 hover:opacity-100 active:scale-95 cursor-pointer"
          }`}
        >
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center border transition-all relative ${
              isConnected
                ? "bg-blue-500/10 border-blue-500/20 text-blue-400 group-hover:border-blue-500 group-hover:bg-blue-500 group-hover:text-black shadow-[0_0_20px_rgba(59,130,246,0.1)] group-hover:shadow-[0_0_30px_rgba(59,130,246,0.6)]"
                : "bg-white/5 border-white/10 text-slate-500 grayscale"
            } ${isConnecting ? "animate-pulse" : ""}`}
          >
            {isConnecting ? <Loader2 size={40} className="animate-spin" /> : <Globe size={40} />}
          </div>

          <div className="text-center flex flex-col items-center">
            <h2 className={`text-2xl font-black uppercase mb-1 transition-colors ${
                isConnected ? "text-blue-100" : "text-slate-400 group-hover:text-blue-300"
            }`}>
              Jogar Online
            </h2>
            <p className={`text-[10px] font-mono uppercase tracking-widest transition-colors ${
                isConnected ? "text-blue-300/60" : "text-slate-600"
            }`}>
              {isConnected ? "Com outros jogadores" : isConnecting ? "Buscando Servidor..." : "Toque para conectar"}
            </p>
          </div>
        </button>
      </div>

      {/* FOOTER DE VERSÃO */}
      <div
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 font-mono text-[9px] font-bold tracking-tighter"
      >
        <div 
          onClick={onCheckUpdate}
          className="cursor-pointer opacity-20 hover:opacity-60 transition-opacity active:scale-95 flex items-center gap-1.5"
        >
          {isUpdating ? (
            <Loader2 size={8} className="animate-spin text-blue-400" />
          ) : updateSuccess ? (
            <Check size={8} className="text-green-500" />
          ) : null}
          <span>v{__APP_VERSION__}</span>
          {updateSuccess && <span className="uppercase tracking-widest text-[7px] animate-fade-in">• Atualizado</span>}
        </div>

        {needRefresh && (
          <button
            onClick={onUpdateApp}
            className="flex items-center gap-1.5 bg-blue-500 text-white px-2 py-0.5 rounded-full animate-fade-in hover:bg-blue-400 active:scale-95 transition-all shadow-lg"
          >
            <Sparkles size={8} />
            <span className="uppercase tracking-widest text-[7px]">Nova versão disponível! Reiniciar</span>
          </button>
        )}
      </div>
    </div>
  );
};
