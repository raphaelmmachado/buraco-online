import { useEffect } from "react";
import { useGameStore } from "../store/useGameStore";

export const useGameBots = () => {
  const {
    current_player,
    status,
    draw_card_from_deck,
    discard_card,
    hands,
    turn_phase,
  } = useGameStore();

  useEffect(() => {
    // Se o jogo não começou ou é a vez do humano (Player 1), não faz nada
    if (status !== "PLAYING" || current_player === 1) return;

    let timeoutId: number;

    const playBotTurn = async () => {
      console.log(`🤖 Bot (Player ${current_player}) pensando...`);

      // 1. FASE DE COMPRA (DRAW)
      if (turn_phase === "DRAW") {
        // Simula um "tempo de pensamento"
        timeoutId = setTimeout(() => {
          draw_card_from_deck();
        }, 1000); // 1 segundo para comprar
      }

      // 2. FASE DE AÇÃO (ACTION) - O Bot apenas descarta para passar a vez
      else if (turn_phase === "ACTION") {
        timeoutId = setTimeout(() => {
          const botHand = hands[current_player];

          if (botHand.length > 0) {
            // Estratégia "Burra": Descarta a primeira carta da mão
            // (Para testar melhor, descarta a última que comprou para não quebrar jogos prontos se tivesse IA)
            const cardToDiscard = botHand[botHand.length - 1];
            console.log(
              `🤖 Bot descartou: ${cardToDiscard.value} de ${cardToDiscard.symbol.name}`
            );
            discard_card(cardToDiscard.id);
          }
        }, 1500); // 1.5 segundos para descartar
      }
    };

    playBotTurn();

    return () => clearTimeout(timeoutId);
  }, [current_player, status, turn_phase, hands]); // Dependências para rodar sempre que mudar
};
