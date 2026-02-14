import "./style.css";
import { OnlineGame } from "./components/screens/OnlineGame";
import { LocalGame } from "./components/LocalGame";
import { StartMenu } from "./components/screens/StartMenu";
import { useState } from "react";
import { usePWA } from "./hooks/usePWA";

// The new router structure: 3 distinct states
type VIEW_MODE = "HOME" | "ONLINE" | "LOCAL";

function App() {
  const { checkForUpdate, needRefresh, updateServiceWorker } = usePWA();
  const [isChecking, setIsChecking] = useState(false);
  const [view, setView] = useState<VIEW_MODE>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("room")) return "ONLINE";
    return "HOME";
  });

  const handlePlayOnline = async () => {
    // Tenta atualizar antes de entrar no modo online
    setIsChecking(true);
    const hasUpdate = await checkForUpdate();
    if (hasUpdate) {
      // Se detectou atualização, força o reload agora para garantir a última versão
      await updateServiceWorker();
    } else {
      setIsChecking(false);
      setView("ONLINE");
    }
  };

  const handleCheckUpdate = async () => {
    setIsChecking(true);
    const hasUpdate = await checkForUpdate();
    if (!hasUpdate) {
      setIsChecking(false);
    }
    // Se hasUpdate for true, o PWA hook disparará needRefresh eventualmente
  };

  return (
    <main className="">
      {/* Notificação de Nova Versão */}
      {needRefresh && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] bg-blue-600/90 backdrop-blur-md text-white px-6 py-4 rounded-3xl shadow-[0_0_50px_rgba(59,130,246,0.5)] border border-blue-400/50 flex flex-col items-center gap-3 animate-fade-in-up w-[90vw] max-w-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-200 rounded-full animate-ping" />
            <span className="text-xs font-black uppercase tracking-[0.2em]">Atualização Disponível!</span>
          </div>
          <p className="text-[10px] text-blue-100/80 text-center leading-relaxed">
            Uma nova versão do Buraco Resenha está pronta para você.
          </p>
          <button 
            onClick={() => updateServiceWorker()}
            className="w-full bg-white text-blue-600 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 active:scale-95 transition-all shadow-lg"
          >
            Baixar e Recarregar Agora
          </button>
        </div>
      )}

      {view === "HOME" && (
        <StartMenu
          onPlayOnline={handlePlayOnline}
          onPlayLocal={() => setView("LOCAL")}
          onCheckUpdate={handleCheckUpdate}
          isUpdating={isChecking || needRefresh}
        />
      )}

      {view === "ONLINE" && (
        <OnlineGame onBack={() => setView("HOME")} />
      )}

      {view === "LOCAL" && (
        <LocalGame onBack={() => setView("HOME")} />
      )}
    </main>
  );
}

export default App;