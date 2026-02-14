import { Server, Socket } from "socket.io";
import { games, saveState } from "../state";
import {
  validateTurn,
  get_next_player,
  handle_empty_hand,
  requires_clean_to_empty_hand,
  has_clean_canastra,
  get_team,
  start_next_round,
  start_new_match,
  calculate_game_end_score,
} from "../services/gameService";
import {
  broadcast_game_update,
  process_bot_turn,
} from "../services/botService";
import { sort_cards, organize_meld } from "../../common/utils/sort_cards";
import {
  validate_sequence,
  validate_discard_pickup,
  validate_discard_add_to_meld,
} from "../../common/utils/rules_logic";
import { type Card } from "../../common/types/card";
import { type ServerResponse, type PlayerID } from "../types";
import { startTurnTimer, stopTurnTimer } from "../services/timerService";

export const registerGameHandlers = (io: Server, socket: Socket) => {
  socket.on(
    "action_draw",
    (
      { roomId, playerId }: { roomId: string; playerId?: string },
      callback?: (res: ServerResponse) => void,
    ) => {
      const game = games[roomId];
      if (!game) return;

      const ctx = validateTurn(game, socket.id, playerId);
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
          calculate_game_end_score(game);
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
        game.magic_joker.is_discard_frozen = false; // Turn started, unfreeze for next player if needed
        saveState();
        startTurnTimer(io, roomId);
        broadcast_game_update(io, roomId);
      }
    },
  );

  socket.on(
    "action_pick_up_discard_new_meld",
    (
      {
        roomId,
        card_ids,
        playerId,
      }: { roomId: string; card_ids: string[]; playerId?: string },
      callback?: (res: ServerResponse) => void,
    ) => {
      const game = games[roomId];
      if (!game) return;

      const ctx = validateTurn(game, socket.id, playerId);
      if (!ctx) {
        if (callback) callback({ error: "Não é a sua vez." });
        return;
      }
      const { player_id } = ctx;

      if (game.turn_phase !== "DRAW" || game.discard_pile.length === 0) {
        if (callback) callback({ error: "Não pode comprar do lixo agora." });
        return;
      }

      if (game.magic_joker.is_discard_frozen) {
        if (callback)
          callback({ error: "O lixo está congelado por um Joker!" });
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

      const is_valid_pickup = validate_discard_pickup(
        top_discard,
        hand_cards,
        game.rules,
      );
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
                error: "Proibido bater sem canastra limpa.",
              });
            return;
          }
        }
      }

      const all_discard = [...game.discard_pile];
      game.discard_pile = [];

      // Remove from hand
      game.hands[player_id] = current_hand.filter(
        (c) => !card_ids.includes(c.id),
      );

      // Add discard rest to hand
      const rest_of_discard = all_discard.filter(
        (c) => c.id !== top_discard.id,
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
      game.magic_joker.is_discard_frozen = false;
      const updated_hand = game.hands[player_id];

      if (updated_hand && updated_hand.length === 0) {
        handle_empty_hand(game, player_id, "DIRECT");
      }

      startTurnTimer(io, roomId);
      broadcast_game_update(io, roomId);
    },
  );

  socket.on(
    "action_pick_up_discard_add_to_meld",
    (
      {
        roomId,
        meld_index,
        card_ids,
        playerId,
      }: {
        roomId: string;
        meld_index: number;
        card_ids: string[];
        playerId?: string;
      },
      callback?: (res: ServerResponse) => void,
    ) => {
      const game = games[roomId];
      if (!game) return;

      const ctx = validateTurn(game, socket.id, playerId);
      if (!ctx) {
        if (callback) callback({ error: "Não é a sua vez." });
        return;
      }
      const { player_id } = ctx;

      if (game.turn_phase !== "DRAW" || game.discard_pile.length === 0) {
        if (callback) callback({ error: "Não pode comprar do lixo agora." });
        return;
      }

      if (game.magic_joker.is_discard_frozen) {
        if (callback)
          callback({ error: "O lixo está congelado por um Joker!" });
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
      // Updated rule: use specific validation for discard pickup
      const validation = validate_discard_add_to_meld(
        target_meld,
        hand_cards,
        top_discard,
        game.rules,
      );

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
        (c) => !card_ids.includes(c.id),
      );

      const rest_of_discard = all_discard.filter(
        (c) => c.id !== top_discard.id,
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
      game.magic_joker.is_discard_frozen = false;

      const updated_hand = game.hands[player_id];
      if (updated_hand && updated_hand.length === 0) {
        handle_empty_hand(game, player_id, "DIRECT");
      }

      startTurnTimer(io, roomId);
      broadcast_game_update(io, roomId);
    },
  );

  socket.on(
    "action_meld",
    (
      {
        roomId,
        card_ids,
        playerId,
      }: { roomId: string; card_ids: string[]; playerId?: string },
      callback?: (res: ServerResponse) => void,
    ) => {
      const game = games[roomId];
      if (!game) return;

      const ctx = validateTurn(game, socket.id, playerId);
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
                error: "Proibido bater sem canastra limpa.",
              });
            return;
          }
        }
      }

      game.hands[player_id] = sort_cards(
        current_hand.filter((c) => !card_ids.includes(c.id)),
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
        startTurnTimer(io, roomId);
      }

      saveState();
      broadcast_game_update(io, roomId);
    },
  );

  socket.on(
    "action_add_to_meld",
    (
      {
        roomId,
        card_ids,
        meld_index,
        playerId,
      }: {
        roomId: string;
        card_ids: string[];
        meld_index: number;
        playerId?: string;
      },
      callback?: (res: ServerResponse) => void,
    ) => {
      const game = games[roomId];
      if (!game) return;

      const ctx = validateTurn(game, socket.id, playerId);
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
                error: "Proibido bater sem canastra limpa.",
              });
            return;
          }
        }
      }

      game.hands[player_id] = sort_cards(
        current_hand.filter((c) => !card_ids.includes(c.id)),
      );

      const organized = organize_meld(new_meld);
      if (organized.length !== new_meld.length) {
        console.error(
          `[CRITICAL] organize_meld lost cards! In: ${new_meld.length}, Out: ${organized.length}`,
        );
        team_melds[meld_index] = sort_cards(new_meld);
      } else {
        team_melds[meld_index] = organized;
      }

      const updated_hand = game.hands[player_id];
      if (updated_hand && updated_hand.length === 0) {
        handle_empty_hand(game, player_id, "DIRECT");
        startTurnTimer(io, roomId);
      }
      saveState();
      broadcast_game_update(io, roomId);
    },
  );

  socket.on(
    "action_discard",
    (
      {
        roomId,
        card_id,
        playerId,
      }: { roomId: string; card_id: string; playerId?: string },
      callback?: (res: ServerResponse) => void,
    ) => {
      const game = games[roomId];
      if (!game) return;

      const ctx = validateTurn(game, socket.id, playerId);
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
        let nextPlayer = get_next_player(
          game.current_player,
          game.mode,
          game.magic_joker.direction,
        );

        // Se houver um bloqueio pendente, pula o próximo e vai para o subsequente
        if (game.magic_joker.pending_skip) {
          console.log(`[SKIP] Pulando a vez do Jogador ${nextPlayer} devido ao Bloqueio.`);
          nextPlayer = get_next_player(
            nextPlayer,
            game.mode,
            game.magic_joker.direction,
          );
          game.magic_joker.pending_skip = false;
          io.to(roomId).emit("info_msg", "Vez pulada pelo Bloqueio!");
        }

        game.current_player = nextPlayer;
        game.last_drawn_card_id = null; // Limpa o destaque da carta comprada
        startTurnTimer(io, roomId);

        // Check if next player is bot
        const nextPData = game.players_data[game.current_player as PlayerID];
        if (nextPData && nextPData.isBot) {
          process_bot_turn(io, roomId);
        }
      }

      saveState();
      broadcast_game_update(io, roomId);
    },
  );

  socket.on(
    "action_power_pick_card",
    (
      {
        roomId,
        cardId,
        playerId,
      }: { roomId: string; cardId: string; playerId?: string },
      callback?: (res: ServerResponse) => void,
    ) => {
      const game = games[roomId];
      if (!game || !game.magic_joker.power_selection) return;

      const selection = game.magic_joker.power_selection;
      const ctx = validateTurn(game, socket.id, playerId);
      if (!ctx || ctx.player_id !== selection.player_id) {
        if (callback) callback({ error: "Não é sua vez de selecionar." });
        return;
      }

      const player_id = ctx.player_id;

      if (selection.stage === "PICK_MY_CARD") {
        // Valida se a carta está na mão do jogador
        const hasCard = game.hands[player_id]?.some((c) => c.id === cardId);
        if (!hasCard) {
          if (callback) callback({ error: "Carta não encontrada na sua mão." });
          return;
        }
        selection.selected_card_id = cardId;
        selection.stage = "PICK_THEIR_CARD";
        if (callback) callback({ success: true });
      } else if (selection.stage === "PICK_THEIR_CARD") {
        // Valida se a carta está na mão do alvo
        const target_hand = game.hands[selection.target_player_id];
        const theirCardIdx = target_hand?.findIndex((c) => c.id === cardId);

        if (theirCardIdx === undefined || theirCardIdx === -1) {
          if (callback)
            callback({ error: "Carta não encontrada na mão do parceiro." });
          return;
        }

        const myHand = game.hands[player_id];
        const myCardIdx = myHand?.findIndex(
          (c) => c.id === selection.selected_card_id,
        );

        if (myCardIdx !== undefined && myCardIdx !== -1 && target_hand) {
          // EXECUTA A TROCA
          const myCard = myHand!.splice(myCardIdx, 1)[0]!;
          const theirCard = target_hand.splice(theirCardIdx, 1)[0]!;

          myHand!.push(theirCard);
          target_hand.push(myCard);

          game.hands[player_id] = sort_cards(myHand!);
          game.hands[selection.target_player_id] = sort_cards(target_hand);

          // Limpa o estado do poder
          delete game.magic_joker.power_selection;

          io.to(roomId).emit(
            "info_msg",
            `[SWAP] Troca Cirúrgica concluída com sucesso!`,
          );
          if (callback) callback({ success: true });
        }
      }

      saveState();
      broadcast_game_update(io, roomId);
    },
  );

  socket.on(
    "action_power_cancel",
    ({ roomId, playerId }: { roomId: string; playerId?: string }) => {
      const game = games[roomId];
      if (!game || !game.magic_joker.power_selection) return;

      const selection = game.magic_joker.power_selection;
      const ctx = validateTurn(game, socket.id, playerId);

      // Apenas o jogador que iniciou o poder pode cancelar
      if (!ctx || ctx.player_id !== selection.player_id) return;

      delete game.magic_joker.power_selection;

      io.to(roomId).emit(
        "info_msg",
        `[SWAP] O Jogador ${ctx.player_id} cancelou a ação do Joker.`,
      );

      saveState();
      broadcast_game_update(io, roomId);
    },
  );

  socket.on(
    "action_sort_hand",
    ({ roomId, playerId }: { roomId: string; playerId?: string }) => {
      const game = games[roomId];
      if (!game) return;

      const ctx = validateTurn(game, socket.id, playerId);
      if (!ctx) return;
      const player_id = ctx.player_id;

      const current_hand = game.hands[player_id];

      if (current_hand) {
        // Manual sort now randomizes suit order to allow user customization
        game.hands[player_id] = sort_cards(current_hand, true);
        saveState();
        broadcast_game_update(io, roomId);
      }
    },
  );

  socket.on("action_vote_next", ({ roomId }: { roomId: string }) => {
    const game = games[roomId];
    if (!game) return;

    if (game.status !== "ROUND_OVER" && game.status !== "FINISHED") return;

    // Toggle vote or set to true? "Continue" usually implies True.
    if (!game.rematch_votes) game.rematch_votes = {};
    game.rematch_votes[socket.id] = true;

    // Check if everyone is ready
    // Filter only HUMAN players who are currently connected
    // Bots are auto-ready (implicitly, we don't check them)
    // We check `players_connected` list.

    const allHumansReady = game.players_connected.every((socketId) => {
      // Is this socket associated with a player in the game?
      const isPlayer = Object.values(game.players_data).some(
        (p) => p.socketId === socketId,
      );
      if (!isPlayer) return true; // Spectator? Ignore.
      return game.rematch_votes![socketId];
    });

    if (allHumansReady) {
      if (game.status === "ROUND_OVER") {
        start_next_round(game);
      } else {
        start_new_match(game);
      }
      startTurnTimer(io, roomId);

      // Start Bot if P1 is bot
      process_bot_turn(io, roomId);
    }

    broadcast_game_update(io, roomId);
    saveState();
  });

  socket.on(
    "action_use_joker",
    (
      {
        roomId,
        cardId,
        playerId,
      }: { roomId: string; cardId: string; playerId?: string },
      callback?: (res: ServerResponse) => void,
    ) => {
      const game = games[roomId];
      if (!game) return;

      const ctx = validateTurn(game, socket.id, playerId);
      if (!ctx) {
        if (callback) callback({ error: "Não é a sua vez." });
        return;
      }
      const { player_id } = ctx;

      if (game.turn_phase !== "ACTION") {
        if (callback)
          callback({
            error: "Você deve comprar uma carta antes de usar o Joker.",
          });
        return;
      }

      const player_hand = game.hands[player_id];
      if (!player_hand) return;

      const jokerIdx = player_hand.findIndex((c) => c.id === cardId);
      if (jokerIdx === -1) return;
      const joker = player_hand[jokerIdx];

      if (!joker || joker.value !== "JOKER" || !joker.ability) {
        if (callback)
          callback({ error: "Carta selecionada não é um Magic Joker." });
        return;
      }

      // Consome o Joker
      player_hand.splice(jokerIdx, 1);

      const next_player = get_next_player(
        player_id,
        game.mode,
        game.magic_joker.direction,
      );
      const target_hand = game.hands[next_player];

      switch (joker.ability) {
        case "VIEW_HAND": {
          if (target_hand) {
            game.magic_joker.power_selection = {
              player_id: player_id,
              target_player_id: next_player,
              ability: "VIEW_HAND",
              stage: "PICK_MY_CARD", // Stage irrelevante aqui, mas necessário para o tipo
            };

            io.to(roomId).emit(
              "info_msg",
              `[EYE] O Jogador ${player_id} está espiando a mão do Jogador ${next_player}!`,
            );

            // Agenda a limpeza automática após 3 segundos
            setTimeout(() => {
              if (
                game.magic_joker.power_selection?.ability === "VIEW_HAND" &&
                game.magic_joker.power_selection.player_id === player_id
              ) {
                delete game.magic_joker.power_selection;
                broadcast_game_update(io, roomId);
              }
            }, 3000);
          }
          break;
        }

        case "STEAL_CARD": {
          if (target_hand && target_hand.length > 0) {
            const randomIdx = Math.floor(Math.random() * target_hand.length);
            const stolenCard = target_hand.splice(randomIdx, 1)[0];
            if (stolenCard) {
              player_hand.push(stolenCard);
              game.hands[next_player] = sort_cards(target_hand);
              io.to(roomId).emit(
                "info_msg",
                `[STEAL] O Jogador ${player_id} ROUBOU uma carta do Jogador ${next_player}.`,
              );
            }
          }
          break;
        }

        case "SKIP_TURN": {
          io.to(roomId).emit(
            "info_msg",
            `[SKIP] O Jogador ${player_id} PULOU o descarte usando o Joker!`,
          );
          game.turn_phase = "DRAW";
          game.current_player = get_next_player(
            game.current_player,
            game.mode,
            game.magic_joker.direction,
          );
          game.last_drawn_card_id = null;

          // Inicia timer do próximo
          startTurnTimer(io, roomId);

          // Verifica se o próximo é bot
          const nextPData = game.players_data[game.current_player as PlayerID];
          if (nextPData && nextPData.isBot) {
            process_bot_turn(io, roomId);
          }
          break;
        }

        case "SAFE": {
          const teammate = game.mode === "2v2" 
            ? (player_id <= 2 ? player_id + 2 : player_id - 2) 
            : null;
          
          const giveCards = (pId: number, count: number) => {
            const hand = game.hands[pId];
            if (!hand) return;
            for (let i = 0; i < count; i++) {
              let card = game.deck.shift();
              if (!card && game.discard_pile.length > 0) {
                card = game.discard_pile.shift(); // Pega do topo do lixo
              }
              if (card) hand.push(card);
            }
            game.hands[pId] = sort_cards(hand);
          };

          // Dá 3 cartas para quem usou
          giveCards(player_id, 3);
          
          // Dá 3 cartas para o parceiro (se existir)
          if (teammate) {
            giveCards(teammate, 3);
          }

          io.to(roomId).emit(
            "info_msg",
            teammate 
              ? `[SAFE] Seguro ativado! ${player_id} e ${teammate} ganharam 3 cartas.`
              : `[SAFE] Seguro ativado! O Jogador ${player_id} ganhou 3 cartas.`,
          );
          break;
        }

        case "SKIP_NEXT": {
          const victim = get_next_player(
            player_id,
            game.mode,
            game.magic_joker.direction,
          );
          io.to(roomId).emit(
            "info_msg",
            `[SKIP] O Jogador ${player_id} ativou um BLOQUEIO contra o Jogador ${victim}!`,
          );
          game.magic_joker.pending_skip = true;
          break;
        }

        case "REVERSE": {
          game.magic_joker.direction =
            game.magic_joker.direction === 1 ? -1 : 1;
          io.to(roomId).emit(
            "info_msg",
            `[REVERSE] O Jogador ${player_id} INVERTEU o sentido do jogo!`,
          );
          break;
        }

        case "SHUFFLE_DISCARD": {
          if (game.discard_pile.length > 1) {
            const cards_to_return = [...game.discard_pile];
            const top_card = cards_to_return.shift()!;
            game.deck.push(...cards_to_return);
            // Embaralha o deck com as novas cartas
            const shuffled = [...game.deck];
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
            }
            game.deck = shuffled;
            game.discard_pile = [top_card];
            io.to(roomId).emit(
              "info_msg",
              `[ALERT] O Jogador ${player_id} LIMPOU o lixo e embaralhou no monte!`,
            );
          }
          break;
        }

        case "TAX_COLLECTOR": {
          io.to(roomId).emit(
            "info_msg",
            `[ALERT] IMPOSTO! Todos descartam uma carta aleatória.`,
          );
          Object.keys(game.hands).forEach((pId) => {
            const hand = game.hands[Number(pId)];
            if (hand && hand.length > 1) {
              const idx = Math.floor(Math.random() * hand.length);
              const discarded = hand.splice(idx, 1)[0];
              if (discarded) game.discard_pile.unshift(discarded);
              game.hands[Number(pId)] = sort_cards(hand);
            }
          });
          break;
        }

        case "SURGICAL_SWAP": {
          if (game.mode === "2v2") {
            const partner = player_id <= 2 ? player_id + 2 : player_id - 2;
            game.magic_joker.power_selection = {
              player_id: player_id,
              target_player_id: partner,
              ability: "SURGICAL_SWAP",
              stage: "PICK_MY_CARD",
            };
            io.to(roomId).emit(
              "info_msg",
              `[SWAP] O Jogador ${player_id} iniciou uma TROCA CIRÚRGICA com o parceiro!`,
            );
          } else {
            if (callback)
              callback({ error: "Este poder só funciona em duplas (2v2)." });
            return;
          }
          break;
        }
      }

      // No final do switch, removemos qualquer possibilidade de dessincronização
      // garantindo que a mão do jogador atual seja atualizada no estado global.
      game.hands[player_id] = sort_cards(player_hand);

      if (game.hands[player_id].length === 0) {
        handle_empty_hand(
          game,
          player_id,
          game.turn_phase === "DRAW" ? "INDIRECT" : "DIRECT",
        );
      }

      saveState();
      if (game.turn_phase === "ACTION") {
        startTurnTimer(io, roomId);
      }
      broadcast_game_update(io, roomId);
    },
  );
};
