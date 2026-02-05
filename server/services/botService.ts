import { Server } from "socket.io";
import { games, saveState } from "../state";
import {
  analyze_discard_pickup,
  choose_discard,
  find_card_to_add,
  find_meld_in_hand,
} from "../../common/utils/bot_logic";
import { sort_cards, organize_meld } from "../../common/utils/sort_cards";
import {
  get_team,
  get_next_player,
  handle_empty_hand,
  sanitize_state,
  check_championship_status,
} from "../services/gameService";
import { calculate_score } from "../../common/utils/scoring";
import { validate_sequence } from "../../common/utils/rules_logic";
import { type PlayerID } from "../types";
import type { Card } from "../../common/types/card";

/**
 * Envia as atualizações de estado do jogo para todos os jogadores conectados na sala.
 */
export const broadcast_game_update = (io: Server, roomId: string) => {
  const game = games[roomId];
  if (!game) return;

  // Persiste o estado no arquivo de backup (persistência em caso de crash)
  saveState();

  // Envia para cada socket individualmente o seu estado filtrado (para um jogador não ver as cartas do outro)
  game.players_connected.forEach((socketId) => {
    const sanitized = sanitize_state(game, socketId);
    io.to(socketId).emit("game_update", sanitized);
  });
};

/**
 * Inicia o processamento do turno de um Bot.
 */
export const process_bot_turn = (io: Server, roomId: string) => {
  const game = games[roomId];
  if (!game || game.status !== "PLAYING") return;

  const pData = game.players_data[game.current_player as PlayerID];
  if (!pData || !pData.isBot) return;

  console.log(`[BOT] Turno do Bot: ${pData.userName} (${game.current_player})`);

  // Adiciona um atraso simulado de 2 segundos para o bot não jogar instantaneamente (melhora a UX)
  setTimeout(() => {
    execute_bot_move(io, roomId);
  }, 2000);
};

/**
 * Executa as ações reais do bot (Comprar -> Agir -> Descartar).
 */
