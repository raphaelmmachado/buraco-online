import { calculate_score } from "../../common/utils/scoring";
import { sort_cards } from "../../common/utils/sort_cards";
import { validate_sequence } from "../../common/utils/rules_logic";
import { type ServerGameState } from "../state";
import { type PlayerID, type TeamID, type GameMode } from "../types";
import { type Card } from "../../common/types/card";
export const get_team = (player_id: number): TeamID => {
  return (player_id % 2 !== 0 ? 1 : 2) as TeamID;
};

export const get_next_player = (current: number, mode: GameMode): number => {
  if (mode === "1v1") return current === 1 ? 2 : 1;
  return (current % 4) + 1;
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

export const handle_empty_hand = (
  game: ServerGameState,
  player_id: PlayerID,
  type: "DIRECT" | "INDIRECT"
) => {
  const team_id = get_team(player_id);
  const team_idx = (team_id - 1) as 0 | 1;

  const has_taken = game.has_taken_dead_pile[team_idx];

  // Common variables for score calculation
  const t1_hand_1 = game.hands[1] ?? [];
  const t1_hand_2 = game.hands[3] ?? [];
  const t2_hand_1 = game.hands[2] ?? [];
  const t2_hand_2 = game.hands[4] ?? [];

  const t1_melds = game.team_melds[1] ?? [];
  const t2_melds = game.team_melds[2] ?? [];

  if (has_taken) {
    const t1_taken = game.has_taken_dead_pile[0];
    const t2_taken = game.has_taken_dead_pile[1];

    console.log(
      `[GAME END] Calculating score. T1 Taken: ${t1_taken}, T2 Taken: ${t2_taken}`
    );

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
      game.has_taken_dead_pile[team_idx] = true;
      game.hands[player_id] = sort_cards(my_dead_pile);
    }
    game.turn_phase = type === "DIRECT" ? "ACTION" : "DRAW";
    console.log(`Jogador ${player_id} pegou o morto (${type})`);
  } else {
    // Fim de jogo: Não tem morto para pegar
    console.log(`Fim de Jogo! Sem mortos disponíveis.`);

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
  }
};

export const get_player_id_by_socket = (
  game: ServerGameState,
  socketId: string
): PlayerID | null => {
  for (const [id, data] of Object.entries(game.players_data)) {
    if (data.socketId === socketId) return Number(id) as PlayerID;
  }
  return null;
};

export const validateTurn = (
  game: ServerGameState,
  socketId: string
): { player_id: PlayerID } | null => {
  // Se o socketId for "BOT", validamos apenas se o current player é um bot
  if (socketId === "BOT") {
    const pData = game.players_data[game.current_player as PlayerID];
    if (pData && pData.isBot) {
      return { player_id: game.current_player as PlayerID };
    }
    return null;
  }

  const player_id = get_player_id_by_socket(game, socketId);
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
    if (id === myPlayerId) {
      sanitizedHands[id] = game.hands[id] || []; // Minha mão completa (ou vazio se erro)
    } else {
      sanitizedHands[id] = game.hands[id]?.length || 0; // Apenas contagem dos outros
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
    has_taken_dead_pile: game.has_taken_dead_pile,
    players_data: game.players_data,
    last_drawn_card_id: game.last_drawn_card_id,
    final_score: game.final_score,
  };
};
