console.log("--- SCRIPT START ---");
import { Server, Socket } from "socket.io";
import { createServer } from "http";
import { registerRoomHandlers } from "./controllers/roomController";
import { registerGameHandlers } from "./controllers/gameController";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const httpServer = createServer();
const io = new Server(httpServer, {
  pingInterval: 5000,  // Heartbeat mais frequente (5s) para manter conexão viva
  pingTimeout: 30000,  // Mais tolerância (30s) se o cliente demorar a responder (aba em background)
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