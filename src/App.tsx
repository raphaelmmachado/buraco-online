import "./style.css";
import { OnlineGame } from "./components/screens/OnlineGame";
import { LocalGame } from "./components/LocalGame";
import { StartMenu } from "./components/screens/StartMenu";
import { useState } from "react";

// The new router structure: 3 distinct states
type VIEW_MODE = "HOME" | "ONLINE" | "LOCAL";

function App() {
  const [view, setView] = useState<VIEW_MODE>("HOME");

  return (
    <main className="">
      {view === "HOME" && (
        <StartMenu
          onPlayOnline={() => setView("ONLINE")}
          onPlayLocal={() => setView("LOCAL")}
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