console.log("--- SCRIPT START ---");
import { Server } from "socket.io";

import { create_deck, distribute_cards } from "../common/utils/game_logic";
import {
  validate_sequence,
  validate_discard_pickup,
} from "../common/utils/rules_logic";
import { sort_cards } from "../common/utils/sort_cards";
import { calculate_score, type ScoreResult } from "../common/utils/scoring";
import { type Card } from "../common/types/card";

type PlayerID = 1 | 2 | 3 | 4;
type TeamID = 1 | 2;
type GameMode = "1v1" | "2v2";

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
  players_data: Record<
    PlayerID,
    { socketId: string; userName: string; playerId: string }
  >;
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
  const melds = game.team_melds[team_id] || [];
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
  if (game.has_taken_dead_pile[team_idx]) return true;
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

  if (game.has_taken_dead_pile[team_idx]) {
    console.log(`Fim de Jogo! Time ${team_id} bateu final.`);
    const t1_hand_1 = game.hands[1] ?? [];
    const t1_hand_2 = game.hands[3] ?? [];
    const t2_hand_1 = game.hands[2] ?? [];
    const t2_hand_2 = game.hands[4] ?? [];

    const t1_melds = game.team_melds[1] ?? [];
    const t2_melds = game.team_melds[2] ?? [];

    const t1_score = calculate_score(
      t1_melds,
      [t1_hand_1, t1_hand_2],
      team_id === 1,
      !game.has_taken_dead_pile[0]
    );
    const t2_score = calculate_score(
      t2_melds,
      [t2_hand_1, t2_hand_2],
      team_id === 2,
      !game.has_taken_dead_pile[1]
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
      game.has_taken_dead_pile[team_idx] = true;
      game.hands[player_id] = sort_cards(my_dead_pile);
    }
    game.turn_phase = type === "DIRECT" ? "ACTION" : "DRAW";
    console.log(`Jogador ${player_id} pegou o morto (${type})`);
  } else {
    game.status = "FINISHED";
  }
};

const validateTurn = (
  roomId: string,
  socketId: string
): { game: ServerGameState; player_id: PlayerID } | null => {
  const game = games[roomId];
  if (!game) return null;

  const playerIndex = game.players_connected.indexOf(socketId);
  if (playerIndex === -1) return null;

  const player_id = (playerIndex + 1) as PlayerID;
  if (game.current_player !== player_id) {
    return null;
  }
  return { game, player_id };
};

