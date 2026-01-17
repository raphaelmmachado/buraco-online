import { motion, AnimatePresence } from "framer-motion";

interface EventBalloonProps {
  message: string;
  team: "mine" | "opponent" | "neutral";
  x: number;
  y: number;
}

export const EventBalloon = ({ message, team, x, y }: EventBalloonProps) => {
  const bgColors = {
    mine: "bg-blue-600",
    opponent: "bg-red-700",
    neutral: "bg-gray-600",
  };

  if (x === 0 && y === 0) {
    return null; // Don't render if position is not calculated yet
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: y, scale: 0.9 }}
        animate={{
          opacity: 1,
          y: y - 40, // Animate upwards from the given y
          scale: 1,
          transition: { type: "tween", ease: "easeOut", duration: 0.3 },
        }}
        exit={{
          opacity: 0,
          y: y - 50,
          scale: 0.9,
          transition: { duration: 0.3, delay: 2.5 }, // Stays for 2.5s before fading
        }}
        // Use fixed position to render relative to the viewport
        style={{
          position: "fixed",
          top: 0, // y is already handling the vertical position
          left: x, // x is centered already
        }}
        className={`z-50 pointer-events-none whitespace-nowrap -translate-x-1/2 px-3 py-1 rounded-full shadow-lg border border-white/10 text-xs font-semibold text-white ${bgColors[team]}`}
      >
        {message}
        {/* Arrow pointing down, as it will be above the element */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-inherit border-b border-r border-white/10"></div>
      </motion.div>
    </AnimatePresence>
  );
};
