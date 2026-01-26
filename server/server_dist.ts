import { Server, Socket } from "socket.io";
import { createServer } from "http";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { registerRoomHandlers } from "./controllers/roomController";
import { registerGameHandlers } from "./controllers/gameController";
import { loadState } from "./state";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Load persisted state immediately
loadState();

// Global Error Handlers to debug crashes
process.on("uncaughtException", (err) => {
  console.error("CRITICAL ERROR: Uncaught Exception:", err);
  // Optional: saveState() sync here? Risk of corruption.
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(
    "CRITICAL ERROR: Unhandled Rejection at:",
    promise,
    "reason:",
    reason,
  );
});

// Configuração do Express para responder ao Health Check do Render
const app = express();

// Endpoint de saúde específico
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});

// Serve static files from the React frontend app
// Assuming the dist folder is at the project root, so we go up one level from 'server'
const clientBuildPath = path.join(__dirname, "../dist");
console.log(`Serving static files from: ${clientBuildPath}`);
app.use(express.static(clientBuildPath));

// Catch-all to serve index.html for any request that doesn't match an API route or static file
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(clientBuildPath, "index.html"));
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  pingInterval: 5000,
  pingTimeout: 120000,
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket: Socket) => {
  console.log("Conectado:", socket.id);

  // Register modularized handlers
  registerRoomHandlers(io, socket);
  registerGameHandlers(io, socket);
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor (Dist) rodando em http://localhost:${PORT}`);
});
