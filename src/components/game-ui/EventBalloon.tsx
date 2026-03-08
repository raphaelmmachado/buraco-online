import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../../store/useGameStore";
import { Eye, Hand, SkipForward, ArrowLeftRight, Trophy, AlertCircle } from "lucide-react";

interface EventBalloonProps {
  message: string;
  team?: "mine" | "opponent" | "neutral"; // Optional now
  customColor?: string; // Allow overriding color (e.g. for timer)
  isStatic?: boolean; // If true, stays in place instead of floating up/away
  pulse?: boolean; // Optional pulsing effect
  x: number;
  y: number;
}

const IconMapper: Record<string, React.ReactNode> = {
  "EYE": <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />,
  "STEAL": <Hand className="w-3.5 h-3.5 md:w-4 md:h-4" />,
  "SKIP": <SkipForward className="w-3.5 h-3.5 md:w-4 md:h-4" />,
  "SWAP": <ArrowLeftRight className="w-3.5 h-3.5 md:w-4 md:h-4" />,
  "WIN": <Trophy className="w-3.5 h-3.5 md:w-4 md:h-4" />,
  "ALERT": <AlertCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />,
};

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

  if (!isStatic && x === 0 && y === 0) return null;

  // Render message with potential icons
  const renderContent = () => {
    // Detect if there are cards in brackets like [A♥] and remove brackets if any, 
    // though we already removed them from sources. Let's just handle the text.
    
    if (message.includes(":") && (message.includes("♥") || message.includes("♦") || message.includes("♣") || message.includes("♠"))) {
      const lastColonIndex = message.lastIndexOf(":");
      let prefix = message.substring(0, lastColonIndex + 1);
      const cardsPart = message.substring(lastColonIndex + 1).trim();
      const cards = cardsPart.split(" ").filter(c => c.length > 0);

      // Handle icons in prefix
      let iconNode = null;
      Object.keys(IconMapper).forEach(key => {
        if (prefix.includes(`[${key}]`)) {
          iconNode = IconMapper[key];
          prefix = prefix.replace(`[${key}]`, "").trim();
        }
      });

      return (
        <div className="flex items-center gap-1.5 md:gap-2">
          {iconNode}
          <span className="text-[10px] md:text-sm">{prefix}</span>
          <div className="flex flex-wrap gap-1 items-center">
            {cards.map((card, idx) => (
              <span 
                key={idx} 
                className="bg-white text-gray-900 px-1 md:px-1.5 py-0.5 md:py-0.5 rounded shadow-sm border border-gray-200 flex items-center justify-center min-w-[18px] md:min-w-[22px] text-[8px] md:text-[10px] leading-none font-black notranslate"
                translate="no"
              >
                {card}
              </span>
            ))}
          </div>
        </div>
      );
    }

    // General message with potential icon
    let iconNode = null;
    let finalMessage = message;
    Object.keys(IconMapper).forEach(key => {
      if (finalMessage.includes(`[${key}]`)) {
        iconNode = IconMapper[key];
        finalMessage = finalMessage.replace(`[${key}]`, "").trim();
      }
    });

    if (iconNode) {
      return (
        <div className="flex items-center gap-1.5 md:gap-2">
          {iconNode}
          <span className="text-[10px] md:text-sm font-black">{finalMessage}</span>
        </div>
      );
    }

    return <span className="text-[10px] md:text-sm font-black">{message}</span>;
  };

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
  
  const exitTransition = !showAnimations 
      ? { duration: 0 } 
      : (!isStatic ? { duration: 0.3, delay: 2.5 } : undefined);

  const isPositioned = x !== 0 || y !== 0;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={isStatic ? "static-balloon" : message}
        initial={initial}
        animate={{ ...animate, transition: transition as never }}
        exit={{ ...exit, transition: (exitTransition || transition) as never }}
        style={{
          position: isPositioned ? "fixed" : (isStatic ? "relative" : "fixed"),
          top: isPositioned ? 0 : (isStatic ? undefined : 0),
          left: isPositioned ? x : (isStatic ? undefined : x),
        }}
        className={`z-50 pointer-events-none whitespace-nowrap ${!isPositioned && isStatic ? "" : "-translate-x-1/2"} px-2 md:px-3 py-1 md:py-1.5 rounded-full shadow-lg border border-white/10 text-white ${bgColor} ${pulse ? 'animate-pulse' : ''}`}
      >
        {renderContent()}
        {/* Arrow */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 md:w-2 md:h-2 rotate-45 bg-inherit border-b border-r border-white/10"></div>
      </motion.div>
    </AnimatePresence>
  );
};