const execute_bot_move = (io: Server, roomId: string) => {
  const game = games[roomId];
  if (!game) return;

  const pData = game.players_data[game.current_player as PlayerID];
  if (!pData || !pData.isBot) return;

  const my_hand = game.hands[game.current_player];
  if (!my_hand) return;

  const team_id = get_team(game.current_player);
  const team_melds = game.team_melds[team_id];
  if (!team_melds) return;

  const my_team_idx = team_id - 1;

  // Verifica se a equipe já possui canastra limpa para saber se pode bater
  const has_clean = team_melds.some((meld) => {
    const v = validate_sequence(meld);
    return (
      v.is_valid &&
      (v.canastra_type === "CLEAN" ||
        v.canastra_type === "KING" ||
        v.canastra_type === "ACE")
    );
  });

  // --- FASE 1: COMPRA (DRAW) ---
  if (game.turn_phase === "DRAW") {
    // Verifica se o jogo acabou por exaustão do deck
    if (game.deck.length === 0 && game.dead_piles.length === 0) {
      console.log(`[BOT] Fim de Jogo: Cartas esgotadas.`);

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
        false, // Ninguém bateu, acabou por exaustão
        !t1_taken,
      );
      const t2_score = calculate_score(
        t2_melds,
        [t2_hand_1, t2_hand_2],
        false,
        !t2_taken,
      );

      check_championship_status(
        game,
        t1_score.total_score,
        t2_score.total_score,
        t1_score,
        t2_score,
      );
      broadcast_game_update(io, roomId);
      return;
    }

    // TENTA PEGAR DO LIXO
    if (game.discard_pile.length > 0) {
      const top_discard = game.discard_pile[0];
      if (top_discard) {
        const has_taken = game.has_taken_dead_pile[my_team_idx as 0 | 1];

        const action = analyze_discard_pickup(
          my_hand,
          top_discard,
          team_melds,
          has_taken,
          has_clean,
          game.discard_pile.length,
          game.deck.length,
        );

        if (action) {
          console.log(`[BOT] Bot pegou do lixo: ${action.type}`);

          if (action.type === "NEW_MELD") {
            const card_ids = action.cards.map((c) => c.id);
            const combined = [...action.cards, top_discard];
            const rest_of_discard = game.discard_pile.slice(1);
            game.discard_pile = [];

            const new_hand = my_hand.filter((c) => !card_ids.includes(c.id));
            new_hand.push(...rest_of_discard);
            game.hands[game.current_player] = sort_cards(new_hand);
            team_melds.push(organize_meld(combined));
          } else if (action.type === "ADD_TO_MELD") {
            const target_meld = team_melds[action.meld_index];
            const card_ids = action.cards.map((c) => c.id);
            const new_meld_cards = [
              ...(target_meld ?? []),
              ...action.cards,
              top_discard,
            ];
            const rest_of_discard = game.discard_pile.slice(1);
            game.discard_pile = [];

            const new_hand = my_hand.filter((c) => !card_ids.includes(c.id));
            new_hand.push(...rest_of_discard);
            game.hands[game.current_player] = sort_cards(new_hand);
            team_melds[action.meld_index] = organize_meld(new_meld_cards);
          }

          game.turn_phase = "ACTION";
          broadcast_game_update(io, roomId);
          setTimeout(() => execute_bot_move(io, roomId), 1500);
          return;
        }
      }
    }

    // COMPRA DO MONTE (se não pegou do lixo)
    console.log(`[BOT] ${pData.userName} comprando do monte.`);
    if (game.deck.length === 0 && game.dead_piles.length > 0) {
      game.deck = game.dead_piles.shift() || [];
    }

    const card = game.deck.shift();
    if (card) {
      game.hands[game.current_player]?.unshift(card);
      game.turn_phase = "ACTION";
      broadcast_game_update(io, roomId);
      setTimeout(() => execute_bot_move(io, roomId), 1500);
    }
    return;
  }

  // --- FASE 2: AÇÃO (ACTION) ---
  if (game.turn_phase === "ACTION") {
    const has_taken = game.has_taken_dead_pile[my_team_idx as 0 | 1];

    // A. Adicionar a Jogos Existentes (PRIORIDADE)
    // Isso evita fragmentar sequências.
    for (let i = 0; i < team_melds.length; i++) {
      const meld = team_melds[i];
      if (!meld) continue;

      const card_to_add = find_card_to_add(my_hand, meld, has_taken, has_clean);
      if (card_to_add) {
        console.log(`[BOT] Adicionando ${card_to_add.value} ao jogo ${i}.`);
        game.hands[game.current_player] = my_hand.filter(
          (c) => c.id !== card_to_add.id,
        );
        team_melds[i] = organize_meld([...meld, card_to_add]);

        const updated_hand = game.hands[game.current_player];
        if (updated_hand && updated_hand.length === 0)
          handle_empty_hand(game, game.current_player as PlayerID, "DIRECT");

        broadcast_game_update(io, roomId);
        setTimeout(() => execute_bot_move(io, roomId), 1500);
        return;
      }
    }

    // B. Baixar Novo Jogo
    const new_meld_cards = find_meld_in_hand(
      my_hand,
      team_melds,
      has_taken,
      has_clean,
    );
    if (new_meld_cards) {
      console.log(`[BOT] Baixando novo jogo.`);
      const card_ids = new_meld_cards.map((c) => c.id);
      game.hands[game.current_player] = my_hand.filter(
        (c) => !card_ids.includes(c.id),
      );
      team_melds.push(organize_meld(new_meld_cards));

      const updated_hand = game.hands[game.current_player];
      if (updated_hand && updated_hand.length === 0)
        handle_empty_hand(game, game.current_player as PlayerID, "DIRECT");

      broadcast_game_update(io, roomId);
      setTimeout(() => execute_bot_move(io, roomId), 1500);
      return;
    }

    // C. Descarte (Finaliza o turno)
    const opponent_team = team_id === 1 ? 2 : 1;
    const opponent_melds = game.team_melds[opponent_team] || [];
    const my_team_has_taken = game.has_taken_dead_pile[my_team_idx as 0 | 1];

    let discard_card: Card = choose_discard(
      my_hand,
      opponent_melds,
      game.discard_pile[0] ?? null,
      my_team_has_taken,
      game.deck.length,
      game.discard_pile.length,
      0, // partner_hand_size (opcional)
    );

    if (!discard_card && my_hand.length > 0) {
      discard_card = my_hand[0] as Card;
    }

    if (discard_card) {
      console.log(`[BOT] Descartando ${discard_card.value}.`);
      game.hands[game.current_player] = my_hand.filter(
        (c) => c.id !== discard_card.id,
      );
      game.discard_pile.unshift(discard_card);

      const updated_hand = game.hands[game.current_player as PlayerID];
      if (updated_hand && updated_hand.length === 0) {
        handle_empty_hand(game, game.current_player as PlayerID, "INDIRECT");
      }

      if (game.status !== "FINISHED") {
        game.turn_phase = "DRAW";
        game.current_player = get_next_player(game.current_player, game.mode);
      }

      broadcast_game_update(io, roomId);

      // Se o próximo jogador também for bot, agenda o turno dele
      const nextPData = game.players_data[game.current_player as PlayerID];
      if (nextPData && nextPData.isBot) {
        process_bot_turn(io, roomId);
      }
    }
  }
};
