import { useEffect, useRef } from "react";
import { useGameStoreBots } from "../store/useGameStoreBots";
import {
  analyze_discard_pickup,
  choose_discard,
  find_card_to_add,
  find_meld_in_hand,
} from "../../common/utils/bot_logic";
import type { Card } from "../../common/types/card"; // Import Card type

export const useGameBots = () => {
  const store = useGameStoreBots();
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Se o jogo não começou ou é a vez do humano (Player 1), não faz nada
    if (store.status !== "PLAYING" || store.current_player === 1) return;

    const my_hand = store.hands[store.current_player] || [];
    const team_id = store.current_player % 2 !== 0 ? 1 : 2;
    const team_melds = store.team_melds[team_id];

    const playBotTurn = () => {
      const has_taken = store.has_taken_dead_pile[team_id];
      const has_clean = store.internal_can_beat();

      // 1. FASE DE COMPRA (DRAW)
      if (store.turn_phase === "DRAW") {
        // Tenta pegar do lixo
        if (store.discard_pile.length > 0) {
          const top_discard = store.discard_pile[0];

          const all_played_cards = [
            ...store.discard_pile,
            ...store.team_melds[1].flat(),
            ...store.team_melds[2].flat(),
            ...store.dead_piles.flat(),
          ];
          const action = analyze_discard_pickup(
            my_hand,
            top_discard,
            team_melds,
            has_taken,
            has_clean,
            store.discard_pile.length,
            store.deck.length, // Pass deck_size
            all_played_cards,
          );

          if (action) {
            if (action.type === "NEW_MELD") {
              console.log(
                `🤖 Bot ${store.current_player} pegou do lixo (Novo Jogo)!`,
              );
              store.pick_up_discard_new_meld(
                action.cards.map((c: Card) => c.id),
              );
            } else if (action.type === "ADD_TO_MELD") {
              console.log(
                `🤖 Bot ${store.current_player} pegou do lixo (Add ao Jogo ${action.meld_index})!`,
              );
              store.pick_up_discard_add_to_meld(
                action.meld_index,
                action.cards.map((c: Card) => c.id),
              );
            }
            return;
          }
        }

        // Se não deu, compra do monte
        console.log(`🤖 Bot ${store.current_player} comprou do monte.`);
        store.draw_card_from_deck();
      }

      // 2. FASE DE AÇÃO (ACTION)
      else if (store.turn_phase === "ACTION") {
        const has_taken = store.has_taken_dead_pile[team_id];
        const has_clean = store.internal_can_beat();
        const is_desperate = store.deck.length < 10;

        // A. Tenta baixar novo jogo
        const new_meld = find_meld_in_hand(
          my_hand,
          team_melds,
          has_taken,
          has_clean,
          is_desperate,
          store.mode === "2v2",
        );
        if (new_meld) {
          console.log(`🤖 Bot ${store.current_player} baixou jogo.`);
          store.meld_cards(new_meld.map((c) => c.id));
          return; // Espera atualização de estado para continuar
        }

        // B. Tenta adicionar a jogos existentes
        const all_played_cards_for_add = [
          ...store.discard_pile,
          ...store.team_melds[1].flat(),
          ...store.team_melds[2].flat(),
          ...store.dead_piles.flat(),
        ];

        // Desperate if deck is low (game ending soon)

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
            console.log(
              `🤖 Bot ${store.current_player} adicionou ao jogo ${i}.`,
            );
            store.add_card_to_meld([card_to_add.id], i);
            return; // Espera atualização
          }
        }

        // C. Se não tem mais ações, descarta
        const opponent_melds =
          team_id === 1 ? store.team_melds[2] : store.team_melds[1]; // Assuming 2 teams
        const all_played_cards = [
          ...store.discard_pile,
          ...store.team_melds[1].flat(),
          ...store.team_melds[2].flat(),
          ...store.dead_piles.flat(),
        ];
        const card_to_discard = choose_discard(
          my_hand,
          opponent_melds,
          store.discard_pile.length > 0 ? store.discard_pile[0] : null,
          has_taken,
          store.deck.length, // Pass deck_size
          all_played_cards,
        );
        if (card_to_discard) {
          console.log(
            `🤖 Bot ${store.current_player} descartou ${card_to_discard.value}.`,
          );
          store.discard_card(card_to_discard.id);
        }
      }
    };

    // Adiciona delay para "pensar"
    const delay = Math.random() * 1000 + 1000; // 1s a 2s
    timeoutRef.current = setTimeout(playBotTurn, delay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [
    store.current_player,
    store.status,
    store.turn_phase,
    store.hands, // Importante: Roda de novo quando a mão muda (após draw/meld)
    // store.discard_pile, // Trigger se lixo mudar
    // store.team_melds // Trigger se jogos mudarem
  ]);
};
