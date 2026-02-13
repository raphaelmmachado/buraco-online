import { create_deck, distribute_cards } from "../../common/utils/game_logic";
import { calculate_score, type ScoreResult } from "../../common/utils/scoring";
import { sort_cards } from "../../common/utils/sort_cards";
import { validate_sequence } from "../../common/utils/rules_logic";
import { type ServerGameState } from "../state";
import { type PlayerID, type TeamID, type GameMode } from "../types";
import { type Card } from "../../common/types/card";
export const get_team = (player_id: number): TeamID => {
  return (player_id % 2 !== 0 ? 1 : 2) as TeamID;
};

export const get_next_player = (
  current: number,
  mode: GameMode,
  direction: 1 | -1 = 1,
): number => {
  if (mode === "1v1") return current === 1 ? 2 : 1;
  // No modo 2v2 (4 jogadores), usamos a direção
  let next = current + direction;
  if (next > 4) next = 1;
  if (next < 1) next = 4;
  return next;
};

export const has_clean_canastra = (
  game: ServerGameState,
  team_id: TeamID
): boolean => {
  const melds = game.team_melds[team_id];
  if (!melds) return false;

  return melds.some((meld) => {
    const val = validate_sequence(meld);
    if (!val.is_valid) return false;
    return (
      val.canastra_type === "CLEAN" ||
      val.canastra_type === "KING" ||
      val.canastra_type === "ACE"
    );
  });
};

export const requires_clean_to_empty_hand = (
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

export const check_championship_status = (
  game: ServerGameState,
  t1_round_score: number,
  t2_round_score: number,
  details_t1: ScoreResult,
  details_t2: ScoreResult
) => {
  // Update cumulative score
  if (!game.cumulative_score) {
    game.cumulative_score = { team_1: 0, team_2: 0 };
  }
  game.cumulative_score.team_1 += t1_round_score;
  game.cumulative_score.team_2 += t2_round_score;

  game.final_score = {
    team_1: t1_round_score,
    team_2: t2_round_score,
    details_t1: details_t1,
    details_t2: details_t2,
  };

  if (!game.win_condition) {
    // Classic mode: Game ends after one round
    game.status = "FINISHED";
    return;
  }

  const { type, value } = game.win_condition;
  let isChampionshipOver = false;

  if (type === "POINTS") {
    if (
      game.cumulative_score.team_1 >= value ||
      game.cumulative_score.team_2 >= value
    ) {
        // Verifica se há empate acima da meta (ex: 3100 vs 3100). Se sim, continua mais uma rodada?
        // Regra padrão: Quem tiver mais ganha. Se empate, joga mais uma.
        if (game.cumulative_score.team_1 !== game.cumulative_score.team_2) {
             isChampionshipOver = true;
        }
    }
  } else if (type === "ROUNDS") {
    // Current round is already finished, so check if we reached the limit
    // round_count starts at 1
    if (game.round_count >= value) {
      isChampionshipOver = true;
    }
  }

  if (isChampionshipOver) {
    game.status = "FINISHED";
  } else {
    game.status = "ROUND_OVER";
  }
};

export const start_next_round = (game: ServerGameState) => {
    game.round_count += 1;
    game.status = "PLAYING";
    
    // Create new deck and distribute
    const deck = create_deck(game.rules);
    const setup = distribute_cards(deck, game.mode);

    // Sort hands
    const sorted_hands: Record<number, Card[]> = {};
    Object.entries(setup.hands).forEach(([id, hand]) => {
        sorted_hands[Number(id)] = sort_cards(hand);
    });

    // Reset Game State
    game.deck = setup.remaining_deck;
    game.discard_pile = [];
    game.hands = sorted_hands;
    game.team_melds = { 1: [], 2: [] };
    game.dead_piles = setup.dead_piles;
    game.has_taken_dead_pile = [false, false];
    game.magic_joker = {
        direction: 1,
        is_discard_frozen: false,
    };
    game.turn_phase = "DRAW";
    game.current_player = 1; // Or rotate starter? For now, Player 1 starts always.
    game.last_drawn_card_id = null;
    game.final_score = null;
    
    const firstPlayer = game.players_data[1];
    game.turn_start_time = (firstPlayer && firstPlayer.isBot) ? undefined : Date.now();
    
    game.rematch_votes = {};
};

export const start_new_match = (game: ServerGameState) => {
    // Reset scores
    game.cumulative_score = { team_1: 0, team_2: 0 };
    game.round_count = 1;
    game.status = "PLAYING";
    
    const deck = create_deck(game.rules);
    const setup = distribute_cards(deck, game.mode);

    const sorted_hands: Record<number, Card[]> = {};
    Object.entries(setup.hands).forEach(([id, hand]) => {
        sorted_hands[Number(id)] = sort_cards(hand);
    });

    game.deck = setup.remaining_deck;
    game.discard_pile = [];
    game.hands = sorted_hands;
    game.team_melds = { 1: [], 2: [] };
    game.dead_piles = setup.dead_piles;
    game.has_taken_dead_pile = [false, false];
    game.magic_joker = {
        direction: 1,
        is_discard_frozen: false,
    };
    game.turn_phase = "DRAW";
    game.current_player = 1;
    game.last_drawn_card_id = null;
    game.final_score = null;

    const firstPlayer = game.players_data[1];
    game.turn_start_time = (firstPlayer && firstPlayer.isBot) ? undefined : Date.now();

    game.rematch_votes = {};
};

export const handle_empty_hand = (
  game: ServerGameState,
  player_id: PlayerID,
  type: "DIRECT" | "INDIRECT"
) => {
  const team_id = get_team(player_id);
  const team_idx = (team_id - 1) as 0 | 1;

  const has_taken = game.has_taken_dead_pile[team_idx];

  // Regra customizada: Se o time já pegou o morto, mas a regra permite pegar os dois, 
  // e ainda há mortos disponíveis, o jogador pode pegar.
  const can_take_extra_dead_pile = 
    has_taken && 
    game.rules.teamCanTakeBothDeadPiles && 
    game.dead_piles.length > 0;

  // Common variables for score calculation
  const t1_hand_1 = game.hands[1] ?? [];
  const t1_hand_2 = game.hands[3] ?? [];
  const t2_hand_1 = game.hands[2] ?? [];
  const t2_hand_2 = game.hands[4] ?? [];

  const t1_melds = game.team_melds[1] ?? [];
  const t2_melds = game.team_melds[2] ?? [];

  if (has_taken && !can_take_extra_dead_pile) {
    const t1_taken = game.has_taken_dead_pile[0];
    const t2_taken = game.has_taken_dead_pile[1];

    console.log(
      `[GAME END] Calculating score. T1 Taken: ${t1_taken}, T2 Taken: ${t2_taken}`
    );

    const t1_score = calculate_score(
      t1_melds,
      [t1_hand_1, t1_hand_2],
      team_id === 1,
      !t1_taken,
      game.rules
    );
    const t2_score = calculate_score(
      t2_melds,
      [t2_hand_1, t2_hand_2],
      team_id === 2,
      !t2_taken,
      game.rules
    );

    check_championship_status(game, t1_score.total_score, t2_score.total_score, t1_score, t2_score);
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
    // Fim de jogo: Não tem morto para pegar
    console.log(`Fim de Jogo! Sem mortos disponíveis.`);
    calculate_game_end_score(game);
  }
};

/**
 * Calcula o placar final quando o deck acaba ou o jogo termina sem batida direta.
 */
export const calculate_game_end_score = (game: ServerGameState) => {
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
    false,
    !t1_taken,
    game.rules,
  );
  const t2_score = calculate_score(
    t2_melds,
    [t2_hand_1, t2_hand_2],
    false,
    !t2_taken,
    game.rules,
  );

  check_championship_status(
    game,
    t1_score.total_score,
    t2_score.total_score,
    t1_score,
    t2_score,
  );
};

