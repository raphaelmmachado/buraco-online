import { Server, Socket } from "socket.io";

// --- IMPORTS (Certifique-se que os arquivos existem em ./utils e ./types) ---
import { create_deck, distribute_cards } from "./utils/game_logic";
import { validate_sequence } from "./utils/rules_logic";
import { sort_cards } from "./utils/sort_cards";
import { calculate_score, type ScoreResult } from "./utils/scoring"; // Importe a tipagem de score
import { type Card } from "./types/card";

// --- TIPAGEM GLOBAL ---
type PlayerID = 1 | 2 | 3 | 4;
type TeamID = 1 | 2;
type GameMode = "1v1" | "2v2";

// --- INTERFACE DO ESTADO (Fonte da Verdade) ---
interface ServerGameState {
  mode: GameMode;
  status: "LOBBY" | "PLAYING" | "FINISHED";

  deck: Card[];
  discard_pile: Card[];
  dead_piles: Card[][];

  hands: Record<number, Card[]>;
  team_melds: Record<TeamID, Card[][]>;

  has_taken_dead_pile: [boolean, boolean]; // [Time 1, Time 2]

  turn_phase: "DRAW" | "ACTION" | "DISCARD";
  current_player: number;
  players_connected: string[];

  final_score: {
    team_1: number;
    team_2: number;
    details_t1: ScoreResult;
    details_t2: ScoreResult;
  } | null;
}

// --- BANCO DE DADOS EM MEMÓRIA ---
const games: Record<string, ServerGameState> = {};

// --- HELPERS (Lógica Auxiliar) ---

const get_team = (player_id: number): TeamID => {
  return player_id % 2 !== 0 ? 1 : 2;
};

const get_next_player = (current: number, mode: GameMode): number => {
  if (mode === "1v1") return current === 1 ? 2 : 1;
  return (current % 4) + 1; // 1->2->3->4->1
};

