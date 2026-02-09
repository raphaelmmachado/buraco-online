console.log("--- SCRIPT START ---");
import { Server, Socket } from "socket.io";
import { createServer } from "http";
import express from "express";
import { registerRoomHandlers } from "./controllers/roomController";
import { registerGameHandlers } from "./controllers/gameController";
import { loadState } from "./state";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3050;

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

app.get("/", (req, res) => {
  res.status(200).send("Buraco Online Server is Live!");
});

// Endpoint de saúde específico
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
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
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
