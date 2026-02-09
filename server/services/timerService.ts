import { Server } from "socket.io";
import { games, saveState } from "../state";
import { broadcast_game_update, process_bot_turn } from "./botService";
import { sort_cards } from "../../common/utils/sort_cards";
import {
  get_next_player,
  get_team,
  has_clean_canastra,
  requires_clean_to_empty_hand,
  handle_empty_hand,
  check_championship_status,
} from "./gameService";
import { calculate_score } from "../../common/utils/scoring";
import type { PlayerID } from "../types";

const timers: Record<string, NodeJS.Timeout> = {};

export const stopTurnTimer = (roomId: string) => {
  if (timers[roomId]) {
    clearTimeout(timers[roomId]);
    delete timers[roomId];
  }
};

export const startTurnTimer = (io: Server, roomId: string) => {
  stopTurnTimer(roomId); // Clear existing

  const game = games[roomId];
  if (!game || game.status !== "PLAYING") return;

  // Bot check
  const pData = game.players_data[game.current_player as PlayerID];
  if (pData && pData.isBot) {
    game.turn_start_time = undefined;
    return;
  }

  game.turn_start_time = Date.now();

  // 20s for DRAW phase, 60s for ACTION phase
  const duration = game.turn_phase === "DRAW" ? 20000 : 60000;

  timers[roomId] = setTimeout(() => {
    handleTurnTimeout(io, roomId);
  }, duration);
};

