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
import { startTurnTimer } from "./timerService";
import { type ServerGameState } from "../state";

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
 * Executa o poder de um Magic Joker (centralizado para humanos e bots).
 */
export const execute_joker_power = (
  io: Server,
  game: ServerGameState,
  player_id: PlayerID,
  cardId: string,
  roomId: string,
) => {
  const player_hand = game.hands[player_id];
  if (!player_hand) return { error: "Mão não encontrada." };

  const jokerIdx = player_hand.findIndex((c) => c.id === cardId);
  if (jokerIdx === -1) return { error: "Joker não encontrado na mão." };
  
  const joker = player_hand[jokerIdx]!;
  if (joker.value !== "JOKER" || !joker.ability) {
    return { error: "Carta não é um Magic Joker." };
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
          stage: "PICK_MY_CARD",
        };

        io.to(roomId).emit(
          "info_msg",
          `[EYE] O Jogador ${player_id} está espiando a mão do Jogador ${next_player}!`,
        );

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
      startTurnTimer(io, roomId);

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
            card = game.discard_pile.shift();
          }
          if (card) hand.push(card);
        }
        game.hands[pId] = sort_cards(hand);
      };

      giveCards(player_id, 3);
      if (teammate) giveCards(teammate, 3);

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
      }
      break;
    }
  }

  game.hands[player_id] = sort_cards(player_hand);

  if (game.hands[player_id].length === 0) {
    handle_empty_hand(
      game,
      player_id,
      game.turn_phase === "DRAW" ? "INDIRECT" : "DIRECT",
    );
  }

  saveState();
  return { success: true };
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

  // --- FASE DE SELEÇÃO DE PODER (Removida para Bots) ---

  // Verifica se a equipe já possui canastra limpa para saber se pode bater
  const has_clean = team_melds.some((meld) => {
    const v = validate_sequence(meld, game.rules);
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
        game.rules
      );
      const t2_score = calculate_score(
        t2_melds,
        [t2_hand_1, t2_hand_2],
        false,
        !t2_taken,
        game.rules
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
                    game.rules,
                    game.dead_piles.length,
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
            team_melds.push(organize_meld(combined, game.rules));
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
            team_melds[action.meld_index] = organize_meld(
              new_meld_cards,
              game.rules,
            );
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

    // --- NOVA ETAPA: USAR MAGIC JOKERS ---
    const jokers_in_hand = my_hand.filter((c) => c.value === "JOKER" && c.ability);
    if (jokers_in_hand.length > 0) {
      // O Bot avalia se deve usar o poder agora ou guardar como coringa normal
      for (const joker of jokers_in_hand) {
        let should_use = false;
        const next_player = get_next_player(game.current_player, game.mode, game.magic_joker.direction);
        const next_player_hand_len = game.hands[next_player]?.length || 0;

        switch (joker.ability) {
          case "STEAL_CARD":
          case "SAFE":
          case "SKIP_NEXT":
            should_use = true; // Sempre benéfico
            break;
          case "VIEW_HAND":
            if (next_player_hand_len <= 3) should_use = true; // Só usa se o próximo estiver perto de bater
            break;
          case "REVERSE": {
            // Inverte se o jogador que jogaria depois de mim tem menos cartas que o jogador que jogaria antes de mim
            const prev_player = get_next_player(game.current_player, game.mode, (-game.magic_joker.direction) as (1 | -1));
            const prev_hand_len = game.hands[prev_player]?.length || 0;
            if (next_player_hand_len < prev_hand_len) should_use = true;
            break;
          }
          case "TAX_COLLECTOR": {
            const my_len = my_hand.length;
            const others = Object.values(game.hands).map(h => h.length);
            const avg = others.reduce((a, b) => a + b, 0) / others.length;
            if (my_len <= avg) should_use = true;
            break;
          }
          case "SHUFFLE_DISCARD":
            if (game.discard_pile.length > 5) should_use = true;
            break;
          case "SKIP_TURN":
            if (my_hand.length > 8) should_use = true; // Evita descartar se a mão está cheia de potencial
            break;
        }

        if (should_use) {
          console.log(`[BOT] Usando Poder do Joker: ${joker.ability}`);
          // Para o bot, chamamos a lógica diretamente em vez de emitir evento
          execute_joker_power(io, game, game.current_player as PlayerID, joker.id, roomId);
          // Após usar um poder, o bot faz uma pausa e reavalia o turno
          setTimeout(() => execute_bot_move(io, roomId), 1500);
          return;
        }
      }
    }

    // A. Adicionar a Jogos Existentes (PRIORIDADE MÁXIMA)
    // O bot percorre todos os jogos na mesa e tenta pendurar o máximo de cartas possível.
    for (let i = 0; i < team_melds.length; i++) {
      const meld = team_melds[i];
      if (!meld) continue;

      const card_to_add = find_card_to_add(
        my_hand,
        meld,
        has_taken,
        has_clean,
        false,
        [],
        game.mode === "2v2",
        game.rules,
        game.dead_piles.length,
      );
      if (card_to_add) {
        console.log(
          `[BOT] Prioridade: Adicionando ${card_to_add.value} ao jogo ${i} antes de abrir novos.`,
        );
        game.hands[game.current_player] = my_hand.filter(
          (c) => c.id !== card_to_add.id,
        );
        team_melds[i] = organize_meld([...meld, card_to_add], game.rules);

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
      false,
      game.mode === "2v2",
      game.rules,
      game.dead_piles.length,
    );
    if (new_meld_cards) {
      console.log(`[BOT] Baixando novo jogo.`);
      const card_ids = new_meld_cards.map((c) => c.id);
      game.hands[game.current_player] = my_hand.filter(
        (c) => !card_ids.includes(c.id),
      );
      team_melds.push(organize_meld(new_meld_cards, game.rules));

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
      game.rules,
      has_clean,
      game.dead_piles.length,
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
        startTurnTimer(io, roomId);
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
