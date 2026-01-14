import { useEffect, useMemo, useRef } from "react";
import start_sound from "../assets/sound/start.mp3";
import pounding_card_sound from "../assets/sound/pounding.mp3";
import flick_card_sound from "../assets/sound/flick-card.mp3";
import flip_card_sound from "../assets/sound/flipcard.mp3";
import card_placement_sound from "../assets/sound/card-placement.mp3";
import cards_sound from "../assets/sound/cards-sound.mp3";
import { type GameAdapterInterface } from "../components/game-ui/useLocalGameAdapter";

export const useGameAudio = (game: GameAdapterInterface, isMyTurn: boolean) => {
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
    }),
    []
  );

  // Helper to safely play sound
  const playSound = (audio: HTMLAudioElement) => {
    // console.log("🔊 Playing Sound:", audio.src);
    audio.currentTime = 0; // Rewind to start for rapid playback
    audio.play().catch((e) => console.warn("Audio play blocked:", e));
  };

  // State trackers to prevent sounds on mount
  const isMounted = useRef(false);
  const prevDeckLen = useRef(game.deck_count);
  const prevDeadPileLen = useRef(game.dead_piles_count);
  const prevMeldsStr = useRef(JSON.stringify(game.team_melds)); // Deep compare string trick
  const prevDiscardLen = useRef(game.discard_pile?.length || 0);

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
  }, [isMyTurn, sfx]);

  // SFX Triggers
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

    // Meld Change (Card placed)
    const currentMeldsStr = JSON.stringify(game.team_melds);
    if (currentMeldsStr !== prevMeldsStr.current) {
      playSound(sfx.flick);
      prevMeldsStr.current = currentMeldsStr;
    }

    // Discard Pile Pickup (Size decreased)
    const currentDiscardLen = game.discard_pile?.length || 0;
    if (currentDiscardLen < prevDiscardLen.current) {
      playSound(sfx.discardPile);
    }
    prevDiscardLen.current = currentDiscardLen;
  }, [
    game.dead_piles_count,
    game.deck_count,
    game.team_melds,
    game.discard_pile,
    sfx,
  ]);
};
