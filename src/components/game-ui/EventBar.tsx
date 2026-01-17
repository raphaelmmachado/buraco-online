import { motion, AnimatePresence } from "framer-motion";

interface EventBarProps {
  message: string;
  type: "info" | "success" | "warning" | "error" | "combo";
}

export const EventBar = ({ message, type }: EventBarProps) => {
  const textColors = {
    info: "text-blue-300",
    success: "text-green-300",
    warning: "text-yellow-300",
    error: "text-red-300",
    combo: "text-orange-400",
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={message}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`flex items-center justify-center font-black uppercase tracking-wider text-[10px] md:text-xs ${textColors[type]} drop-shadow-md`}
      >
        {message}
      </motion.div>
    </AnimatePresence>
  );
};
