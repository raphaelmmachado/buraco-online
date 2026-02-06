import { Server, Socket } from "socket.io";
import { games, saveState } from "../state";
import { create_deck, distribute_cards } from "../../common/utils/game_logic";
import { sort_cards } from "../../common/utils/sort_cards";
import { get_player_id_by_socket, start_next_round, start_new_match } from "../services/gameService";
import { broadcast_game_update, process_bot_turn } from "../services/botService";
import { type PlayerID, type GameMode, type WinCondition } from "../types";
import { startTurnTimer } from "../services/timerService";
import { type Card } from "../../common/types/card";
import { DEFAULT_RULES, type GameRules } from "../../common/types/rules";

const broadcast_rooms_list = (io: Server) => {
    // QUICK CLEANUP: Se houver salas vazias sem timeout agendado (ex: após restart), limpa agora
    for (const roomId in games) {
      const game = games[roomId];
      if (!game) continue;
      if (game.players_connected.length === 0 && !game.disconnectTimeout) {
          delete games[roomId];
      }
    }

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

    io.emit("rooms_list", {
      rooms: room_list,
      totalOnline,
      onlineNames,
    });
};

export const registerRoomHandlers = (io: Server, socket: Socket) => {
  socket.on("disconnect", () => {
    try {
      console.log("Desconectado:", socket.id);
      // Remove o socket de todas as salas em que ele estava
      for (const roomId in games) {
        const game = games[roomId];
        if (!game) continue;

        const idx = game.players_connected.indexOf(socket.id);
        if (idx !== -1) {
          game.players_connected.splice(idx, 1);
          saveState(); // Persist the disconnection immediately
          console.log(
            `Socket ${socket.id} removido da lista de conexões da sala ${roomId}`
          );

          // Se o jogo está rolando, transformamos o jogador em BOT
          const playerEntry = Object.entries(game.players_data).find(
            ([, p]) => p.socketId === socket.id
          );

          if (playerEntry) {
            const [pNum, pData] = playerEntry;
            console.log(`Socket de ${pData.userName} (${pNum}) desconectado.`);

            // Notify everyone immediately
            io.to(roomId).emit("player_disconnected", { 
                playerNumber: Number(pNum), 
                userName: pData.userName 
            });

            if (game.status === "PLAYING") {
              console.log(
                `Jogador ${pData.userName} (${pNum}) caiu. Iniciando timer de 10 segundos para Bot.`
              );
              
              // Clear any existing timeout just in case
              if (pData.botTakeoverTimeout) clearTimeout(pData.botTakeoverTimeout);

              pData.botTakeoverTimeout = setTimeout(() => {
                  console.log(`Tempo esgotado para ${pData.userName}. Substituindo por BOT.`);
                  pData.isBot = true;
                  pData.socketId = "BOT";
                  pData.botTakeoverTimeout = null; // Clear ref

                  io.to(roomId).emit("bot_takeover", { 
                      playerNumber: Number(pNum), 
                      userName: pData.userName 
                  });
                  broadcast_game_update(io, roomId);
                  saveState();
                  
                  // Trigger bot action immediately if it was their turn
                  if (game.current_player === Number(pNum)) {
                      process_bot_turn(io, roomId);
                  }
              }, 10000); // 10 seconds
            }
            // No Lobby, mantemos os dados para permitir reconexão rápida (ex: refresh)
            // O host pode expulsar se o jogador não retornar.
          }

          // Verifica se ainda existem humanos CONECTADOS na sala
          const anyHumanConnected = Object.values(game.players_data).some(
            (p) => !p.isBot && game.players_connected.includes(p.socketId)
          );

          if (!anyHumanConnected) {
            if (!game.disconnectTimeout) {
              // Se estiver no LOBBY, deleta rápido (10s) para limpar a lista.
              // Se estiver JOGANDO, dá 5 minutos de tolerância para reconexão.
              const timeoutDuration = game.status === "LOBBY" ? 10000 : 300000;

              console.log(
                `Sala ${roomId} (${
                  game.status
                }) sem humanos. Agendando deleção em ${timeoutDuration / 1000}s.`
              );

              game.disconnectTimeout = setTimeout(() => {
                console.log(`Tempo esgotado. Deletando sala ${roomId}.`);
                delete games[roomId];
                saveState();
              }, timeoutDuration);
            }
          } else {
            broadcast_game_update(io, roomId);
          }
        }
      }
    } catch (err) {
      console.error("Error in disconnect handler:", err);
    }
  });

  socket.on("request_rooms", () => {
    broadcast_rooms_list(io);
  });

  socket.on("action_add_bot", ({ roomId }: { roomId: string }) => {
    const game = games[roomId];
    if (!game) return;

    const player_id = get_player_id_by_socket(game, socket.id);
    if (player_id !== 1) {
        socket.emit("error_msg", "Apenas o dono da sala pode adicionar bots.");
        return;
    }

    if (game.status !== "LOBBY") {
        socket.emit("error_msg", "Não é possível adicionar bots durante a partida.");
        return;
    }

    const maxPlayers = game.mode === "1v1" ? 2 : 4;
    const filledSlots = Object.keys(game.players_data).length;

    if (filledSlots >= maxPlayers) {
        socket.emit("error_msg", "Sala cheia!");
        return;
    }

    // Find first available slot (1, 2, 3, 4)
    let botSlot: PlayerID | null = null;
    for (let i = 1; i <= maxPlayers; i++) {
        if (!game.players_data[i as PlayerID]) {
            botSlot = i as PlayerID;
            break;
        }
    }

    if (botSlot) {
        game.players_data[botSlot] = {
            socketId: "BOT",
            userName: `Bot ${botSlot}`,
            playerId: `bot-${Date.now()}-${botSlot}`, // Fake unique ID
            isBot: true,
        };
        console.log(`[BOT] Added to slot ${botSlot} in room ${roomId}`);
        broadcast_game_update(io, roomId);
        saveState();
    }
  });

  socket.on("action_update_rules", ({ roomId, rules }: { roomId: string, rules: GameRules }) => {
    const game = games[roomId];
    if (!game || game.status !== "LOBBY") return;

    const player_id = get_player_id_by_socket(game, socket.id);
    if (player_id !== 1) return; // Only host

    game.rules = rules;
    broadcast_game_update(io, roomId);
    saveState();
  });

  socket.on("action_switch_team", ({ roomId }: { roomId: string }) => {
    const game = games[roomId];
    if (!game || game.mode !== "2v2" || game.status !== "LOBBY") return;

    const player_id = get_player_id_by_socket(game, socket.id);
    if (!player_id || player_id === 1) {
        // Player 1 (Host) não pode trocar de time para simplificar a lógica de dono da sala
        return; 
    }

    const currentData = game.players_data[player_id];
    let targetSlot: PlayerID | null = null;

    // Lógica de Troca para 2v2 (Slots: 1,2,3,4)
    // Time 1: 1, 3
    // Time 2: 2, 4

    if (player_id === 2 || player_id === 4) {
        // Está no Time 2, quer ir para Time 1 (Slot 3)
        // Slot 1 é fixo do host, então só sobra o 3
        if (!game.players_data[3]) {
            targetSlot = 3;
        }
    } else if (player_id === 3) {
        // Está no Time 1, quer ir para Time 2 (Slot 2 ou 4)
        if (!game.players_data[2]) targetSlot = 2;
        else if (!game.players_data[4]) targetSlot = 4;
    }

    if (targetSlot && currentData) {
        // Realiza a troca
        game.players_data[targetSlot] = { ...currentData };
        delete game.players_data[player_id];
        
        // Atualiza o cliente sobre seu novo número
        socket.emit("player_assignment", targetSlot, currentData.userName);
        broadcast_game_update(io, roomId);
    }
  });

  socket.on("action_toggle_ready", ({ roomId }: { roomId: string }) => {
    const game = games[roomId];
    if (!game || game.status !== "LOBBY") return;

    const player_id = get_player_id_by_socket(game, socket.id);
    if (!player_id) return;

    const pData = game.players_data[player_id];
    if (pData) {
        pData.isReady = !pData.isReady;
        broadcast_game_update(io, roomId);
    }
  });

  socket.on("action_kick_player", ({ roomId, targetId }: { roomId: string, targetId: number }) => {
    const game = games[roomId];
    if (!game) return;

    const requesterId = get_player_id_by_socket(game, socket.id);
    if (requesterId !== 1) {
        socket.emit("error_msg", "Apenas o dono da sala pode expulsar jogadores.");
        return;
    }

    if (targetId === 1) {
        socket.emit("error_msg", "Você não pode se expulsar.");
        return;
    }

    const targetData = game.players_data[targetId as PlayerID];
    if (!targetData) return;

    console.log(`[KICK] Host expulsando Player ${targetId} (${targetData.userName}) da sala ${roomId}`);

    // Se for um jogador humano conectado, avisamos ele
    if (!targetData.isBot) {
        io.to(targetData.socketId).emit("kicked");
        // Remove da lista de conectados
        const idx = game.players_connected.indexOf(targetData.socketId);
        if (idx !== -1) game.players_connected.splice(idx, 1);
        
        // Força o socket a sair da sala do socket.io
        const targetSocket = io.sockets.sockets.get(targetData.socketId);
        if (targetSocket) {
            targetSocket.leave(roomId);
        }
    }

    // Remove os dados do jogador
    delete game.players_data[targetId as PlayerID];
    
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
      // IMPEDIR QUE O MESMO JOGADOR CRIE MAIS DE UMA SALA COMO HOST (Player 1)
      if (!games[roomId]) {
        // Verifica se o jogador já é host de alguma outra sala
        const existingRoomEntry = Object.entries(games).find(([, g]) => {
            const host = g.players_data[1];
            return host && host.playerId === playerId;
        });

        if (existingRoomEntry) {
            const [oldRoomId, oldGame] = existingRoomEntry;
            
            // Verifica se a sala antiga tem alguém conectado
            // Usamos players_connected que rastreia sockets ativos
            const isSomeoneConnected = oldGame.players_connected.length > 0;

            if (!isSomeoneConnected) {
                // SALA ABANDONADA (Zombie): O host está tentando criar nova, então matamos a velha
                console.log(`[AUTO-CLEANUP] Host ${userName} criando nova sala. Deletando sala zombie ${oldRoomId}.`);
                if (oldGame.disconnectTimeout) clearTimeout(oldGame.disconnectTimeout);
                delete games[oldRoomId];
                saveState();
                // Prossegue para criar a nova sala...
            } else {
                // SALA ATIVA: Não permitimos criar outra
                socket.emit("error_msg", "Você já possui uma sala ativa com jogadores. Volte para ela.");
                return;
            }
        }

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
          cumulative_score: { team_1: 0, team_2: 0 },
          round_count: 1,
          rules: { ...DEFAULT_RULES },
        };
        saveState();
      }

      const game = games[roomId];
      if (!game) return;

      // Se houver um timeout de deleção agendado, cancela pois um humano voltou
      if (game.disconnectTimeout) {
        console.log(`Cancelando deleção da sala ${roomId}. Humano retornou (join).`);
        clearTimeout(game.disconnectTimeout);
        game.disconnectTimeout = null;
      }

      // Verifica se é uma reconexão disfarçada de join (mesmo ID de jogador)
      const existingPlayerEntry = Object.entries(game.players_data).find(
        ([, p]) => p.playerId === playerId
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

        // Cancel pending bot takeover
        if (pData.botTakeoverTimeout) {
            console.log(`Bot takeover cancelled for ${pData.userName} (join)`);
            clearTimeout(pData.botTakeoverTimeout);
            pData.botTakeoverTimeout = null;
        }

        // Atualiza socket
        pData.socketId = socket.id;
        pData.isBot = false; // Jogador voltou, para de ser BOT
        
        // Adiciona novo socket
        if (!game.players_connected.includes(socket.id)) {
          game.players_connected.push(socket.id);
        }

        socket.join(roomId);
        socket.emit("player_assignment", Number(pNum), pData.userName);
        io.to(roomId).emit("player_reconnected", { userName: pData.userName });
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
      broadcast_rooms_list(io);
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

      // Se houver um timeout de deleção agendado, cancela pois um humano voltou
      if (game.disconnectTimeout) {
        console.log(`Cancelando deleção da sala ${roomId}. Humano retornou (rejoin).`);
        clearTimeout(game.disconnectTimeout);
        game.disconnectTimeout = null;
      }

      const playerEntry = Object.entries(game.players_data).find(
        ([, p]) => p.playerId === playerId
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

      // Cancel pending bot takeover
      if (pData.botTakeoverTimeout) {
          console.log(`Bot takeover cancelled for ${pData.userName} (rejoin)`);
          clearTimeout(pData.botTakeoverTimeout);
          pData.botTakeoverTimeout = null;
      }

      // Atualiza o socket ID
      pData.socketId = socket.id;
      pData.isBot = false; // Jogador voltou, reassume o controle

      // Garante que está na lista de conectados
      if (!game.players_connected.includes(socket.id)) {
        game.players_connected.push(socket.id);
      }

      socket.join(roomId);
      socket.emit("player_assignment", Number(pNum), pData.userName);
      io.to(roomId).emit("player_reconnected", { userName: pData.userName });
      broadcast_game_update(io, roomId);
    }
  );

  socket.on("action_start_game", ({ roomId, winCondition }: { roomId: string, winCondition?: WinCondition }) => {
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

    // Check Readiness
    // Actually, explicit is better. Host should also be ready? 
    // Usually host clicking start implies they are ready. 
    // But let's check non-host humans.
    const nonHostPlayers = Object.entries(game.players_data).filter(([pid]) => pid !== "1");
    const allOthersReady = nonHostPlayers.every(([, p]) => p.isBot || p.isReady);

    if (!allOthersReady) {
        socket.emit("error_msg", "Todos os jogadores precisam estar PRONTOS.");
        return;
    }

    if (game.status !== "LOBBY") {
        start_new_match(game);
    } else {
        game.status = "PLAYING";
    }

    if (winCondition) {
        game.win_condition = winCondition;
    }

    startTurnTimer(io, roomId);
    broadcast_game_update(io, roomId);
    
    // START BOT IF P1 IS BOT
    process_bot_turn(io, roomId);
    
    saveState();
  });

  socket.on("action_next_round", ({ roomId }: { roomId: string }) => {
    const game = games[roomId];
    if (!game) return;

    const player_id = get_player_id_by_socket(game, socket.id);
    if (player_id !== 1) {
        socket.emit("error_msg", "Apenas o dono da sala pode iniciar a próxima rodada.");
        return;
    }

    if (game.status !== "ROUND_OVER") {
        socket.emit("error_msg", "A rodada ainda não acabou.");
        return;
    }

    start_next_round(game);
    startTurnTimer(io, roomId);
    broadcast_game_update(io, roomId);

    // START BOT IF P1 IS BOT
    process_bot_turn(io, roomId);

    saveState();
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
    saveState();
    broadcast_rooms_list(io);
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
      ([, p]) => p.socketId === socket.id
    );

    if (playerEntry) {
      const [pId, pData] = playerEntry;
      const pNum = Number(pId);
      
      if (game.status === "PLAYING") {
        console.log(`Jogador ${pData.userName} (${pNum}) saiu da partida. Iniciando timer de 10s para Bot.`);
        
        // Notify others
        io.to(roomId).emit("player_disconnected", { 
            playerNumber: pNum, 
            userName: pData.userName 
        });

        // Clear any existing timeout just in case
        if (pData.botTakeoverTimeout) clearTimeout(pData.botTakeoverTimeout);

        pData.botTakeoverTimeout = setTimeout(() => {
            console.log(`Tempo esgotado para ${pData.userName}. Substituindo por BOT (leave).`);
            pData.isBot = true;
            pData.socketId = "BOT";
            pData.botTakeoverTimeout = null; // Clear ref

            io.to(roomId).emit("bot_takeover", { 
                playerNumber: pNum, 
                userName: pData.userName 
            });
            broadcast_game_update(io, roomId);
            saveState();
            
            // Trigger bot action immediately if it was their turn
            if (game.current_player === pNum) {
                process_bot_turn(io, roomId);
            }
        }, 10000); // 10 seconds

      } else {
        // No Lobby ou fim de jogo, removemos para liberar a vaga
        delete game.players_data[Number(pId) as PlayerID];
      }
    }

    // CHECK IF ANY HUMANS REMAIN CONNECTED
    const anyHumanConnected = Object.values(game.players_data).some(p => 
      !p.isBot && game.players_connected.includes(p.socketId)
    );

    socket.leave(roomId);

    // If room is empty OR only bots remain, schedule deletion instead of immediate delete
    if (!anyHumanConnected) {
      if (!game.disconnectTimeout) {
        const timeoutDuration = game.status === "LOBBY" ? 10000 : 300000;
        console.log(`Sala ${roomId} (${game.status}) sem humanos (leave). Agendando deleção em ${timeoutDuration/1000}s.`);
        
        game.disconnectTimeout = setTimeout(() => {
          console.log(`Tempo esgotado (leave). Deletando sala ${roomId}.`);
          delete games[roomId];
          saveState();
        }, timeoutDuration);
      }
    } else {
      // Notify others
      broadcast_game_update(io, roomId);
    }
    saveState();
    broadcast_rooms_list(io);
  });
};