import { Server, Socket } from "socket.io";
import { games } from "../state";
import { create_deck, distribute_cards } from "../../common/utils/game_logic";
import { sort_cards } from "../../common/utils/sort_cards";
import { get_player_id_by_socket } from "../services/gameService";
import { broadcast_game_update, process_bot_turn } from "../services/botService";
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
        console.log(`Socket ${socket.id} removido da lista de conexões da sala ${roomId}`);

        // Se o jogo está rolando, transformamos o jogador em BOT
        const playerEntry = Object.entries(game.players_data).find(
          ([_, p]) => p.socketId === socket.id
        );

        if (playerEntry) {
          const [pNum, pData] = playerEntry;
          console.log(`Socket de ${pData.userName} (${pNum}) desconectado.`);
          
          if (game.status === "PLAYING") {
             console.log(`Jogador ${pData.userName} (${pNum}) caiu. Aguardando reconexão.`);
             // Não transformamos mais em BOT para evitar instabilidade no Render
          }
          // No Lobby, mantemos os dados para permitir reconexão rápida (ex: refresh)
          // O host pode expulsar se o jogador não retornar.
        }

        // Verifica se ainda existem humanos CONECTADOS na sala
        const anyHumanConnected = Object.values(game.players_data).some(p => 
          !p.isBot && game.players_connected.includes(p.socketId)
        );

        if (!anyHumanConnected) {
          if (!game.disconnectTimeout) {
            // Se estiver no LOBBY, deleta rápido (5s) para limpar a lista.
            // Se estiver JOGANDO, dá 1 minuto de tolerância para reconexão.
            const timeoutDuration = game.status === "LOBBY" ? 5000 : 60000;
            
            console.log(`Sala ${roomId} (${game.status}) sem humanos. Agendando deleção em ${timeoutDuration/1000}s.`);
            
            game.disconnectTimeout = setTimeout(() => {
              console.log(`Tempo esgotado. Deletando sala ${roomId}.`);
              delete games[roomId];
            }, timeoutDuration);
          }
        } else {
          broadcast_game_update(io, roomId);
        }
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
        const existingRoomEntry = Object.entries(games).find(([_, g]) => {
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
        };
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

      // Se houver um timeout de deleção agendado, cancela pois um humano voltou
      if (game.disconnectTimeout) {
        console.log(`Cancelando deleção da sala ${roomId}. Humano retornou (rejoin).`);
        clearTimeout(game.disconnectTimeout);
        game.disconnectTimeout = null;
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
      const [pId, pData] = playerEntry;
      
      if (game.status === "PLAYING") {
        console.log(`Jogador ${pData.userName} saiu da partida.`);
        // No futuro poderíamos encerrar a partida aqui, por enquanto o jogo fica parado.
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
        const timeoutDuration = game.status === "LOBBY" ? 5000 : 60000;
        console.log(`Sala ${roomId} (${game.status}) sem humanos (leave). Agendando deleção em ${timeoutDuration/1000}s.`);
        
        game.disconnectTimeout = setTimeout(() => {
          console.log(`Tempo esgotado (leave). Deletando sala ${roomId}.`);
          delete games[roomId];
        }, timeoutDuration);
      }
    } else {
      // Notify others
      broadcast_game_update(io, roomId);
    }
  });
};
