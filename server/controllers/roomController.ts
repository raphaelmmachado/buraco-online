import { Server, Socket } from "socket.io";
import { games } from "../state";
import { create_deck, distribute_cards } from "../../common/utils/game_logic";
import { sort_cards } from "../../common/utils/sort_cards";
import { get_player_id_by_socket } from "../services/gameService";
import { broadcast_game_update } from "../services/botService";
import { type PlayerID, type GameMode } from "../types";
import { type Card } from "../../common/types/card";

export const registerRoomHandlers = (io: Server, socket: Socket) => {
  socket.on("disconnect", () => {
    console.log("Desconectado:", socket.id);
    // Remove o socket de todas as salas em que ele estava
    for (const roomId in games) {
      const game = games[roomId];
      if (!game) continue;
      const idx = game.players_connected.indexOf(socket.id);
      if (idx !== -1) {
        game.players_connected.splice(idx, 1);
        console.log(`Socket ${socket.id} removido da sala ${roomId}`);
        broadcast_game_update(io, roomId);
      }
    }
  });

  socket.on("request_rooms", () => {
    const room_list = Object.entries(games).map(([roomId, game]) => {
      const filledSlots = Object.keys(game.players_data).length;
      return {
        roomId,
        mode: game.mode,
        playerCount: filledSlots,
        maxPlayers: game.mode === "1v1" ? 2 : 4,
        status: game.status,
      };
    });

    const allHumanPlayers = Object.values(games)
      .flatMap((g) => Object.values(g.players_data))
      .filter((p) => !p.isBot);

    const totalOnline = allHumanPlayers.length;
    const onlineNames = Array.from(
      new Set(allHumanPlayers.map((p) => p.userName))
    );

    socket.emit("rooms_list", {
      rooms: room_list,
      totalOnline,
      onlineNames,
    });
  });

  // ADD BOT ACTION
  socket.on("action_add_bot", ({ roomId }: { roomId: string }) => {
    const game = games[roomId];
    if (!game) return;

    const maxPlayers = game.mode === "1v1" ? 2 : 4;
    const filledSlots = Object.keys(game.players_data).length;

    if (filledSlots >= maxPlayers) return;

    const botId = filledSlots + 1;
    const botName = `Bot ${botId}`;

    game.players_data[botId as PlayerID] = {
      socketId: `BOT-${Date.now()}`, // Fake socket ID
      userName: botName,
      playerId: `BOT-${botId}`,
      isBot: true,
    };

    broadcast_game_update(io, roomId);
  });

  socket.on(
    "join_game",
    ({
      roomId,
      mode,
      userName,
      playerId,
    }: {
      roomId: string;
      mode: GameMode;
      userName: string;
      playerId: string;
    }) => {
      if (!games[roomId]) {
        console.log(`Criando sala ${roomId} [${mode}]`);
        const deck = create_deck();
        const setup = distribute_cards(deck, mode);

        // Organiza as mãos automaticamente após a distribuição
        const sorted_hands: Record<number, Card[]> = {};
        Object.entries(setup.hands).forEach(([id, hand]) => {
          sorted_hands[Number(id)] = sort_cards(hand);
        });

        games[roomId] = {
          mode,
          status: "LOBBY",
          deck: setup.remaining_deck,
          discard_pile: [],
          hands: sorted_hands,
          team_melds: { 1: [], 2: [] },
          dead_piles: setup.dead_piles,
          has_taken_dead_pile: [false, false],
          turn_phase: "DRAW",
          current_player: 1,
          players_connected: [],
          players_data: {},
          last_drawn_card_id: null,
          final_score: null,
        };
      }

      const game = games[roomId];
      if (!game) return;

      // Verifica se é uma reconexão disfarçada de join (mesmo ID de jogador)
      const existingPlayerEntry = Object.entries(game.players_data).find(
        ([_, p]) => p.playerId === playerId
      );
      if (existingPlayerEntry) {
        // É o mesmo jogador tentando entrar de novo. Redireciona para lógica de rejoin.
        const [pNum, pData] = existingPlayerEntry;

        // Limpa socket antigo da lista de conectados
        const oldSocketId = pData.socketId;
        const oldIdx = game.players_connected.indexOf(oldSocketId);
        if (oldIdx !== -1) {
          game.players_connected.splice(oldIdx, 1);
        }

        // Atualiza socket
        pData.socketId = socket.id;
        // Adiciona novo socket
        if (!game.players_connected.includes(socket.id)) {
          game.players_connected.push(socket.id);
        }

        socket.join(roomId);
        socket.emit("player_assignment", Number(pNum), pData.userName);
        broadcast_game_update(io, roomId);
        return;
      }

      // BLOCK JOINING IF GAME STARTED
      if (game.status !== "LOBBY") {
        socket.emit(
          "error_msg",
          "A partida já começou! Não é possível entrar."
        );
        return;
      }

      const maxPlayers = game.mode === "1v1" ? 2 : 4;
      const filledSlots = Object.keys(game.players_data).length;

      if (filledSlots >= maxPlayers) {
        socket.emit("error_msg", "Sala cheia!");
        return;
      }

      socket.join(roomId);

      // Assign new player
      const myPlayerNumber = (filledSlots + 1) as PlayerID;

      game.players_connected.push(socket.id);
      game.players_data[myPlayerNumber] = {
        socketId: socket.id,
        userName,
        playerId,
        isBot: false,
      };

      socket.emit("player_assignment", myPlayerNumber, userName);

      broadcast_game_update(io, roomId);
    }
  );

  socket.on(
    "rejoin_game",
    ({ roomId, playerId }: { roomId: string; playerId: string }) => {
      console.log(
        `[REJOIN] Request from socket ${socket.id} for room ${roomId}, player ${playerId}`
      );
      const game = games[roomId];
      if (!game) {
        // Sala não existe mais. Avisa o cliente para parar de tentar.
        console.log(`[REJOIN] Failed: Room ${roomId} not found.`);
        socket.emit("rejoin_failed");
        return;
      }

      const playerEntry = Object.entries(game.players_data).find(
        ([_, p]) => p.playerId === playerId
      );

      if (!playerEntry) {
        console.log(`[REJOIN] Failed: Player ${playerId} not found in room.`);
        socket.emit("error_msg", "Jogador não encontrado nesta sala.");
        return;
      }

      const [pNum, pData] = playerEntry;

      console.log(
        `Player ${pData.userName} (${pNum}) reconnecting to ${roomId}`
      );

      // Limpa socket antigo da lista de conectados
      const oldSocketId = pData.socketId;
      const oldIdx = game.players_connected.indexOf(oldSocketId);
      if (oldIdx !== -1) {
        game.players_connected.splice(oldIdx, 1);
      }

      // Atualiza o socket ID
      pData.socketId = socket.id;

      // Garante que está na lista de conectados
      if (!game.players_connected.includes(socket.id)) {
        game.players_connected.push(socket.id);
      }

      socket.join(roomId);
      socket.emit("player_assignment", Number(pNum), pData.userName);
      broadcast_game_update(io, roomId);
    }
  );

  socket.on("action_start_game", ({ roomId }: { roomId: string }) => {
    const game = games[roomId];
    if (!game) return;

    const player_id = get_player_id_by_socket(game, socket.id);
    if (!player_id) return;

    if (player_id !== 1) {
      socket.emit("error_msg", "Apenas o dono da sala pode iniciar o jogo.");
      return;
    }

    const maxPlayers = game.mode === "1v1" ? 2 : 4;
    const filledSlots = Object.keys(game.players_data).length;

    if (filledSlots !== maxPlayers) {
      socket.emit("error_msg", "Aguardando todos os jogadores entrarem.");
      return;
    }

    game.status = "PLAYING";
    broadcast_game_update(io, roomId);
  });

  socket.on("action_close_room", ({ roomId }: { roomId: string }) => {
    const game = games[roomId];
    if (!game) return;

    const player_id = get_player_id_by_socket(game, socket.id);
    if (!player_id) return;

    if (player_id !== 1) {
      socket.emit("error_msg", "Apenas o dono da sala pode encerrar a sala.");
      return;
    }

    console.log(`Sala ${roomId} encerrada pelo anfitrião.`);
    io.to(roomId).emit("game_closed", "O anfitrião encerrou a sala.");

    // Close all sockets in the room? Or let client handle it.
    // Ideally, let client handle the redirect.
    delete games[roomId];
  });

  socket.on("leave_game", ({ roomId }: { roomId: string }) => {
    const game = games[roomId];
    if (!game) return;

    console.log(`Player ${socket.id} leaving room ${roomId}`);

    // Remove from connected list
    const playerIdx = game.players_connected.indexOf(socket.id);
    if (playerIdx !== -1) {
      game.players_connected.splice(playerIdx, 1);
    }

    // Find and remove from players_data to free up the slot
    // This allows the user to rejoin as a fresh player or someone else to take the spot
    const playerEntry = Object.entries(game.players_data).find(
      ([_, p]) => p.socketId === socket.id
    );

    if (playerEntry) {
      const [pId] = playerEntry;
      delete game.players_data[Number(pId) as PlayerID];
    }

    // CHECK IF ONLY BOTS REMAIN
    const remainingPlayers = Object.values(game.players_data);
    const hasHumans = remainingPlayers.some((p) => !p.isBot);

    socket.leave(roomId);

    // If room is empty OR only bots remain, delete it
    if (
      (game.players_connected.length === 0 &&
        Object.keys(game.players_data).length === 0) ||
      !hasHumans
    ) {
      console.log(`Room ${roomId} has no humans left. Deleting game.`);
      delete games[roomId];
    } else {
      // Notify others
      broadcast_game_update(io, roomId);
    }
  });
};
