import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../../store/useGameStore";

interface EventBalloonProps {
  message: string;
  team?: "mine" | "opponent" | "neutral"; // Optional now
  customColor?: string; // Allow overriding color (e.g. for timer)
  isStatic?: boolean; // If true, stays in place instead of floating up/away
  pulse?: boolean; // Optional pulsing effect
  x: number;
  y: number;
}

export const EventBalloon = ({ 
  message, 
  team = "neutral", 
  customColor,
  isStatic = false,
  pulse = false,
  x, 
  y 
}: EventBalloonProps) => {
  const showAnimations = useGameStore((s) => s.showAnimations);

  const bgColors = {
    mine: "bg-blue-600",
    opponent: "bg-red-700",
    neutral: "bg-gray-600",
  };

  const bgColor = customColor || bgColors[team];

  if (x === 0 && y === 0) return null;

  // Animation props
  const initial = isStatic 
      ? { opacity: 0, y: y - 50, scale: 0.8 }
      : { opacity: 0, y: y, scale: 0.9 };

  const animate = isStatic
      ? { opacity: 1, y: y - 50, scale: 1 }
      : { opacity: 1, y: y - 40, scale: 1 };
      
  const exit = isStatic
      ? { opacity: 0, scale: 0.8 }
      : { opacity: 0, y: y - 50, scale: 0.9 };

  const transition = !showAnimations 
      ? { duration: 0 } 
      : (isStatic
          ? { type: "spring", stiffness: 300, damping: 20 }
          : { type: "tween", ease: "easeOut", duration: 0.3 });

  // For exit transition on non-static, we handle it in the exit prop itself usually, 
  // but framer motion uses the 'transition' prop for both unless overridden.
  // The original code had delay in exit.
  
  const exitTransition = !showAnimations 
      ? { duration: 0 } 
      : (!isStatic ? { duration: 0.3, delay: 2.5 } : undefined);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={isStatic ? "static-balloon" : message}
        initial={initial}
        animate={{ ...animate, transition: transition as never }}
        exit={{ ...exit, transition: (exitTransition || transition) as never }}
        style={{
          position: "fixed",
          top: 0,
          left: x,
        }}
        className={`z-50 pointer-events-none whitespace-nowrap -translate-x-1/2 px-3 py-1 rounded-full shadow-lg border border-white/10 text-xs font-black text-white ${bgColor} ${pulse ? 'animate-pulse' : ''}`}
      >
        {message}
        {/* Arrow */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-inherit border-b border-r border-white/10"></div>
      </motion.div>
    </AnimatePresence>
  );
};