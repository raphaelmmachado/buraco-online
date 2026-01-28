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
} from "../services/gameService";
import { calculate_score } from "../../common/utils/scoring";
import { validate_sequence } from "../../common/utils/rules_logic";
import { type PlayerID } from "../types";

export const broadcast_game_update = (io: Server, roomId: string) => {
  const game = games[roomId];
  if (!game) return;

  // Persist state on every update
  saveState();

  // Envia para cada socket individualmente o seu estado filtrado
  game.players_connected.forEach((socketId) => {
    const sanitized = sanitize_state(game, socketId);
    io.to(socketId).emit("game_update", sanitized);
  });
};

export const process_bot_turn = (io: Server, roomId: string) => {
  const game = games[roomId];
  if (!game || game.status !== "PLAYING") return;

  const pData = game.players_data[game.current_player as PlayerID];
  if (!pData || !pData.isBot) return;

  console.log(
    `[BOT] Processing turn for ${pData.userName} (${game.current_player})`,
  );

  // Add simulated delay
  setTimeout(() => {
    execute_bot_move(io, roomId);
  }, 2000);
};

const execute_bot_move = (io: Server, roomId: string) => {
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

  const my_team_idx = team_id - 1;

  const has_clean = team_melds.some((meld) => {
    const v = validate_sequence(meld);
    return (
      v.is_valid &&
      (v.canastra_type === "CLEAN" ||
        v.canastra_type === "KING" ||
        v.canastra_type === "ACE")
    );
  });

  // DRAW PHASE
  if (game.turn_phase === "DRAW") {
    // 1. SAFETY CHECK: Check for game end by exhaustion (No deck, no dead piles)
    if (game.deck.length === 0 && game.dead_piles.length === 0) {
      console.log(`[BOT] Game End: Deck and Dead Piles exhausted.`);

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
        false, // No one beat, game ended by exhaustion
        !t1_taken,
      );
      const t2_score = calculate_score(
        t2_melds,
        [t2_hand_1, t2_hand_2],
        false,
        !t2_taken,
      );

      game.status = "FINISHED";
      game.final_score = {
        team_1: t1_score.total_score,
        team_2: t2_score.total_score,
        details_t1: t1_score,
        details_t2: t2_score,
      };
      broadcast_game_update(io, roomId);
      return;
    }

    if (game.discard_pile.length > 0) {
      const top_discard = game.discard_pile[0];
      if (top_discard) {
        // Pass pile size to analyze_discard_pickup
        const has_taken = game.has_taken_dead_pile[my_team_idx as 0 | 1];

        const action = analyze_discard_pickup(
          my_hand,
          top_discard,
          team_melds,
          has_taken,
          has_clean,
          game.discard_pile.length,
        );

        if (action) {
          console.log(`[BOT] Pickup from discard: ${action.type}`);

          if (action.type === "NEW_MELD") {
            const card_ids = action.cards.map((c) => c.id);
            const combined = [...action.cards, top_discard];

            // Bot takes the rest of the discard pile
            const rest_of_discard = game.discard_pile.slice(1);
            game.discard_pile = [];

            const new_hand = my_hand.filter((c) => !card_ids.includes(c.id));
            new_hand.push(...rest_of_discard);
            game.hands[game.current_player] = sort_cards(new_hand);

            team_melds.push(organize_meld(combined));
          } else if (action.type === "ADD_TO_MELD") {
            const target_meld = team_melds[action.meld_index];
            const card_ids = action.cards.map((c) => c.id);

            // Combine existing meld + bridge cards + discard
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

          // Bot continues to ACTION phase immediately
          setTimeout(() => execute_bot_move(io, roomId), 1500);
          return;
        }
      }
    }

    // Draw from deck
    console.log(
      `[BOT DEBUG] ${pData.userName} drawing from deck. Remaining: ${game.deck.length}`,
    );
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
        broadcast_game_update(io, roomId);
        return;
      }
    }

    const card = game.deck.shift();
    if (card) {
      const current_h = game.hands[game.current_player];
      if (current_h) {
        current_h.unshift(card);
        game.turn_phase = "ACTION";
        broadcast_game_update(io, roomId);
        setTimeout(() => execute_bot_move(io, roomId), 1500);
      }
    }
    return;
  }

  // ACTION PHASE
  if (game.turn_phase === "ACTION") {
    const has_taken = game.has_taken_dead_pile[my_team_idx as 0 | 1];

    // A. Meld
    const new_meld_cards = find_meld_in_hand(
      my_hand,
      team_melds,
      has_taken,
      has_clean,
    );
    if (new_meld_cards) {
      const card_ids = new_meld_cards.map((c) => c.id);

      game.hands[game.current_player] = my_hand.filter(
        (c) => !card_ids.includes(c.id),
      );
      team_melds.push(organize_meld(new_meld_cards));

      const updated_hand = game.hands[game.current_player];
      if (updated_hand && updated_hand.length === 0)
        handle_empty_hand(game, game.current_player as PlayerID, "DIRECT");

      broadcast_game_update(io, roomId);
      setTimeout(() => execute_bot_move(io, roomId), 1500); // Try more actions
      return;
    }

    // B. Add to Meld
    for (let i = 0; i < team_melds.length; i++) {
      const meld = team_melds[i];
      if (!meld) continue;

      const card_to_add = find_card_to_add(my_hand, meld, has_taken, has_clean);
      if (card_to_add) {
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

    // C. Discard
    const opponent_team = team_id === 1 ? 2 : 1;
    const opponent_melds = game.team_melds[opponent_team] || [];
    // Determine if my team has taken dead pile
    const my_team_has_taken = game.has_taken_dead_pile[my_team_idx as 0 | 1];

    // Pass all parameters to improve intelligence and prevent undefined behavior
    let discard_card = choose_discard(
      my_hand,
      opponent_melds,
      game.discard_pile[0],
      my_team_has_taken,
      game.deck.length,
      [], // all_played_cards - Optional/Optimization not yet fully tracked in game state for bots
      game.discard_pile.length,
      0, // partner_hand_size - Optional, defaults to 0
    );

    // FALLBACK SAFETY: Ensure we ALWAYS discard if we have cards
    if (!discard_card && my_hand.length > 0) {
      console.warn(
        `[BOT WARNING] choose_discard returned null for ${pData.userName}. Forcing discard of first card.`,
      );
      const fallback = my_hand[0];
      if (fallback) discard_card = fallback;
    }

    if (discard_card) {
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

      // Check if next player is bot
      const nextPData = game.players_data[game.current_player as PlayerID];
      if (nextPData && nextPData.isBot) {
        process_bot_turn(io, roomId);
      }
    }
  }
};
