console.log("--- SCRIPT START ---");
import { Server, Socket } from "socket.io";

import { create_deck, distribute_cards } from "../common/utils/game_logic.ts";
import {
  validate_sequence,
  validate_discard_pickup,
} from "../common/utils/rules_logic.ts";
import { sort_cards, organize_meld } from "../common/utils/sort_cards.ts";
import { calculate_score, type ScoreResult } from "../common/utils/scoring.ts";
import { type Card } from "../common/types/card.ts";

// AI Logic Import
import {
  analyze_discard_pickup,
  choose_discard,
  find_card_to_add,
  find_meld_in_hand,
} from "../common/utils/bot_logic.ts";

type PlayerID = 1 | 2 | 3 | 4;
type TeamID = 1 | 2;
type GameMode = "1v1" | "2v2";

interface PlayerData {
  socketId: string;
  userName: string;
  playerId: string;
  isBot?: boolean;
}

interface ServerGameState {
  mode: GameMode;
  status: "LOBBY" | "PLAYING" | "FINISHED";
  deck: Card[];
  discard_pile: Card[];
  dead_piles: Card[][];
  hands: Record<number, Card[]>;
  team_melds: Record<TeamID, Card[][]>;
  has_taken_dead_pile: [boolean, boolean];
  turn_phase: "DRAW" | "ACTION" | "DISCARD";
  current_player: number;
  players_connected: string[];
  players_data: Record<PlayerID, PlayerData>;
  final_score: {
    team_1: number;
    team_2: number;
    details_t1: ScoreResult;
    details_t2: ScoreResult;
  } | null;
}

const games: Record<string, ServerGameState> = {};

const get_team = (player_id: number): TeamID => {
  return player_id % 2 !== 0 ? 1 : 2;
};

const get_next_player = (current: number, mode: GameMode): number => {
  if (mode === "1v1") return current === 1 ? 2 : 1;
  return (current % 4) + 1;
};

const has_clean_canastra = (
  game: ServerGameState,
  team_id: TeamID
): boolean => {
  const melds = game.team_melds[team_id];
  if (!melds) return false;
  
  return melds.some((meld) => {
    const val = validate_sequence(meld);
    return (
      val.is_valid &&
      (val.canastra_type === "CLEAN" ||
        val.canastra_type === "KING" ||
        val.canastra_type === "ACE")
    );
  });
};

const requires_clean_to_empty_hand = (
  game: ServerGameState,
  team_id: TeamID
): boolean => {
  const team_idx = team_id - 1;
  // Safe access for tuple [boolean, boolean]
  const has_taken = game.has_taken_dead_pile[team_idx as 0 | 1];
  
  if (has_taken) return true;
  if (game.dead_piles.length > 0) return false;
  return true;
};

const handle_empty_hand = (
  game: ServerGameState,
  player_id: PlayerID,
  type: "DIRECT" | "INDIRECT"
) => {
  const team_id = get_team(player_id);
  const team_idx = team_id - 1;
  
  const has_taken = game.has_taken_dead_pile[team_idx as 0 | 1];

  if (has_taken) {
    console.log(`Fim de Jogo! Time ${team_id} bateu final.`);
    const t1_hand_1 = game.hands[1] ?? [];
    const t1_hand_2 = game.hands[3] ?? [];
    const t2_hand_1 = game.hands[2] ?? [];
    const t2_hand_2 = game.hands[4] ?? [];

    const t1_melds = game.team_melds[1] ?? [];
    const t2_melds = game.team_melds[2] ?? [];
    
    const t1_taken = game.has_taken_dead_pile[0];
    const t2_taken = game.has_taken_dead_pile[1];

    const t1_score = calculate_score(
      t1_melds,
      [t1_hand_1, t1_hand_2],
      team_id === 1,
      !t1_taken
    );
    const t2_score = calculate_score(
      t2_melds,
      [t2_hand_1, t2_hand_2],
      team_id === 2,
      !t2_taken
    );

    game.status = "FINISHED";
    game.final_score = {
      team_1: t1_score.total_score,
      team_2: t2_score.total_score,
      details_t1: t1_score,
      details_t2: t2_score,
    };
    return;
  }

  if (game.dead_piles.length > 0) {
    const my_dead_pile = game.dead_piles.shift();
    if (my_dead_pile) {
      game.has_taken_dead_pile[team_idx as 0 | 1] = true;
      game.hands[player_id] = sort_cards(my_dead_pile);
    }
    game.turn_phase = type === "DIRECT" ? "ACTION" : "DRAW";
    console.log(`Jogador ${player_id} pegou o morto (${type})`);
  } else {
    // Fim de jogo: Não tem morto para pegar
    console.log(`Fim de Jogo! Sem mortos disponíveis.`);
    const t1_hand_1 = game.hands[1] ?? [];
    const t1_hand_2 = game.hands[3] ?? [];
    const t2_hand_1 = game.hands[2] ?? [];
    const t2_hand_2 = game.hands[4] ?? [];

    const t1_melds = game.team_melds[1] ?? [];
    const t2_melds = game.team_melds[2] ?? [];
    
    const t1_taken = game.has_taken_dead_pile[0];
    const t2_taken = game.has_taken_dead_pile[1];

    const t1_score = calculate_score(t1_melds, [t1_hand_1, t1_hand_2], team_id === 1, !t1_taken);
    const t2_score = calculate_score(t2_melds, [t2_hand_1, t2_hand_2], team_id === 2, !t2_taken);

    game.status = "FINISHED";
    game.final_score = {
      team_1: t1_score.total_score,
      team_2: t2_score.total_score,
      details_t1: t1_score,
      details_t2: t2_score,
    };
  }
};

