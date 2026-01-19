import { useEffect, useState } from "react";
import { useGameStore } from "../../store/useGameStore";
import { EventBalloon } from "./EventBalloon";

interface TimerBalloonProps {
  x: number;
  y: number;
}

export const TimerBalloon = ({ x, y }: TimerBalloonProps) => {
  const turn_start_time = useGameStore((s) => s.turn_start_time);
  const turn_phase = useGameStore((s) => s.turn_phase);
  const status = useGameStore((s) => s.status);
  
  const duration = turn_phase === "DRAW" ? 30 : 60;
  
  // Initialize state lazily to reduce hydration mismatch if possible, 
  // though for client-side timer it's less critical.
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    const update = () => {
        if (!turn_start_time || status !== "PLAYING") {
            setTimeLeft(duration);
            return;
        }
        const now = Date.now();
        const elapsed = (now - turn_start_time) / 1000;
        setTimeLeft(Math.max(0, duration - elapsed));
    };

    // Run immediately (async) to update view without waiting for first interval tick
    // and without triggering "synchronous setState in effect" warning.
    const timeoutId = setTimeout(update, 0);
    const intervalId = setInterval(update, 200);

    return () => {
        clearTimeout(timeoutId);
        clearInterval(intervalId);
    };
  }, [turn_start_time, status, duration]);

  if (x === 0 && y === 0) return null;
  
  // Show only when 10 seconds or less remain
  if (timeLeft > 10) return null;

  const isCritical = timeLeft < 5;
  const color = isCritical ? "bg-red-600" : "bg-red-900/90 text-white border-red-500";

  return (
    <EventBalloon 
        message={`${Math.ceil(timeLeft)}s`}
        x={x}
        y={y}
        isStatic={true}
        customColor={color}
        pulse={isCritical}
    />
  );
};