const handleTurnTimeout = (io: Server, roomId: string) => {
  const game = games[roomId];
  if (!game || game.status !== "PLAYING") return;

  const player_id = game.current_player;
  const team_id = get_team(player_id);

  console.log(
    `[TIMER] Auto-playing for Player ${player_id} in ${game.turn_phase}`,
  );

  if (game.turn_phase === "DRAW") {
    // 1. AUTO DRAW
    if (game.deck.length === 0) {
      // Lógica de fim de deck (igual ao gameController)
      if (game.dead_piles.length > 0) {
        const new_deck = game.dead_piles.shift();
        if (new_deck) game.deck = new_deck;
      } else {
        finishGame(io, roomId);
        return;
      }
    }

    if (game.deck.length > 0) {
      const card = game.deck.shift();
      const player_hand = game.hands[player_id];
      if (card && player_hand) {
        player_hand.unshift(card);
        game.hands[player_id] = sort_cards(player_hand);
        game.last_drawn_card_id = card.id;
        game.turn_phase = "ACTION";

        // Reinicia timer para fase de Ação
        startTurnTimer(io, roomId);
      }
    }
  } else {
    // 2. AUTO DISCARD (ACTION PHASE)
    const current_hand = game.hands[player_id];
    if (!current_hand || current_hand.length === 0) {
      // Se a mão estiver vazia de alguma forma bizarra, força next turn
      game.turn_phase = "DRAW";
      game.current_player = get_next_player(game.current_player, game.mode);
      startTurnTimer(io, roomId);
      broadcast_game_update(io, roomId);
      return;
    }

    // Tenta achar uma carta "segura" para descartar (que não quebre regras de batida)
    // Se tiver só 1 carta e não tiver canastra limpa, não pode bater.
    // Mas o timeout FORÇA o descarte. Se forçar descarte e ficar com 0 cartas sem limpa,
    // teoricamente não poderia.
    // SOLUÇÃO: Se for bater errado, pegamos uma carta aleatória?
    // Não, regra de ouro: Se for bater errado, "bate errado" e toma penalidade?
    // No Buraco, você simplesmente não pode jogar a carta.
    // Se o timer estourar e a ÚNICA jogada possível for ilegal (bater sem limpa),
    // o jogo deve travar ou passar a vez sem descartar? (Não existe passar sem descarte).

    // Simplificação para Auto-Play:
    // Escolhe uma carta aleatória.
    const card_to_discard =
      current_hand[Math.floor(Math.random() * current_hand.length)];
    if (!card_to_discard) return;

    // Verifica se esse descarte faria bater sem limpa
    const new_hand_len = current_hand.length - 1;
    if (new_hand_len === 0 && requires_clean_to_empty_hand(game, team_id)) {
      if (!has_clean_canastra(game, team_id)) {
        // Ops, vai tentar bater sem limpa.
        // Se tiver mais de 1 carta, tenta outra.
        if (current_hand.length > 1) {
          // Tenta achar uma que não seja a selecionada?
          // Na verdade, se ele tem 2 cartas, descartar 1 deixa 1 na mão. Não bate.
          // O problema é se ele tem 1 carta na mão.
          // Se tem 1 carta, descartar deixa com 0 -> Bate.
          // Se não tem limpa, não pode descartar essa carta.
          // TRAVADO. O jogador deveria ter comprado do lixo ou não baixado tudo.
          // Solução de Emergência: Não descarta, apenas passa a vez? (Quebra regra).
          // Solução de Buraco Online: Compra o lixo de volta?

          // Decisão: Mantém a carta na mão e passa a vez sem descarte? (Quebra fluxo).
          // Decisão 2: Força o descarte e ignora a regra da limpa? (Quebra regra).
          // Decisão 3: "Passa a vez" simulando um descarte invisível?

          console.log(
            "[TIMER] Jogador travado (não pode bater sem limpa). Passando vez sem descarte (exceção).",
          );
          game.turn_phase = "DRAW";
          game.current_player = get_next_player(game.current_player, game.mode);
          game.last_drawn_card_id = null;
          startTurnTimer(io, roomId);
          broadcast_game_update(io, roomId);
          saveState();
          return;
        }
      }
    }

    // Executa descarte
    game.hands[player_id] = current_hand.filter(
      (c) => c.id !== card_to_discard.id,
    );
    game.discard_pile.unshift(card_to_discard);

    const updated_hand = game.hands[player_id];

    if (updated_hand && updated_hand.length === 0) {
      // Bateu
      handle_empty_hand(game, player_id as PlayerID, "INDIRECT");
      // Se pegou morto indireto, continua na ACTION do mesmo jogador?
      // handle_empty_hand define.
      // Se indirect, pegou morto e só. O turno acaba?
      // No Buraco, bateu indireto (descartou a última), pega morto e o turno ACABA. O próximo joga.
      // Exceto se for morto direto (sem descarte), aí continua jogando.
      // Aqui foi descarte, então é indireto.

      // Verificando lógica do handle_empty_hand...
      // Se pegou morto, game.hands atualizado.
      // Mas o turno passa para o próximo?
      // Sim, o descarte encerra o turno.
    } else if (updated_hand) {
      game.hands[player_id] = sort_cards(updated_hand);
    }

    if ((game.status as string) !== "FINISHED") {
      game.turn_phase = "DRAW";
      game.current_player = get_next_player(game.current_player, game.mode);
      game.last_drawn_card_id = null;
      startTurnTimer(io, roomId); // Timer pro próximo

      // Check if next player is bot (Critical for auto-play continuity)
      const nextPData = game.players_data[game.current_player as PlayerID];
      if (nextPData && nextPData.isBot) {
        process_bot_turn(io, roomId);
      }
    } else {
      stopTurnTimer(roomId);
    }
  }

  saveState();
  broadcast_game_update(io, roomId);
};

const finishGame = (io: Server, roomId: string) => {
  const game = games[roomId];
  if (!game) return;

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
    game.rules
  );
  const t2_score = calculate_score(
    t2_melds,
    [t2_hand_1, t2_hand_2],
    false,
    !t2_taken,
    game.rules
  );

  check_championship_status(game, t1_score.total_score, t2_score.total_score, t1_score, t2_score);
  stopTurnTimer(roomId);
  broadcast_game_update(io, roomId);
};