export const get_player_id_by_socket = (
  game: ServerGameState,
  socketId: string
): PlayerID | null => {
  for (const [id, data] of Object.entries(game.players_data)) {
    if (data.socketId === socketId) return Number(id) as PlayerID;
  }
  console.log(`[DEBUG] get_player_id_by_socket: Socket ${socketId} não encontrado nos players_data da sala.`, Object.values(game.players_data).map(p => p.socketId));
  return null;
};

export const validateTurn = (
  game: ServerGameState,
  socketId: string,
  playerId?: string
): { player_id: PlayerID } | null => {
  // Se o socketId for "BOT", validamos apenas se o current player é um bot
  if (socketId === "BOT") {
    const pData = game.players_data[game.current_player as PlayerID];
    if (pData && pData.isBot) {
      return { player_id: game.current_player as PlayerID };
    }
    return null;
  }

  let player_id = get_player_id_by_socket(game, socketId);
  
  // Se não achou pelo socket, tenta pelo playerId persistente
  if (!player_id && playerId) {
      const entry = Object.entries(game.players_data).find(([, p]) => p.playerId === playerId);
      if (entry) {
          player_id = Number(entry[0]) as PlayerID;
          // Aproveita para atualizar o socketId se for diferente (convergência rápida)
          if (entry[1].socketId !== socketId) {
              console.log(`[AUTH] Atualizando socketId de ${entry[1].userName} via playerId durante ação.`);
              entry[1].socketId = socketId;
          }
      }
  }

  if (!player_id || game.current_player !== player_id) {
    return null;
  }
  return { player_id };
};

/**
 * Filtra o estado do jogo para um socket específico.
 * Remove cartas de adversários, deck real e mortos reais.
 */
export const sanitize_state = (
  game: ServerGameState,
  targetSocketId: string
) => {
  const sanitizedHands: Record<number, Card[] | number> = {};
  const myPlayerId = get_player_id_by_socket(game, targetSocketId);

  // Para cada jogador, decide se envia as cartas ou apenas a contagem
  Object.keys(game.hands).forEach((idStr) => {
    const id = Number(idStr);
    
    // Regra: Eu vejo minha própria mão
    const isMe = id === myPlayerId;
    
    // Regra: Eu vejo a mão do alvo se eu estiver usando um poder de seleção
    const isPowerTarget = 
      game.magic_joker.power_selection?.player_id === myPlayerId && 
      game.magic_joker.power_selection?.target_player_id === id;

    if (isMe || isPowerTarget) {
      sanitizedHands[id] = game.hands[id] || [];
    } else {
      sanitizedHands[id] = game.hands[id]?.length || 0;
    }
  });

  return {
    mode: game.mode,
    status: game.status,
    deck_count: game.deck.length, // Otimização: Apenas contagem
    discard_pile: game.discard_pile, // Público
    hands: sanitizedHands,
    team_melds: game.team_melds, // Público
    dead_piles_count: game.dead_piles.length, // Otimização: Apenas contagem
    turn_phase: game.turn_phase,
    current_player: game.current_player,
    turn_start_time: game.turn_start_time,
    has_taken_dead_pile: game.has_taken_dead_pile,
    players_data: game.players_data,
    last_drawn_card_id: game.last_drawn_card_id,
    final_score: game.final_score,
    cumulative_score: game.cumulative_score,
    round_count: game.round_count,
    win_condition: game.win_condition,
    rematch_votes: game.rematch_votes || {},
    rules: game.rules,
    magic_joker: game.magic_joker,
  };
};
