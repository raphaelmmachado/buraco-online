import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import App from "./App.tsx";
import { registerSW } from 'virtual:pwa-register';

// Auto-update SW
registerSW({
  immediate: true,
  onRegistered(r) {
    r?.update();
  },
  onNeedRefresh() {
    window.location.reload();
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
