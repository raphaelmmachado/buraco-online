import "./style.css";
import { OnlineGame } from "./components/online/OnlineGame";
import { DebugGame } from "./components/DebugGame";
function App() {
  return (
    <main className="">
      <OnlineGame />
      {/* <DebugGame /> */}
    </main>
  );
}

export default App;
