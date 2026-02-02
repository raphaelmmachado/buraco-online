import { Server, Socket } from "socket.io";
import { games, saveState } from "../state";
import {
  validateTurn,
  get_next_player,
  handle_empty_hand,
  requires_clean_to_empty_hand,
  has_clean_canastra,
  get_team,
  get_player_id_by_socket,
  check_championship_status,
} from "../services/gameService";
import {
  broadcast_game_update,
  process_bot_turn,
} from "../services/botService";
import { calculate_score } from "../../common/utils/scoring";
import { sort_cards, organize_meld } from "../../common/utils/sort_cards";
import {
  validate_sequence,
  validate_discard_pickup,
} from "../../common/utils/rules_logic";
import { type Card } from "../../common/types/card";
import { type ServerResponse, type PlayerID } from "../types";
import { startTurnTimer, stopTurnTimer } from "../services/timerService";

export const registerGameHandlers = (io: Server, socket: Socket) => {
  socket.on(
    "action_draw",
    (
      { roomId }: { roomId: string },
      callback?: (res: ServerResponse) => void
    ) => {
      const game = games[roomId];
      if (!game) return;

      const ctx = validateTurn(game, socket.id);
      if (!ctx) {
        if (callback) callback({ error: "Não é a sua vez." });
        return;
      }
      const { player_id } = ctx;

      if (game.turn_phase !== "DRAW") {
        if (callback) callback({ error: "Não está na fase de compra." });
        return;
      }

      if (game.deck.length === 0) {
        if (game.dead_piles.length > 0) {
          const new_deck = game.dead_piles.shift();
          if (new_deck) {
            game.deck = new_deck;
          }
        } else {
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
            !t1_taken
          );
          const t2_score = calculate_score(
            t2_melds,
            [t2_hand_1, t2_hand_2],
            false,
            !t2_taken
          );

          check_championship_status(game, t1_score.total_score, t2_score.total_score, t1_score, t2_score);
          stopTurnTimer(roomId);
          broadcast_game_update(io, roomId);
          return;
        }
      }

      const card = game.deck.shift();
      const player_hand = game.hands[player_id];

      if (card && player_hand) {
        player_hand.unshift(card);
        // Ordena automaticamente após a compra (sem randomizar naipes)
        game.hands[player_id] = sort_cards(player_hand);
        game.last_drawn_card_id = card.id;
        game.turn_phase = "ACTION";
        saveState();
        startTurnTimer(io, roomId);
        broadcast_game_update(io, roomId);
      }
    }
  );

  socket.on(
    "action_pick_up_discard_new_meld",
    (
      { roomId, card_ids }: { roomId: string; card_ids: string[] },
      callback?: (res: ServerResponse) => void
    ) => {
      const game = games[roomId];
      if (!game) return;

      const ctx = validateTurn(game, socket.id);
      if (!ctx) {
        if (callback) callback({ error: "Não é a sua vez." });
        return;
      }
      const { player_id } = ctx;

      if (game.turn_phase !== "DRAW" || game.discard_pile.length === 0) {
        if (callback) callback({ error: "Não pode comprar do lixo agora." });
        return;
      }

      const current_hand = game.hands[player_id];
      if (!current_hand) return;

      const top_discard = game.discard_pile[0];
      if (!top_discard) {
        if (callback) callback({ error: "Lixo está vazio." });
        return;
      }
      const hand_cards = current_hand.filter((c) => card_ids.includes(c.id));

      if (hand_cards.length !== card_ids.length) {
        if (callback) callback({ error: "Cartas selecionadas inválidas." });
        return;
      }

      const combined = [...hand_cards, top_discard];

      const is_valid_pickup = validate_discard_pickup(top_discard, hand_cards);
      console.log(`[PICKUP RESULT] Valid: ${is_valid_pickup}`);

      const validation = validate_sequence(combined);

      if (!is_valid_pickup) {
        const error_msg = !validation.is_valid
          ? validation.error
          : "O jogo formado deve ser LIMPO (sem curingas) para comprar o lixo.";

        if (callback) callback({ error: `Lixo bloqueado: ${error_msg}` });
        return;
      }

      const team_id = get_team(player_id);
      const new_hand_len =
        current_hand.length - card_ids.length + (game.discard_pile.length - 1);

      if (requires_clean_to_empty_hand(game, team_id)) {
        if (new_hand_len <= 1) {
          const already_has_clean = has_clean_canastra(game, team_id);
          const this_is_clean_canasta =
            validation.is_valid &&
            (validation.canastra_type === "CLEAN" ||
              validation.canastra_type === "KING" ||
              validation.canastra_type === "ACE");

          if (!already_has_clean && !this_is_clean_canasta) {
            if (callback)
              callback({
                error:
                  "Proibido bater sem canastra limpa (você ficaria apenas com uma carta na mão).",
              });
            return;
          }
        }
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
      const current_team_melds = game.team_melds[team_id];
      if (current_team_melds) {
        const organized = organize_meld(combined);
        if (organized.length !== combined.length) {
          current_team_melds.push(sort_cards(combined));
        } else {
          current_team_melds.push(organized);
        }
      }

      game.turn_phase = "ACTION";
      const updated_hand = game.hands[player_id];

      if (updated_hand && updated_hand.length === 0) {
        handle_empty_hand(game, player_id, "DIRECT");
      }

      startTurnTimer(io, roomId);
      broadcast_game_update(io, roomId);
    }
  );

  socket.on(
    "action_pick_up_discard_add_to_meld",
    (
      {
        roomId,
        meld_index,
        card_ids,
      }: {
        roomId: string;
        meld_index: number;
        card_ids: string[];
      },
      callback?: (res: ServerResponse) => void
    ) => {
      const game = games[roomId];
      if (!game) return;

      const ctx = validateTurn(game, socket.id);
      if (!ctx) {
        if (callback) callback({ error: "Não é a sua vez." });
        return;
      }
      const { player_id } = ctx;

      if (game.turn_phase !== "DRAW" || game.discard_pile.length === 0) {
        if (callback) callback({ error: "Não pode comprar do lixo agora." });
        return;
      }

      const team_id = get_team(player_id);
      const team_melds = game.team_melds[team_id];
      const target_meld = team_melds?.[meld_index];
      if (!target_meld) {
        if (callback) callback({ error: "Jogo não encontrado." });
        return;
      }

      const current_hand = game.hands[player_id];
      if (!current_hand) return;

      const top_discard = game.discard_pile[0];
      if (!top_discard) {
        if (callback) callback({ error: "Lixo está vazio." });
        return;
      }
      const hand_cards = current_hand.filter((c) => card_ids.includes(c.id));

      const new_meld: Card[] = [...target_meld, ...hand_cards, top_discard];
      const validation = validate_sequence(new_meld);

      if (!validation.is_valid) {
        if (callback)
          callback({ error: `Movimento inválido: ${validation.error}` });
        return;
      }

      const new_hand_len =
        current_hand.length - card_ids.length + (game.discard_pile.length - 1);

      if (requires_clean_to_empty_hand(game, team_id)) {
        if (new_hand_len <= 1) {
          const already_has_clean = team_melds?.some((meld, idx) => {
            if (idx === meld_index) return false;
            const v = validate_sequence(meld);
            return (
              v.is_valid &&
              (v.canastra_type === "CLEAN" ||
                v.canastra_type === "KING" ||
                v.canastra_type === "ACE")
            );
          });

          const this_is_clean_canasta =
            validation.is_valid &&
            (validation.canastra_type === "CLEAN" ||
              validation.canastra_type === "KING" ||
              validation.canastra_type === "ACE");

          if (!already_has_clean && !this_is_clean_canasta) {
            if (callback)
              callback({
                error:
                  "Impedido de ficar com apenas uma carta na mão. Proibido bater sem canastra limpa",
              });
            return;
          }
        }
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
        const organized = organize_meld(new_meld);
        if (organized.length !== new_meld.length) {
          team_melds[meld_index] = sort_cards(new_meld);
        } else {
          team_melds[meld_index] = organized;
        }
      }

      game.turn_phase = "ACTION";

      const updated_hand = game.hands[player_id];
      if (updated_hand && updated_hand.length === 0) {
        handle_empty_hand(game, player_id, "DIRECT");
      }

      broadcast_game_update(io, roomId);
    }
  );

  socket.on(
    "action_meld",
    (
      { roomId, card_ids }: { roomId: string; card_ids: string[] },
      callback?: (res: ServerResponse) => void
    ) => {
      const game = games[roomId];
      if (!game) return;

      const ctx = validateTurn(game, socket.id);
      if (!ctx) {
        if (callback) callback({ error: "Não é a sua vez." });
        return;
      }
      const { player_id } = ctx;

      const current_hand = game.hands[player_id];
      if (game.turn_phase !== "ACTION" || !current_hand) {
        if (callback) callback({ error: "Não pode baixar jogo agora." });
        return;
      }

      const cards_to_meld = current_hand.filter((c) => card_ids.includes(c.id));
      if (cards_to_meld.length !== card_ids.length) {
        if (callback)
          callback({ error: "Cartas selecionadas não estão na mão." });
        return;
      }

      const validation = validate_sequence(cards_to_meld);

      if (!validation.is_valid) {
        if (callback) callback({ error: `Jogo inválido: ${validation.error}` });
        return;
      }

      const team_id = get_team(player_id);
      const new_hand_len = current_hand.length - card_ids.length;

      if (requires_clean_to_empty_hand(game, team_id)) {
        if (new_hand_len <= 1) {
          const already_has_clean = has_clean_canastra(game, team_id);
          const this_is_clean_canasta =
            validation.is_valid &&
            (validation.canastra_type === "CLEAN" ||
              validation.canastra_type === "KING" ||
              validation.canastra_type === "ACE");

          if (!already_has_clean && !this_is_clean_canasta) {
            if (callback)
              callback({
                error:
                  "Proibido bater sem canastra limpa (você ficaria apenas com uma carta na mão).",
              });
            return;
          }
        }
      }

      game.hands[player_id] = sort_cards(
        current_hand.filter((c) => !card_ids.includes(c.id))
      );
      const team_melds = game.team_melds[team_id];
      if (team_melds) {
        const organized = organize_meld(cards_to_meld);
        if (organized.length !== cards_to_meld.length) {
          team_melds.push(sort_cards(cards_to_meld));
        } else {
          team_melds.push(organized);
        }
      }

      const updated_hand = game.hands[player_id];
      if (updated_hand && updated_hand.length === 0) {
        handle_empty_hand(game, player_id, "DIRECT");
      }

      broadcast_game_update(io, roomId);
    }
  );

  socket.on(
    "action_add_to_meld",
    (
      {
        roomId,
        card_ids,
        meld_index,
      }: {
        roomId: string;
        card_ids: string[];
        meld_index: number;
      },
      callback?: (res: ServerResponse) => void
    ) => {
      const game = games[roomId];
      if (!game) return;

      const ctx = validateTurn(game, socket.id);
      if (!ctx) {
        if (callback) callback({ error: "Não é a sua vez." });
        return;
      }
      const { player_id } = ctx;

      const current_hand = game.hands[player_id];
      const team_id = get_team(player_id);
      const team_melds = game.team_melds[team_id];

      if (game.turn_phase !== "ACTION" || !current_hand || !team_melds) {
        if (callback) callback({ error: "Não pode baixar jogo agora." });
        return;
      }

      const target_meld = team_melds[meld_index];
      if (!target_meld) {
        if (callback) callback({ error: "Jogo alvo não encontrado." });
        return;
      }

      const cards_to_add = current_hand.filter((c) => card_ids.includes(c.id));
      if (cards_to_add.length !== card_ids.length) {
        if (callback) callback({ error: "Cartas não estão na mão." });
        return;
      }

      const new_meld = [...target_meld, ...cards_to_add];
      const validation = validate_sequence(new_meld);
      if (!validation.is_valid) {
        if (callback)
          callback({ error: `Não pode adicionar: ${validation.error}` });
        return;
      }

      const new_hand_len = current_hand.length - card_ids.length;
      if (requires_clean_to_empty_hand(game, team_id)) {
        if (new_hand_len <= 1) {
          const already_has_clean = has_clean_canastra(game, team_id);
          const this_will_be_clean =
            validation.is_valid &&
            (validation.canastra_type === "CLEAN" ||
              validation.canastra_type === "KING" ||
              validation.canastra_type === "ACE");

          if (!already_has_clean && !this_will_be_clean) {
            if (callback)
              callback({
                error:
                  "Proibido bater sem canastra limpa (você ficaria apenas com uma carta na mão).",
              });
            return;
          }
        }
      }

      game.hands[player_id] = sort_cards(
        current_hand.filter((c) => !card_ids.includes(c.id))
      );

      const organized = organize_meld(new_meld);
      if (organized.length !== new_meld.length) {
        console.error(
          `[CRITICAL] organize_meld lost cards! In: ${new_meld.length}, Out: ${organized.length}`
        );
        team_melds[meld_index] = sort_cards(new_meld);
      } else {
        team_melds[meld_index] = organized;
      }

      const updated_hand = game.hands[player_id];
      if (updated_hand && updated_hand.length === 0) {
        handle_empty_hand(game, player_id, "DIRECT");
      }
      broadcast_game_update(io, roomId);
    }
  );

  socket.on(
    "action_discard",
    (
      { roomId, card_id }: { roomId: string; card_id: string },
      callback?: (res: ServerResponse) => void
    ) => {
      const game = games[roomId];
      if (!game) return;

      const ctx = validateTurn(game, socket.id);
      if (!ctx) {
        if (callback) callback({ error: "Não é a sua vez." });
        return;
      }
      const { player_id } = ctx;

      const current_hand = game.hands[player_id];
      if (game.turn_phase !== "ACTION" || !current_hand) {
        if (callback) callback({ error: "Não pode descartar agora." });
        return;
      }

      const card_to_discard = current_hand.find((c) => c.id === card_id);
      if (!card_to_discard) return;

      const team_id = get_team(player_id);
      const new_hand_len = current_hand.length - 1;

      if (new_hand_len === 0) {
        if (requires_clean_to_empty_hand(game, team_id)) {
          if (!has_clean_canastra(game, team_id)) {
            if (callback)
              callback({
                error: "Não pode bater (encerrar) sem canastra limpa.",
              });
            return;
          }
        }
      }

      game.hands[player_id] = current_hand.filter((c) => c.id !== card_id);
      game.discard_pile.unshift(card_to_discard);

      const updated_hand = game.hands[player_id];
      if (updated_hand && updated_hand.length === 0) {
        handle_empty_hand(game, player_id, "INDIRECT");
      } else if (updated_hand) {
        // Ordena automaticamente após descarte
        game.hands[player_id] = sort_cards(updated_hand);
      }

      if (game.status !== "FINISHED") {
        game.turn_phase = "DRAW";
        game.current_player = get_next_player(game.current_player, game.mode);
        game.last_drawn_card_id = null; // Limpa o destaque da carta comprada
        startTurnTimer(io, roomId);

        // Check if next player is bot
        const nextPData = game.players_data[game.current_player as PlayerID];
        if (nextPData && nextPData.isBot) {
            process_bot_turn(io, roomId);
        }
      }

      broadcast_game_update(io, roomId);
    }
  );

  socket.on("action_sort_hand", ({ roomId }: { roomId: string }) => {
    const game = games[roomId];
    if (!game) return;

    const player_id = get_player_id_by_socket(game, socket.id);
    if (!player_id) return;

    const current_hand = game.hands[player_id];

    if (current_hand) {
      // Manual sort now randomizes suit order to allow user customization
      game.hands[player_id] = sort_cards(current_hand, true);
      broadcast_game_update(io, roomId);
    }
  });
};
