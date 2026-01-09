import "./style.css";
import { OnlineGame } from "./components/online/OnlineGame";
import { LocalGame } from "./components/LocalGame";
import { useState } from "react";

type VIEW_MODE = "BOT" | "MULTIPLAYER";

function App() {
  const [view, setView] = useState<VIEW_MODE>("MULTIPLAYER");

  return (
    <main className="">
      {view === "MULTIPLAYER" ? (
        <OnlineGame onPlayLocal={() => setView("BOT")} />
      ) : (
        <LocalGame onBack={() => setView("MULTIPLAYER")} />
      )}
    </main>
  );
}

export default App;
