import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import shufflingSound from "../../assets/sound/shuffling-cards.mp3";

export const LoadingScreen = ({
  message = "Embaralhando",
  subMessage = "Preparando a mesa...",
}: {
  message?: string;
  subMessage?: string;
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio
    audioRef.current = new Audio(shufflingSound);
    audioRef.current.volume = 0.5;

    // Play audio
    const playAudio = async () => {
      try {
        if (audioRef.current) {
          await audioRef.current.play();
        }
      } catch (err) {
        console.warn("Audio autoplay failed:", err);
      }
    };

    playAudio();

    // Cleanup: Stop audio on unmount (when loading finishes)
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = ""; // Release memory
        audioRef.current = null; // Clear reference
      }
    };
  }, []);

  return (
    <div className="h-screen w-screen bg-[#0f2e1a] flex flex-col items-center justify-center text-white relative overflow-hidden">
      {/* Background Texture */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }}
      ></div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="z-10 flex flex-col items-center gap-6"
      >
        {/* Card Shuffling Animation Simulation */}
        <div className="relative w-24 h-32">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 bg-white border-2 border-gray-300 rounded-lg shadow-xl"
              initial={{ x: 0, y: 0, rotate: 0 }}
              animate={{
                x: [0, -20, 20, 0],
                y: [0, -5, -5, 0],
                rotate: [0, -10, 10, 0],
                zIndex: [i, i + 1, i],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
              style={{
                backfaceVisibility: "hidden",
                backgroundImage:
                  "repeating-linear-gradient(45deg, #e5e7eb 0px, #e5e7eb 2px, #f3f4f6 2px, #f3f4f6 8px)",
              }}
            />
          ))}
        </div>

        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex flex-col items-center"
        >
          <h2 className="text-2xl font-black uppercase tracking-widest text-yellow-400 drop-shadow-lg text-center">
            {message}
          </h2>
          <p className="text-xs text-white/50 font-mono mt-2 text-center">
            {subMessage}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};