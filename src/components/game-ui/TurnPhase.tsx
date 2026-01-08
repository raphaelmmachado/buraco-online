import { useEffect } from "react";
import start_sound from "../../sound/start.wav";
const start_audio = new Audio(start_sound);
interface Props {
  isMyTurn: boolean;
  turnPhase: string;
}
function TurnPhase({ isMyTurn, turnPhase }: Props) {
  useEffect(() => {
    if (isMyTurn) {
      start_audio.play();
      if (document.hidden) {
        new Notification("É sua vez!", {
          body: "Volte para o jogo 🎮",
        });
        start_audio.play();
      }
    }
    let timeout;
  }, [isMyTurn]);

  if (isMyTurn) {
    return (
      <>
        <div></div>
      </>
    );
  }
}
export { TurnPhase };
