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
  const { checkForUpdate, needRefresh, updateServiceWorker } = usePWA();
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

  useEffect(() => {
    initializeSocket();
  }, [initializeSocket]);

  useEffect(() => {
    if (view === "ONLINE") {
      updateSocketBehavior("GAME"); // Agressivo (1-5s) se estiver em jogo online
      connectSocket();
    } else if (view === "HOME") {
      updateSocketBehavior("MENU"); // Manual no menu principal para evitar loops
      connectSocket(); // Tenta conectar apenas UMA vez ao carregar o menu
    } else {
      updateSocketBehavior("MENU");
      disconnectSocket(); // Desligado se for jogo contra bot (LOCAL)
    }
  }, [view, connectSocket, disconnectSocket]);

  const handlePlayOnline = async () => {
    setView("ONLINE");
  };

  const handleCheckUpdate = async () => {
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