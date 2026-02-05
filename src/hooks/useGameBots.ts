import { useEffect, useRef } from "react";
import { useGameStoreBots } from "../store/useGameStoreBots";
import {
  analyze_discard_pickup,
  choose_discard,
  find_card_to_add,
  find_meld_in_hand,
} from "../../common/utils/bot_logic";
import type { Card } from "../../common/types/card";

/**
 * Hook customizado que gerencia a execução dos turnos dos Bots no modo Local.
 * Ele observa o estado do jogo e, quando é a vez de um bot, dispara as ações necessárias.
 */
export const useGameBots = () => {
  const store = useGameStoreBots();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Se o jogo não estiver rodando ou for a vez do jogador humano (Player 1), não faz nada.
    if (store.status !== "PLAYING" || store.current_player === 1) return;

    // Identifica qual é a mão do bot atual e qual sua equipe.
    const my_hand = store.hands[store.current_player] || [];
    const team_id = store.current_player % 2 !== 0 ? 1 : 2;
    const team_melds = store.team_melds[team_id];

    /** Função principal que executa a lógica do turno do bot. */
    const playBotTurn = () => {
      const has_taken = store.has_taken_dead_pile[team_id];
      const has_clean = store.internal_can_beat(); // Verifica se já tem canastra limpa para bater.

      // --- FASE DE COMPRA (DRAW) ---
      if (store.turn_phase === "DRAW") {
        // 1. Tenta pegar a carta do topo do lixo.
        if (store.discard_pile.length > 0) {
          const top_discard = store.discard_pile[0];

          const action = analyze_discard_pickup(
            my_hand,
            top_discard,
            team_melds,
            has_taken,
            has_clean,
            store.discard_pile.length,
            store.deck.length,
          );

          if (action) {
            if (action.type === "NEW_MELD") {
              console.log(`🤖 Bot ${store.current_player} pegou lixo (Novo Jogo)!`);
              store.pick_up_discard_new_meld(action.cards.map((c: Card) => c.id));
            } else if (action.type === "ADD_TO_MELD") {
              console.log(`🤖 Bot ${store.current_player} pegou lixo (Adicionar)!`);
              store.pick_up_discard_add_to_meld(action.meld_index, action.cards.map((c: Card) => c.id));
            }
            return; // Após pegar o lixo, o turno continua na fase de ação.
          }
        }

        // 2. Se não pegou do lixo, compra obrigatoriamente do monte.
        console.log(`🤖 Bot ${store.current_player} comprou do monte.`);
        store.draw_card_from_deck();
      }

      // --- FASE DE AÇÃO (ACTION) ---
      else if (store.turn_phase === "ACTION") {
        const has_taken = store.has_taken_dead_pile[team_id];
        const has_clean = store.internal_can_beat();
        const is_desperate = store.deck.length < 10; // Modo desespero se o monte estiver acabando.

        // A. PRIORIDADE: Tenta adicionar cartas a jogos que já estão na mesa.
        const all_played_cards_for_add = [
          ...store.discard_pile,
          ...store.team_melds[1].flat(),
          ...store.team_melds[2].flat(),
          ...store.dead_piles.flat(),
        ];

        for (let i = 0; i < team_melds.length; i++) {
          const card_to_add = find_card_to_add(
            my_hand,
            team_melds[i],
            has_taken,
            has_clean,
            is_desperate,
            all_played_cards_for_add,
            store.mode === "2v2",
          );
          if (card_to_add) {
            console.log(`🤖 Bot ${store.current_player} adicionou ao jogo ${i}.`);
            store.add_card_to_meld([card_to_add.id], i);
            return; // Sai para esperar a atualização do estado do componente.
          }
        }

        // B. Tenta baixar um NOVO jogo da mão.
        const new_meld = find_meld_in_hand(
          my_hand,
          team_melds,
          has_taken,
          has_clean,
          is_desperate,
          store.mode === "2v2",
        );
        if (new_meld) {
          console.log(`🤖 Bot ${store.current_player} baixou um novo jogo.`);
          store.meld_cards(new_meld.map((c) => c.id));
          return;
        }

        // C. Se não tem mais o que fazer, DESCARTA uma carta para encerrar o turno.
        const opponent_melds = team_id === 1 ? store.team_melds[2] : store.team_melds[1];
        
        // Identifica o parceiro para fins de estratégia (ex: não dar carta que ele precisa).
        let partner_id = 0;
        if (team_id === 1) partner_id = store.current_player === 1 ? 3 : 1;
        else partner_id = store.current_player === 2 ? 4 : 2;
        const partner_hand_size = store.hands[partner_id]?.length || 0;

        const card_to_discard = choose_discard(
          my_hand,
          opponent_melds,
          store.discard_pile.length > 0 ? store.discard_pile[0] : null,
          has_taken,
          store.deck.length, 
          store.discard_pile.length,
          partner_hand_size
        );

        if (card_to_discard) {
          console.log(`🤖 Bot ${store.current_player} descartou ${card_to_discard.value}.`);
          store.discard_card(card_to_discard.id);
        }
      }
    };

    // Adiciona um atraso aleatório (entre 1s e 2s) para simular o tempo de pensamento do bot.
    const delay = Math.random() * 1000 + 1000;
    timeoutRef.current = setTimeout(playBotTurn, delay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [store]); // Re-executa sempre que o estado da 'store' mudar e for a vez do bot.
};