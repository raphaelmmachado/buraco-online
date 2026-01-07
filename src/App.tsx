import "./style.css";
import { OnlineGame } from "./components/online/OnlineGame";
import { DebugGame } from "./components/DebugGame";

type DEV_STATUS = "BOT" | "MULTIPLAYER";

const DEV: DEV_STATUS = "MULTIPLAYER";

function App() {
  return (
    <main className="">
      {DEV === "MULTIPLAYER" ? <OnlineGame /> : <DebugGame />}
    </main>
  );
}

export default App;
