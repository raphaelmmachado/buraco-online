import "./style.css";
import { OnlineGame } from "./components/screens/OnlineGame";
import { LocalGame } from "./components/LocalGame";
import { StartMenu } from "./components/screens/StartMenu";
import { useEffect, useState } from "react";
import { usePWA } from "./hooks/usePWA";
import { useGameStore, updateSocketBehavior } from "./store/useGameStore";

// The new router structure: 3 distinct states
type VIEW_MODE = "HOME" | "ONLINE" | "LOCAL";

function App() {
  const { checkForUpdate, needRefresh, updateServiceWorker, offlineReady } =
    usePWA();
  const [isChecking, setIsChecking] = useState(false);
  const [showUpdateSuccess, setShowUpdateSuccess] = useState(false);
  const [view, setView] = useState<VIEW_MODE>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("room")) return "ONLINE";
    return "HOME";
  });

  const initializeSocket = useGameStore((state) => state.initializeSocket);
  const connectSocket = useGameStore((state) => state.connectSocket);
  const disconnectSocket = useGameStore((state) => state.disconnectSocket);
  const addEvent = useGameStore((state) => state.addEvent);

  useEffect(() => {
    initializeSocket();
  }, [initializeSocket]);

  // Primeira vez que a versão é salva no dispositivo: avisa que já dá para jogar offline.
  useEffect(() => {
    if (offlineReady) {
      addEvent("Versão salva no dispositivo! Já pode jogar sem internet.", "success");
    }
  }, [offlineReady, addEvent]);

  useEffect(() => {
    if (view === "LOCAL") {
      updateSocketBehavior("MENU");
      disconnectSocket(); // Desligado se for jogo contra bot (LOCAL)
      return;
    }

    updateSocketBehavior(view === "ONLINE" ? "GAME" : "MENU");

    // Sem internet o app continua abrindo e o modo offline funciona normalmente.
    // Não insiste na conexão para não deixar o menu preso em "Buscando servidor".
    if (!navigator.onLine) {
      disconnectSocket();
      return;
    }

    connectSocket();
  }, [view, connectSocket, disconnectSocket]);

  // Quando a internet volta, tenta conectar novamente sem precisar recarregar.
  useEffect(() => {
    const handleOnline = () => {
      if (view === "LOCAL") return;
      updateSocketBehavior(view === "ONLINE" ? "GAME" : "MENU");
      connectSocket();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [view, connectSocket]);

  const handlePlayOnline = async () => {
    setView("ONLINE");
  };

  const handleCheckUpdate = async () => {
    if (!navigator.onLine) {
      addEvent(
        "Sem internet. O app está usando a versão salva no dispositivo.",
        "warning",
      );
      return;
    }

    setIsChecking(true);
    setShowUpdateSuccess(false);
    const hasUpdate = await checkForUpdate();
    setIsChecking(false);
    
    if (!hasUpdate) {
      setShowUpdateSuccess(true);
      setTimeout(() => setShowUpdateSuccess(false), 3000);
    }
  };

  return (
    <main className="">
      {view === "HOME" && (
        <StartMenu
          onPlayOnline={handlePlayOnline}
          onPlayLocal={() => setView("LOCAL")}
          onCheckUpdate={handleCheckUpdate}
          onUpdateApp={() => updateServiceWorker()}
          isUpdating={isChecking}
          needRefresh={needRefresh}
          updateSuccess={showUpdateSuccess}
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