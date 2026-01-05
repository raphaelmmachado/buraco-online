console.log("--- SCRIPT START ---");
import { Server } from "socket.io";

import { create_deck, distribute_cards } from "../common/utils/game_logic";
import { validate_sequence } from "../common/utils/rules_logic";
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
  players_data: Record<PlayerID, { socketId: string; userName: string }>;
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

const handle_empty_hand = (game: ServerGameState, player_id: PlayerID, type: "DIRECT" | "INDIRECT") => {
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

    const t1_score = calculate_score(t1_melds, [t1_hand_1, t1_hand_2], team_id === 1);
    const t2_score = calculate_score(t2_melds, [t2_hand_1, t2_hand_2], team_id === 2);

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

const validateTurn = (roomId: string, socketId: string): { game: ServerGameState; player_id: PlayerID } | null => {
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

  socket.on("join_game", ({ roomId, mode, userName }: { roomId: string; mode: GameMode; userName: string }) => {
    if (!games[roomId]) {
      console.log(`Criando sala ${roomId} [${mode}]`);
      const deck = create_deck();
      const setup = distribute_cards(deck, mode);
      games[roomId] = {
        mode,
        status: "PLAYING",
        deck: setup.remaining_deck,
        discard_pile: [],
        hands: setup.hands,
        team_melds: { 1: [], 2: [] },
        dead_piles: setup.dead_piles,
        has_taken_dead_pile: [false, false],
        turn_phase: "DRAW",
        current_player: 1,
        players_connected: [],
        players_data: {} as Record<PlayerID, { socketId: string; userName: string; }>,
        final_score: null,
      };
    }

    const game = games[roomId];
    if (!game) return; // Type guard

    const maxPlayers = game.mode === "1v1" ? 2 : 4;
    if (game.players_connected.length >= maxPlayers && !game.players_connected.includes(socket.id)) {
      socket.emit("error_msg", "Sala cheia!");
      return;
    }

    socket.join(roomId);
    
    let myPlayerNumber = (game.players_connected.indexOf(socket.id) + 1) as PlayerID;

    if (!game.players_connected.includes(socket.id)) {
      game.players_connected.push(socket.id);
      myPlayerNumber = game.players_connected.length as PlayerID;
      game.players_data[myPlayerNumber] = { socketId: socket.id, userName };
    }
    
    const player_data = game.players_data[myPlayerNumber];
    socket.emit("player_assignment", myPlayerNumber, player_data?.userName ?? "??");

    io.to(roomId).emit("game_update", game);
  });

  socket.on("action_draw", ({ roomId }) => {
    const ctx = validateTurn(roomId, socket.id);
    if (!ctx) return;
    const { game, player_id } = ctx;

    if (game.turn_phase !== "DRAW" || game.deck.length === 0) return;

    const card = game.deck.shift();
    const player_hand = game.hands[player_id];
    if (card && player_hand) {
      player_hand.push(card);
      game.hands[player_id] = sort_cards(player_hand);
      game.turn_phase = "ACTION";
      io.to(roomId).emit("game_update", game);
    }
  });

  socket.on("action_meld", ({ roomId, card_ids }: { roomId: string; card_ids: string[] }) => {
    const ctx = validateTurn(roomId, socket.id);
    if (!ctx) return;
    const { game, player_id } = ctx;

    const current_hand = game.hands[player_id];
    if (game.turn_phase !== "ACTION" || !current_hand) return;

    const cards_to_meld = current_hand.filter((c) => card_ids.includes(c.id));
    if (cards_to_meld.length !== card_ids.length || !validate_sequence(cards_to_meld).is_valid) return;

    game.hands[player_id] = current_hand.filter((c) => !card_ids.includes(c.id));
    
    const team_id = get_team(player_id);
    const team_melds = game.team_melds[team_id];
    if(team_melds) {
      team_melds.push(sort_cards(cards_to_meld));
    }

    if ((game.hands[player_id]?.length ?? 0) === 0) {
      handle_empty_hand(game, player_id, "DIRECT");
    }

    io.to(roomId).emit("game_update", game);
  });

  socket.on("action_add_to_meld", ({ roomId, card_ids, meld_index }: { roomId: string; card_ids: string[]; meld_index: number; }) => {
    const ctx = validateTurn(roomId, socket.id);
    if (!ctx) return;
    const { game, player_id } = ctx;

    const current_hand = game.hands[player_id];
    const team_id = get_team(player_id);
    const team_melds = game.team_melds[team_id];

    if (game.turn_phase !== "ACTION" || !current_hand || !team_melds) return;
    
    const target_meld = team_melds[meld_index];
    if (!target_meld) return;

    const cards_to_add = current_hand.filter((c) => card_ids.includes(c.id));
    const new_meld = [...target_meld, ...cards_to_add];
    if (validate_sequence(new_meld).is_valid) {
      game.hands[player_id] = current_hand.filter((c) => !card_ids.includes(c.id));
      team_melds[meld_index] = sort_cards(new_meld);

      if ((game.hands[player_id]?.length ?? 0) === 0) {
        handle_empty_hand(game, player_id, "DIRECT");
      }
      io.to(roomId).emit("game_update", game);
    }
  });

  socket.on("action_discard", ({ roomId, card_id }: { roomId: string; card_id: string }) => {
    const ctx = validateTurn(roomId, socket.id);
    if (!ctx) return;
    const { game, player_id } = ctx;

    const current_hand = game.hands[player_id];
    if (game.turn_phase !== "ACTION" || !current_hand) return;

    const card_to_discard = current_hand.find((c) => c.id === card_id);
    if (!card_to_discard) return;
    
    game.hands[player_id] = current_hand.filter((c) => c.id !== card_id);
    game.discard_pile.unshift(card_to_discard);

    if ((game.hands[player_id]?.length ?? 0) === 0) {
      handle_empty_hand(game, player_id, "INDIRECT");
    }

    if (game.status !== "FINISHED") {
      game.turn_phase = "DRAW";
      game.current_player = get_next_player(game.current_player, game.mode);
    }

    io.to(roomId).emit("game_update", game);
  });
});

console.log("Servidor rodando na porta 3000");