const validateTurn = (
  roomId: string,
  socketId: string
): { game: ServerGameState; player_id: PlayerID } | null => {
  const game = games[roomId];
  if (!game) return null;

  // Se o socketId for "BOT", validamos apenas se o current player é um bot
  if (socketId === "BOT") {
      const pData = game.players_data[game.current_player as PlayerID];
      if (pData && pData.isBot) {
          return { game, player_id: game.current_player as PlayerID };
      }
      return null;
  }

  const playerIndex = game.players_connected.indexOf(socketId);
  if (playerIndex === -1) return null;

  const player_id = (playerIndex + 1) as PlayerID;
  if (game.current_player !== player_id) {
    return null;
  }
  return { game, player_id };
};

// --- BOT TURN LOGIC ---
const process_bot_turn = (roomId: string) => {
    const game = games[roomId];
    if (!game || game.status !== "PLAYING") return;
    
    const pData = game.players_data[game.current_player as PlayerID];
    if (!pData || !pData.isBot) return;

    console.log(`[BOT] Processing turn for ${pData.userName} (${game.current_player})`);

    // Add simulated delay
    setTimeout(() => {
        execute_bot_move(roomId);
    }, 1500);
}

const execute_bot_move = (roomId: string) => {
    const game = games[roomId];
    if (!game) return;

    // Double check it's still bot turn
    const pData = game.players_data[game.current_player as PlayerID];
    if (!pData || !pData.isBot) return;

    const my_hand = game.hands[game.current_player];
    if (!my_hand) return; // Safety check

    const team_id = get_team(game.current_player);
    const team_melds = game.team_melds[team_id];
    if (!team_melds) return; // Safety check

    // DRAW PHASE
    if (game.turn_phase === "DRAW") {
        if (game.discard_pile.length > 0) {
            const top_discard = game.discard_pile[0];
            if (top_discard) {
                const pickup_cards = analyze_discard_pickup(my_hand, top_discard);
                
                if (pickup_cards) {
                    console.log(`[BOT] Pickup from discard`);
                    // Simulate Pick Up Action
                    const card_ids = pickup_cards.map(c => c.id);
                    // Logic duplication from socket handler below... ideally refactor to shared function
                    // For MVP, inline logic for BOT
                    const combined = [...pickup_cards, top_discard];
                    
                    // Bot takes the rest of the discard pile
                    const rest_of_discard = game.discard_pile.slice(1);
                    game.discard_pile = []; 
                    
                    const new_hand = my_hand.filter((c) => !card_ids.includes(c.id));
                    new_hand.push(...rest_of_discard);
                    game.hands[game.current_player] = sort_cards(new_hand);
                    
                    team_melds.push(organize_meld(combined));
                    
                    game.turn_phase = "ACTION";
                    io.to(roomId).emit("game_update", game);
                    
                    // Bot continues to ACTION phase immediately
                    setTimeout(() => execute_bot_move(roomId), 1000);
                    return;
                }
            }
        }
        
        // Draw from deck
        console.log(`[BOT DEBUG] ${pData.userName} drawing from deck. Remaining: ${game.deck.length}`);
        if (game.deck.length === 0) {
             // Handle Deck Empty logic (move dead pile or finish)
             // Simplified: just finish if empty for bot for now
             if (game.dead_piles.length > 0) {
                 console.log(`[BOT DEBUG] Deck empty, taking card from dead pile.`);
                 const next_deck = game.dead_piles.shift();
                 if (next_deck) {
                    game.deck = next_deck;
                 }
             } else {
                 console.log(`[BOT DEBUG] Deck and dead piles empty. Finishing game.`);
                 game.status = "FINISHED"; // Quick finish
                 io.to(roomId).emit("game_update", game);
                 return;
             }
        }
        
        const card = game.deck.shift();
        if (card) {
            const current_h = game.hands[game.current_player];
            if (current_h) {
                console.log(`[BOT DEBUG] ${pData.userName} drew ${card.value} of ${card.suit.name}`);
                current_h.unshift(card);
                game.turn_phase = "ACTION";
                io.to(roomId).emit("game_update", game);
                setTimeout(() => execute_bot_move(roomId), 1000);
            }
        }
        return;
    }

    // ACTION PHASE
    if (game.turn_phase === "ACTION") {
        // A. Meld
        const new_meld_cards = find_meld_in_hand(my_hand);
        if (new_meld_cards) {
             console.log(`[BOT DEBUG] ${pData.userName} found new meld: ${new_meld_cards.map(c => c.value + c.suit.icon).join(', ')}`);
             const card_ids = new_meld_cards.map(c => c.id);
             
             game.hands[game.current_player] = my_hand.filter(c => !card_ids.includes(c.id));
             team_melds.push(organize_meld(new_meld_cards));
             
             const updated_hand = game.hands[game.current_player];
             if (updated_hand && updated_hand.length === 0) handle_empty_hand(game, game.current_player as PlayerID, "DIRECT");
             
             io.to(roomId).emit("game_update", game);
             setTimeout(() => execute_bot_move(roomId), 1000); // Try more actions
             return;
        }

        // B. Add to Meld
        for (let i = 0; i < team_melds.length; i++) {
            const meld = team_melds[i];
            if (!meld) continue;

            const card_to_add = find_card_to_add(my_hand, meld);
            if (card_to_add) {
                console.log(`[BOT DEBUG] ${pData.userName} adding ${card_to_add.value}${card_to_add.suit.icon} to existing meld index ${i}`);
                game.hands[game.current_player] = my_hand.filter(c => c.id !== card_to_add.id);
                team_melds[i] = organize_meld([...meld, card_to_add]);
                
                const updated_hand = game.hands[game.current_player];
                if (updated_hand && updated_hand.length === 0) handle_empty_hand(game, game.current_player as PlayerID, "DIRECT");

                io.to(roomId).emit("game_update", game);
                setTimeout(() => execute_bot_move(roomId), 1000);
                return;
            }
        }

        // C. Discard
        const discard_card = choose_discard(my_hand);
        if (discard_card) {
            console.log(`[BOT DEBUG] ${pData.userName} discarding ${discard_card.value}${discard_card.suit.icon}`);
            game.hands[game.current_player] = my_hand.filter(c => c.id !== discard_card.id);
            game.discard_pile.unshift(discard_card);
            
            const updated_hand = game.hands[game.current_player];
            if (updated_hand && updated_hand.length === 0) {
                 handle_empty_hand(game, game.current_player as PlayerID, "INDIRECT");
            }
            
            if (game.status !== "FINISHED") {
                game.turn_phase = "DRAW";
                game.current_player = get_next_player(game.current_player, game.mode);
            }
            
            io.to(roomId).emit("game_update", game);
            
            // Check if next player is bot
            const nextPData = game.players_data[game.current_player as PlayerID];
            if (nextPData && nextPData.isBot) {
                 process_bot_turn(roomId);
            }
        }
    }
};


