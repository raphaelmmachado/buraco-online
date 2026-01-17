import { useCallback, useEffect, useMemo, useRef } from "react";
import start_sound from "../assets/sound/your-turn.mp3";
import pounding_card_sound from "../assets/sound/pounding.mp3";
import flick_card_sound from "../assets/sound/flick-card.mp3";
import flip_card_sound from "../assets/sound/flipcard.mp3";
import card_placement_sound from "../assets/sound/card-placement.mp3";
import cards_sound from "../assets/sound/cards-sound.mp3";
import card_drop_sound from "../assets/sound/card_drop.mp3";
import { type GameAdapterInterface } from "../components/game-ui/useLocalGameAdapter";
import { useGameStore } from "../store/useGameStore";

export const useGameAudio = (game: GameAdapterInterface, isMyTurn: boolean) => {
  const isMuted = useGameStore((state) => state.isMuted);

  // --- AUDIO SYSTEM (Optimized) ---
  // Memoize audio instances so they are not re-created on every render
  const sfx = useMemo(
    () => ({
      start: new Audio(start_sound),
      deadPile: new Audio(pounding_card_sound),
      flick: new Audio(flick_card_sound),
      flip: new Audio(flip_card_sound),
      placement: new Audio(card_placement_sound),
      discardPile: new Audio(cards_sound),
      cardDrop: new Audio(card_drop_sound),
    }),
    [],
  );

  // Helper to safely play sound
  const playSound = useCallback(
    (audio: HTMLAudioElement) => {
      if (isMuted) return; // Silent mode
      audio.currentTime = 0; // Rewind to start for rapid playback
      audio.play().catch((e) => console.warn("Audio play blocked:", e));
    },
    [isMuted],
  );

  // State trackers to prevent sounds on mount
  const isMounted = useRef(false);
  const prevDeckLen = useRef(game.deck_count);
  const prevDeadPileLen = useRef(game.dead_piles_count);
  const prevDiscardLen = useRef(game.discard_pile?.length || 0);
  const prevCardsPlayed = useRef(game.cardsPlayedThisTurn);

  // Notification & Start Sound
  useEffect(() => {
    if (isMyTurn) {
      playSound(sfx.start);
      if (document.hidden) {
        new Notification("É sua vez!", {
          body: "Compre uma carta do monte ou pegue o lixo.",
        });
      }
    }
  }, [isMyTurn, sfx, playSound]);

  // SFX Triggers for regular actions
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }

    // Dead Pile Taken
    if (game.dead_piles_count < prevDeadPileLen.current) {
      playSound(sfx.deadPile);
    }
    prevDeadPileLen.current = game.dead_piles_count;

    // Deck Draw (Deck size decreased)
    if (game.deck_count < prevDeckLen.current) {
      playSound(sfx.flip);
    }
    prevDeckLen.current = game.deck_count;

    // Card Placed (Detected via cardsPlayedThisTurn counter)
    if (game.cardsPlayedThisTurn > prevCardsPlayed.current) {
      playSound(sfx.flick);
    }
    prevCardsPlayed.current = game.cardsPlayedThisTurn;

    // Discard Pile Change
    const currentDiscardLen = game.discard_pile?.length || 0;
    // Discard Pile Pickup (Size decreased)
    if (currentDiscardLen < prevDiscardLen.current) {
      playSound(sfx.discardPile);
    }
    // Card Dropped on Pile (Size increased)
    if (currentDiscardLen > prevDiscardLen.current) {
      playSound(sfx.cardDrop);
    }
    prevDiscardLen.current = currentDiscardLen;
  }, [
    game.dead_piles_count,
    game.deck_count,
    game.cardsPlayedThisTurn,
    game.discard_pile,
    sfx,
    playSound,
  ]);
};