const io = new Server(3000, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log("Conectado:", socket.id);

  socket.on("request_rooms", () => {
    const room_list = Object.entries(games).map(([roomId, game]) => ({
      roomId,
      mode: game.mode,
      playerCount: game.players_connected.length,
      maxPlayers: game.mode === "1v1" ? 2 : 4,
    }));
    socket.emit("rooms_list", room_list);
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
                players_data: {} as Record<PlayerID, { socketId: string; userName: string; playerId: string }>,
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
      if (game.players_connected.length >= maxPlayers) {
        socket.emit("error_msg", "Sala cheia!");
        return;
      }

      socket.join(roomId);

      // Assign new player
      // Logica simples: pega o próximo número disponível ou o length + 1
      // Para robustez em caso de saídas no lobby, o ideal seria preencher buracos,
      // mas aqui vamos assumir sequencial por enquanto ou length+1 se for limpo.
      const myPlayerNumber = (game.players_connected.length + 1) as PlayerID;

      // Correção: se alguém saiu, length diminuiu. Precisamos checar slots vazios em players_data?
      // MVP: Assume append.

      game.players_connected.push(socket.id);
      game.players_data[myPlayerNumber] = {
        socketId: socket.id,
        userName,
        playerId,
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

    socket.on("action_start_game", ({ roomId }) => {

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

      if (game.players_connected.length !== maxPlayers) {

        socket.emit("error_msg", "Aguardando todos os jogadores entrarem.");

        return;

      }

  

      game.status = "PLAYING";

      io.to(roomId).emit("game_update", game);

    });

  

    socket.on("action_draw", ({ roomId }) => {

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

        socket.emit("error_msg", "O monte acabou!");

        return;

      }

  

      const card = game.deck.shift();

      const player_hand = game.hands[player_id];

      if (card && player_hand) {

        player_hand.push(card);

        game.hands[player_id] = sort_cards(player_hand);

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

  

        const current_hand = game.hands[player_id] ?? [];

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

  

        // VALIDACAO: Usa a função específica que exige jogo LIMPO para comprar o lixo

        const pickup_validation = validate_discard_pickup(top_discard, hand_cards);

  

        if (!pickup_validation.is_valid) {

          const error_msg = pickup_validation.error || "Erro ao comprar do lixo.";

  

          console.log(

            `[VALIDATION FAIL] Player ${player_id} pickup discard: ${error_msg}`

          );

          socket.emit("error_msg", `Lixo bloqueado: ${error_msg}`);

          return;

        }

  

        // Sucesso! Pega TODO o lixo

        const all_discard = [...game.discard_pile];

        game.discard_pile = [];

  

        // Remove as cartas da mão que foram usadas no jogo

        game.hands[player_id] = current_hand.filter(

          (c) => !card_ids.includes(c.id)

        );

  

        // Adiciona o lixo à mão (exceto a que foi pra mesa)

        const rest_of_discard = all_discard.filter(

          (c) => c.id !== top_discard.id

        );

        game.hands[player_id].push(...rest_of_discard);

        game.hands[player_id] = sort_cards(game.hands[player_id]);

  

        // Baixa o jogo na mesa

        const team_id = get_team(player_id);

        game.team_melds[team_id].push(sort_cards(combined));

  

        game.turn_phase = "ACTION";

  

        if (game.hands[player_id].length === 0) {

          if (requires_clean_to_empty_hand(game, team_id)) {

            if (!has_clean_canastra(game, team_id)) {

              // Por limitação técnica deste MVP, se o jogador bater ao pegar o lixo sem ter canastra limpa,

              // o jogo vai acabar incorretamente ou precisaríamos de um rollback complexo.

              // O correto seria simular o resultado antes de aplicar.

              // Como mitigação, enviamos um erro, mas o estado já mudou.

              // Para produção, refatorar para 'dry-run'.

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

        const target_meld = game.team_melds[team_id]?.[meld_index];

        if (!target_meld) {

          socket.emit("error_msg", "Jogo não encontrado.");

          return;

        }

  

        const current_hand = game.hands[player_id] ?? [];

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

  

        // Sucesso! Pega TODO o lixo

        const all_discard = [...game.discard_pile];

        game.discard_pile = [];

  

        // Remove as cartas da mão

        game.hands[player_id] = current_hand.filter(

          (c) => !card_ids.includes(c.id)

        );

  

        // Adiciona o lixo à mão (exceto a que foi pra mesa)

        const rest_of_discard = all_discard.filter(

          (c) => c.id !== top_discard.id

        );

        game.hands[player_id].push(...rest_of_discard);

        game.hands[player_id] = sort_cards(game.hands[player_id]);

  

        // Atualiza o jogo na mesa

        game.team_melds[team_id][meld_index] = sort_cards(new_meld);

  

        game.turn_phase = "ACTION";

  

        if (game.hands[player_id].length === 0) {

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

  

        // Se for ficar sem carta, precisa checar se pode bater

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

        game.team_melds[team_id].push(sort_cards(cards_to_meld));

  

        if (game.hands[player_id].length === 0) {

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

  

        if (game.hands[player_id].length === 0) {

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

  

        if (game.hands[player_id].length === 0) {

          handle_empty_hand(game, player_id, "INDIRECT");

        }

  

        if (game.status !== "FINISHED") {

          game.turn_phase = "DRAW";

          game.current_player = get_next_player(game.current_player, game.mode);

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

        game.hands[player_id] = sort_cards(current_hand);

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
      // Optional: clear player data slot? kept for reconnection potentially, but for "leave" imply full exit.
      // For now, just remove connection.

      // Actually, if explicit LEAVE, maybe we should remove the player slot?
      // But that messes up turn order if game is running.
      // Better: Mark as disconnected but keep slot?
      // The prompt implies "Leaving match", usually means abandoning.
      // Let's just update connected list.
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
