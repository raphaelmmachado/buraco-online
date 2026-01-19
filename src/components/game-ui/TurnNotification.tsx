import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../../store/useGameStore";

export const TurnNotification = () => {
  const current_player = useGameStore((s) => s.current_player);
  const my_player_number = useGameStore((s) => s.my_player_number);
  const showAnimations = useGameStore((s) => s.showAnimations);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (current_player === my_player_number) {
      // Defer state update to avoid render cycle issues
      setTimeout(() => setShow(true), 0);
      const timer = setTimeout(() => setShow(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [current_player, my_player_number]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 0 }}
          animate={{ opacity: 1, scale: 1.2, y: -50 }}
          exit={{ opacity: 0, scale: 1.5, filter: "blur(10px)" }}
          transition={showAnimations ? { type: "spring", stiffness: 300, damping: 20 } : { duration: 0 }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] pointer-events-none text-center"
        >
          <h1 className="text-6xl md:text-8xl font-black text-yellow-400 drop-shadow-[0_0_25px_rgba(234,179,8,0.8)] uppercase italic tracking-tighter transform -rotate-3">
            SUA VEZ!
          </h1>
          <p className="text-white font-bold text-xl mt-2 drop-shadow-md tracking-widest">
            COMPRE UMA CARTA
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