// Lógica crítica: Pegar o morto ou Encerrar o jogo
const handle_empty_hand = (
  game: ServerGameState,
  player_id: number,
  type: "DIRECT" | "INDIRECT"
) => {
  const team_id = get_team(player_id);
  const team_idx = team_id - 1;

  // 1. FIM DE JOGO
  if (game.has_taken_dead_pile[team_idx]) {
    console.log(`Fim de Jogo! Time ${team_id} bateu final.`);

    // CORREÇÃO: Adicionado '|| []' para garantir que não seja undefined
    const t1_hand_1 = game.hands[1] || [];
    const t1_hand_2 = game.hands[3] || [];
    const t2_hand_1 = game.hands[2] || [];
    const t2_hand_2 = game.hands[4] || [];

    const t1_score = calculate_score(
      game.team_melds[1],
      [t1_hand_1, t1_hand_2],
      team_id === 1
    );
    const t2_score = calculate_score(
      game.team_melds[2],
      [t2_hand_1, t2_hand_2],
      team_id === 2
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

  // 2. PEGAR MORTO
  if (game.dead_piles.length > 0) {
    const [my_dead_pile, ...remaining] = game.dead_piles;

    game.has_taken_dead_pile[team_idx] = true;

    // CORREÇÃO: Garante que my_dead_pile existe antes de ordenar
    if (my_dead_pile) {
      game.hands[player_id] = sort_cards(my_dead_pile);
    }

    game.dead_piles = remaining;
    game.turn_phase = type === "DIRECT" ? "ACTION" : "DRAW";

    console.log(`Jogador ${player_id} pegou o morto (${type})`);
  } else {
    game.status = "FINISHED";
  }
};

const validateTurn = (
  roomId: string,
  socketId: string
): { game: ServerGameState; player_id: number } | null => {
  const game = games[roomId];
  if (!game) return null;
  const playerIndex = game.players_connected.indexOf(socketId);
  if (playerIndex === -1) return null;
  const player_id = playerIndex + 1;

  if (game.current_player !== player_id) {
    // console.log(`Bloqueio: Vez de ${game.current_player}, mas ${player_id} tentou.`);
    return null;
  }
  return { game, player_id };
};

// --- SERVIDOR ---
const io = new Server(3000, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log("Conectado:", socket.id);

  // 1. JOIN GAME
  socket.on(
    "join_game",
    ({ roomId, mode }: { roomId: string; mode: GameMode }) => {
      if (!games[roomId]) {
        console.log(`Criando sala ${roomId} [${mode}]`);
        const deck = create_deck();
        const setup = distribute_cards(deck, mode);

        // Ordenar mãos iniciais
        // Ordenar mãos iniciais
        const sorted_hands: Record<number, Card[]> = {};
        Object.keys(setup.hands).forEach((k) => {
          const key = Number(k);
          // CORREÇÃO: Adicionado '!' pois sabemos que a chave vem do próprio objeto setup.hands
          sorted_hands[key] = sort_cards(setup.hands[key]!);
        });

        games[roomId] = {
          mode,
          status: "PLAYING",
          deck: setup.remaining_deck,
          discard_pile: [],
          hands: sorted_hands,
          team_melds: { 1: [], 2: [] },
          dead_piles: setup.dead_piles,
          has_taken_dead_pile: [false, false], // Inicializa flag
          turn_phase: "DRAW",
          current_player: 1,
          players_connected: [],
          final_score: null,
        };
      }

      const game = games[roomId];
      const maxPlayers = game.mode === "1v1" ? 2 : 4;

      if (
        game.players_connected.length >= maxPlayers &&
        !game.players_connected.includes(socket.id)
      ) {
        socket.emit("error_msg", "Sala cheia!");
        return;
      }

      socket.join(roomId);

      if (!game.players_connected.includes(socket.id)) {
        game.players_connected.push(socket.id);
      }

      const myPlayerNumber = game.players_connected.indexOf(socket.id) + 1;
      socket.emit("player_assignment", myPlayerNumber);
      io.to(roomId).emit("game_update", game);
    }
  );

  // 2. ACTION: DRAW
  socket.on("action_draw", ({ roomId }) => {
    const ctx = validateTurn(roomId, socket.id);
    if (!ctx) return;
    const { game, player_id } = ctx;

    if (game.turn_phase !== "DRAW") return;

    // Se deck vazio, tenta virar morto (simplificado) ou acaba jogo
    if (game.deck.length === 0) {
      // Lógica de deck vazio aqui...
      return;
    }

    const card = game.deck.shift();
    // CORREÇÃO: Verifica se a mão existe antes de acessar
    if (card && game.hands[player_id]) {
      game.hands[player_id]!.push(card); // Adicionado '!'

      // Ordena mão após compra
      game.hands[player_id] = sort_cards(game.hands[player_id]!); // Adicionado '!'

      game.turn_phase = "ACTION";
      io.to(roomId).emit("game_update", game);
    }
  });

  // 3. ACTION: MELD (Baixar Jogo)
  socket.on(
    "action_meld",
    ({ roomId, card_ids }: { roomId: string; card_ids: string[] }) => {
      const ctx = validateTurn(roomId, socket.id);
      if (!ctx) return;
      const { game, player_id } = ctx;

      if (game.turn_phase !== "ACTION") return;

      const current_hand = game.hands[player_id];
      if (!current_hand) return console.error("current_hand é nulo");
      const cards_to_meld = current_hand.filter((c) => card_ids.includes(c.id));

      if (cards_to_meld.length !== card_ids.length) return; // Segurança

      const validation = validate_sequence(cards_to_meld);
      if (!validation.is_valid) return;

      // Remove da mão
      // CORREÇÃO: Usa '!' ou fallback
      game.hands[player_id] = current_hand.filter(
        (c) => !card_ids.includes(c.id)
      );

      // Adiciona na mesa
      const team_id = get_team(player_id);
      game.team_melds[team_id].push(sort_cards(cards_to_meld));

      // Checa Batida Direta
      // CORREÇÃO: Adicionado '!'
      if (game.hands[player_id]!.length === 0) {
        handle_empty_hand(game, player_id, "DIRECT");
      }

      io.to(roomId).emit("game_update", game);
    }
  );

  // 4. ACTION: ADD TO MELD (Encaixar)
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
      if (!ctx) return;
      const { game, player_id } = ctx;

      if (game.turn_phase !== "ACTION") return;

      const team_id = get_team(player_id);
      const target_meld = game.team_melds[team_id][meld_index];
      if (!target_meld) return;

      const current_hand = game.hands[player_id];
      if (!current_hand) return console.error("current_hand é nulo");
      const cards_to_add = current_hand.filter((c) => card_ids.includes(c.id));

      const new_meld = [...target_meld, ...cards_to_add];
      if (validate_sequence(new_meld).is_valid) {
        // CORREÇÃO: Adicionado fallback ou lógica segura
        game.hands[player_id] = current_hand.filter(
          (c) => !card_ids.includes(c.id)
        );

        game.team_melds[team_id][meld_index] = sort_cards(new_meld);

        // CORREÇÃO: Adicionado '!'
        if (game.hands[player_id]!.length === 0) {
          handle_empty_hand(game, player_id, "DIRECT");
        }
        io.to(roomId).emit("game_update", game);
      }
    }
  );

  // 5. ACTION: DISCARD
  socket.on(
    "action_discard",
    ({ roomId, card_id }: { roomId: string; card_id: string }) => {
      const ctx = validateTurn(roomId, socket.id);
      if (!ctx) return;
      const { game, player_id } = ctx;

      if (game.turn_phase !== "ACTION") return;

      const current_hand = game.hands[player_id];
      if (!current_hand) return console.error("current_hand é nulo");
      const card = current_hand.find((c) => c.id === card_id);
      if (!card) return;

      // Remove da mão e joga no lixo
      game.hands[player_id] = current_hand.filter((c) => c.id !== card_id);
      game.discard_pile.unshift(card);

      // Checa Batida Indireta
      if (game.hands[player_id].length === 0) {
        handle_empty_hand(game, player_id, "INDIRECT");
      }

      // Se o jogo NÃO acabou, passa a vez
      if (game.status !== "FINISHED") {
        game.turn_phase = "DRAW";
        game.current_player = get_next_player(game.current_player, game.mode);
      }

      io.to(roomId).emit("game_update", game);
    }
  );
});

console.log("Servidor rodando na porta 3000");