const io = new Server(3000, { 
    cors: { 
        origin: "*", 
        methods: ["GET", "POST"] 
    } 
});

io.on("connection", (socket: Socket) => {
  console.log("Conectado:", socket.id);

  socket.on("request_rooms", () => {
    const room_list = Object.entries(games).map(([roomId, game]) => {
         const filledSlots = Object.keys(game.players_data).length;
         return {
             roomId,
             mode: game.mode,
             playerCount: filledSlots,
             maxPlayers: game.mode === "1v1" ? 2 : 4,
         };
    });
    
    socket.emit("rooms_list", room_list);
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
           isBot: true
       };
       
       io.to(roomId).emit("game_update", game);
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
                players_data: {} as Record<PlayerID, PlayerData>,
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

        // Atualiza socket
        pData.socketId = socket.id;
        // Atualiza lista de conectados (remove antigo se houver, adiciona novo)
        if (!game.players_connected.includes(socket.id)) {
          game.players_connected.push(socket.id);
        }

        socket.join(roomId);
        socket.emit("player_assignment", Number(pNum), pData.userName);
        io.to(roomId).emit("game_update", game);
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
        isBot: false
      };

      socket.emit("player_assignment", myPlayerNumber, userName);

      io.to(roomId).emit("game_update", game);
    }
  );

  socket.on(
    "rejoin_game",
    ({ roomId, playerId }: { roomId: string; playerId: string }) => {
      const game = games[roomId];
      if (!game) {
        // Sala não existe mais
        socket.emit("error_msg", "Sala não encontrada ou expirada.");
        return;
      }

      const playerEntry = Object.entries(game.players_data).find(
        ([_, p]) => p.playerId === playerId
      );

      if (!playerEntry) {
        socket.emit("error_msg", "Jogador não encontrado nesta sala.");
        return;
      }

      const [pNum, pData] = playerEntry;

      console.log(
        `Player ${pData.userName} (${pNum}) reconnecting to ${roomId}`
      );

      // Atualiza o socket ID
      pData.socketId = socket.id;

      // Garante que está na lista de conectados
      if (!game.players_connected.includes(socket.id)) {
        game.players_connected.push(socket.id);
      }

      socket.join(roomId);
      socket.emit("player_assignment", Number(pNum), pData.userName);
      io.to(roomId).emit("game_update", game);
    }
  );

    socket.on("action_start_game", ({ roomId }: { roomId: string }) => {
      const game = games[roomId];
      if (!game) return;

      const playerIndex = game.players_connected.indexOf(socket.id);
      if (playerIndex === -1) return;
      const player_id = (playerIndex + 1) as PlayerID;

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
      io.to(roomId).emit("game_update", game);
    });

    socket.on("action_draw", ({ roomId }: { roomId: string }) => {
      const ctx = validateTurn(roomId, socket.id);
      if (!ctx) {
        socket.emit("error_msg", "Não é a sua vez.");
        return;
      }
      const { game, player_id } = ctx;

      if (game.turn_phase !== "DRAW") {
        socket.emit("error_msg", "Não está na fase de compra.");
        return;
      }

      if (game.deck.length === 0) {
        if (game.dead_piles.length > 0) {
          console.log(`[GAME] Deck vazio. Movendo morto para o monte.`);
          const new_deck = game.dead_piles.shift();
          if (new_deck) {
            game.deck = new_deck;
          }
        } else {
          console.log("[GAME] Monte e mortos acabaram. Finalizando jogo.");
          
          const t1_hand_1 = game.hands[1] ?? [];
          const t1_hand_2 = game.hands[3] ?? [];
          const t2_hand_1 = game.hands[2] ?? [];
          const t2_hand_2 = game.hands[4] ?? [];
          
          const t1_melds = game.team_melds[1] ?? [];
          const t2_melds = game.team_melds[2] ?? [];
          
          const t1_taken = game.has_taken_dead_pile[0];
          const t2_taken = game.has_taken_dead_pile[1];

          const t1_score = calculate_score(t1_melds, [t1_hand_1, t1_hand_2], false, !t1_taken);
          const t2_score = calculate_score(t2_melds, [t2_hand_1, t2_hand_2], false, !t2_taken);

          game.status = "FINISHED";
          game.final_score = {
            team_1: t1_score.total_score,
            team_2: t2_score.total_score,
            details_t1: t1_score,
            details_t2: t2_score,
          };
          io.to(roomId).emit("game_update", game);
          return;
        }
      }

      const card = game.deck.shift();
      const player_hand = game.hands[player_id];

      if (card && player_hand) {
        player_hand.unshift(card);
        game.turn_phase = "ACTION";
        io.to(roomId).emit("game_update", game);
      }
    });

    socket.on(
      "action_pick_up_discard_new_meld",
      ({ roomId, card_ids }: { roomId: string; card_ids: string[] }) => {
        const ctx = validateTurn(roomId, socket.id);
        if (!ctx) {
          socket.emit("error_msg", "Não é a sua vez.");
          return;
        }
        const { game, player_id } = ctx;

        if (game.turn_phase !== "DRAW" || game.discard_pile.length === 0) {
          socket.emit("error_msg", "Não pode comprar do lixo agora.");
          return;
        }

        const current_hand = game.hands[player_id];
        if (!current_hand) return;

        const top_discard = game.discard_pile[0];
        if (!top_discard) {
          socket.emit("error_msg", "Lixo está vazio.");
          return;
        }
        const hand_cards = current_hand.filter((c) => card_ids.includes(c.id));

        if (hand_cards.length !== card_ids.length) {
          socket.emit("error_msg", "Cartas selecionadas inválidas.");
          return;
        }

        const combined = [...hand_cards, top_discard];
        const is_valid_pickup = validate_discard_pickup(top_discard, hand_cards);

        if (!is_valid_pickup) {
          const detail = validate_sequence(combined);
          const error_msg = !detail.is_valid ? detail.error : "O jogo formado deve ser LIMPO (sem curingas) para comprar o lixo.";
          
          console.log(`[VALIDATION FAIL] Player ${player_id} pickup discard: ${error_msg}`);
          socket.emit("error_msg", `Lixo bloqueado: ${error_msg}`);
          return;
        }

        const all_discard = [...game.discard_pile];
        game.discard_pile = [];

        // Remove from hand
        game.hands[player_id] = current_hand.filter(
          (c) => !card_ids.includes(c.id)
        );

        // Add discard rest to hand
        const rest_of_discard = all_discard.filter(
          (c) => c.id !== top_discard.id
        );
        const player_hand = game.hands[player_id];
        if (player_hand) {
            player_hand.push(...rest_of_discard);
            game.hands[player_id] = sort_cards(player_hand);
        }

        // Meld
        const team_id = get_team(player_id);
        const team_melds = game.team_melds[team_id];
        if (team_melds) {
            team_melds.push(sort_cards(combined));
        }

        game.turn_phase = "ACTION";
        const updated_hand = game.hands[player_id];

        if (updated_hand && updated_hand.length === 0) {
          if (requires_clean_to_empty_hand(game, team_id)) {
            if (!has_clean_canastra(game, team_id)) {
              socket.emit(
                "error_msg",
                "Atenção: Você bateu sem canastra limpa! (Regra violada)"
              );
            }
          }
          handle_empty_hand(game, player_id, "DIRECT");
        }

        io.to(roomId).emit("game_update", game);
      }
    );

    socket.on(
      "action_pick_up_discard_add_to_meld",
      ({
        roomId,
        meld_index,
        card_ids,
      }: {
        roomId: string;
        meld_index: number;
        card_ids: string[];
      }) => {
        const ctx = validateTurn(roomId, socket.id);
        if (!ctx) {
          socket.emit("error_msg", "Não é a sua vez.");
          return;
        }
        const { game, player_id } = ctx;

        if (game.turn_phase !== "DRAW" || game.discard_pile.length === 0) {
          socket.emit("error_msg", "Não pode comprar do lixo agora.");
          return;
        }

        const team_id = get_team(player_id);
        const team_melds = game.team_melds[team_id];
        const target_meld = team_melds?.[meld_index];
        if (!target_meld) {
          socket.emit("error_msg", "Jogo não encontrado.");
          return;
        }

        const current_hand = game.hands[player_id];
        if (!current_hand) return;

        const top_discard = game.discard_pile[0];
        if (!top_discard) {
          socket.emit("error_msg", "Lixo está vazio.");
          return;
        }
        const hand_cards = current_hand.filter((c) => card_ids.includes(c.id));

        const new_meld: Card[] = [...target_meld, ...hand_cards, top_discard];
        const validation = validate_sequence(new_meld);

        if (!validation.is_valid) {
          socket.emit(
            "error_msg",
            `Não pode adicionar ao jogo: ${validation.error}`
          );
          return;
        }

        const all_discard = [...game.discard_pile];
        game.discard_pile = [];

        game.hands[player_id] = current_hand.filter(
          (c) => !card_ids.includes(c.id)
        );

        const rest_of_discard = all_discard.filter(
          (c) => c.id !== top_discard.id
        );
        const player_hand = game.hands[player_id];
        if (player_hand) {
            player_hand.push(...rest_of_discard);
            game.hands[player_id] = sort_cards(player_hand);
        }

        if (team_melds) {
            team_melds[meld_index] = sort_cards(new_meld);
        }

        game.turn_phase = "ACTION";

        const updated_hand = game.hands[player_id];
        if (updated_hand && updated_hand.length === 0) {
          if (requires_clean_to_empty_hand(game, team_id)) {
            if (!has_clean_canastra(game, team_id)) {
              socket.emit(
                "error_msg",
                "Atenção: Você bateu sem canastra limpa! (Regra violada)"
              );
            }
          }
          handle_empty_hand(game, player_id, "DIRECT");
        }

        io.to(roomId).emit("game_update", game);
      }
    );

    socket.on(
      "action_meld",
      ({ roomId, card_ids }: { roomId: string; card_ids: string[] }) => {
        const ctx = validateTurn(roomId, socket.id);
        if (!ctx) {
          socket.emit("error_msg", "Não é a sua vez.");
          return;
        }
        const { game, player_id } = ctx;

        const current_hand = game.hands[player_id];
        if (game.turn_phase !== "ACTION" || !current_hand) {
          socket.emit("error_msg", "Não pode baixar jogo agora.");
          return;
        }

        const cards_to_meld = current_hand.filter((c) => card_ids.includes(c.id));
        if (cards_to_meld.length !== card_ids.length) {
          socket.emit("error_msg", "Cartas selecionadas não estão na mão.");
          return;
        }

        const validation = validate_sequence(cards_to_meld);
        if (!validation.is_valid) {
          socket.emit("error_msg", `Jogo inválido: ${validation.error}`);
          return;
        }

        const team_id = get_team(player_id);
        const new_hand_len = current_hand.length - card_ids.length;

        if (new_hand_len === 0) {
          if (requires_clean_to_empty_hand(game, team_id)) {
            const already_has_clean = has_clean_canastra(game, team_id);
            const this_is_clean_canastra =
              validation.is_valid &&
              (validation.canastra_type === "CLEAN" ||
                validation.canastra_type === "KING" ||
                validation.canastra_type === "ACE");

            if (!already_has_clean && !this_is_clean_canastra) {
              socket.emit(
                "error_msg",
                "Não pode bater (encerrar) sem canastra limpa."
              );
              return;
            }
          }
        }

        game.hands[player_id] = current_hand.filter(
          (c) => !card_ids.includes(c.id)
        );
        const team_melds = game.team_melds[team_id];
        if (team_melds) {
            team_melds.push(sort_cards(cards_to_meld));
        }

        const updated_hand = game.hands[player_id];
        if (updated_hand && updated_hand.length === 0) {
          handle_empty_hand(game, player_id, "DIRECT");
        }

        io.to(roomId).emit("game_update", game);
      }
    );

    socket.on(
      "action_add_to_meld",
      ({
        roomId,
        card_ids,
        meld_index,
      }: {
        roomId: string;
        card_ids: string[];
        meld_index: number;
      }) => {
        const ctx = validateTurn(roomId, socket.id);
        if (!ctx) {
          socket.emit("error_msg", "Não é a sua vez.");
          return;
        }
        const { game, player_id } = ctx;

        const current_hand = game.hands[player_id];
        const team_id = get_team(player_id);
        const team_melds = game.team_melds[team_id];

        if (game.turn_phase !== "ACTION" || !current_hand || !team_melds) {
          socket.emit("error_msg", "Não pode baixar jogo agora.");
          return;
        }

        const target_meld = team_melds[meld_index];
        if (!target_meld) {
          socket.emit("error_msg", "Jogo alvo não encontrado.");
          return;
        }

        const cards_to_add = current_hand.filter((c) => card_ids.includes(c.id));
        if (cards_to_add.length !== card_ids.length) {
          socket.emit("error_msg", "Cartas não estão na mão.");
          return;
        }

        const new_meld = [...target_meld, ...cards_to_add];
        const validation = validate_sequence(new_meld);
        if (!validation.is_valid) {
          socket.emit("error_msg", `Não pode adicionar: ${validation.error}`);
          return;
        }

        const new_hand_len = current_hand.length - card_ids.length;
        if (new_hand_len === 0) {
          if (requires_clean_to_empty_hand(game, team_id)) {
            const already_has_clean = has_clean_canastra(game, team_id);
            const this_will_be_clean =
              validation.is_valid &&
              (validation.canastra_type === "CLEAN" ||
                validation.canastra_type === "KING" ||
                validation.canastra_type === "ACE");

            if (!already_has_clean && !this_will_be_clean) {
              socket.emit(
                "error_msg",
                "Não pode bater (encerrar) sem canastra limpa."
              );
              return;
            }
          }
        }

        game.hands[player_id] = current_hand.filter(
          (c) => !card_ids.includes(c.id)
        );
        team_melds[meld_index] = sort_cards(new_meld);

        const updated_hand = game.hands[player_id];
        if (updated_hand && updated_hand.length === 0) {
          handle_empty_hand(game, player_id, "DIRECT");
        }
        io.to(roomId).emit("game_update", game);
      }
    );

    socket.on(
      "action_discard",
      ({ roomId, card_id }: { roomId: string; card_id: string }) => {
        const ctx = validateTurn(roomId, socket.id);
        if (!ctx) {
          socket.emit("error_msg", "Não é a sua vez.");
          return;
        }
        const { game, player_id } = ctx;

        const current_hand = game.hands[player_id];
        if (game.turn_phase !== "ACTION" || !current_hand) {
          socket.emit("error_msg", "Não pode descartar agora.");
          return;
        }

        const card_to_discard = current_hand.find((c) => c.id === card_id);
        if (!card_to_discard) return;

        const team_id = get_team(player_id);
        const new_hand_len = current_hand.length - 1;

        if (new_hand_len === 0) {
          if (requires_clean_to_empty_hand(game, team_id)) {
            if (!has_clean_canastra(game, team_id)) {
              socket.emit(
                "error_msg",
                "Não pode bater (encerrar) sem canastra limpa."
              );
              return;
            }
          }
        }

        game.hands[player_id] = current_hand.filter((c) => c.id !== card_id);
        game.discard_pile.unshift(card_to_discard);

        const updated_hand = game.hands[player_id];
        if (updated_hand && updated_hand.length === 0) {
          handle_empty_hand(game, player_id, "INDIRECT");
        }

        if (game.status !== "FINISHED") {
          game.turn_phase = "DRAW";
          game.current_player = get_next_player(game.current_player, game.mode);
          
          const nextPData = game.players_data[game.current_player as PlayerID];
          if (nextPData && nextPData.isBot) {
              process_bot_turn(roomId);
          }
        }

        io.to(roomId).emit("game_update", game);
      }
    );

    socket.on("action_sort_hand", ({ roomId }: { roomId: string }) => {
      const game = games[roomId];
      if (!game) return;

      const playerIndex = game.players_connected.indexOf(socket.id);
      if (playerIndex === -1) return;
      const player_id = (playerIndex + 1) as PlayerID;

      const current_hand = game.hands[player_id];

      if (current_hand) {
        // Manual sort now randomizes suit order to allow user customization
        game.hands[player_id] = sort_cards(current_hand, true);
        io.to(roomId).emit("game_update", game);
      }
    });

    socket.on("leave_game", ({ roomId }: { roomId: string }) => {
    const game = games[roomId];
    if (!game) return;

    console.log(`Player ${socket.id} leaving room ${roomId}`);

    const playerIdx = game.players_connected.indexOf(socket.id);
    if (playerIdx !== -1) {
      game.players_connected.splice(playerIdx, 1);
    }

    socket.leave(roomId);

    if (game.players_connected.length === 0) {
      console.log(`Room ${roomId} is empty. Deleting game.`);
      delete games[roomId];
    } else {
      io.to(roomId).emit("game_update", game);
    }
  });
});

console.log("Servidor rodando na porta 3000");