import { useGameStore } from "../../store/useGameStore";
import { Loader2, WifiOff } from "lucide-react";

export const ConnectionOverlay = () => {
  const connectionStatus = useGameStore((state) => state.connectionStatus);

  if (connectionStatus === "CONNECTED") return null;

  const isReconnecting = connectionStatus === "RECONNECTING" || connectionStatus === "CONNECTING";

  return (
    <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white animate-fade-in">
      <div className="flex flex-col items-center gap-4 p-8 rounded-3xl border border-white/10 bg-black/60 shadow-2xl">
        {isReconnecting ? (
          <>
            <Loader2 size={48} className="text-yellow-500 animate-spin" />
            <h2 className="text-2xl font-black text-yellow-500 uppercase tracking-widest">
              Reconectando...
            </h2>
            <p className="text-sm text-slate-400">
              Tentando retomar sua partida. Aguarde.
            </p>
          </>
        ) : (
          <>
            <WifiOff size={48} className="text-red-500" />
            <h2 className="text-2xl font-black text-red-500 uppercase tracking-widest">
              Conexão Perdida
            </h2>
            <p className="text-sm text-slate-400">
              Verifique sua internet. O servidor tentará reconectar.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
