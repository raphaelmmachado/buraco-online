import { type Card } from "../../common/types/card";
interface CardProps extends Card {
  hidden?: boolean;
  onClick?: () => void;
  isSelected: boolean;
}
export default function Card({
  suit,
  value,
  color,
  deckIndex,
  onClick,
  isSelected,
  hidden = false,
}: CardProps) {
  const colorMap = {
    red: "text-red-600",
    black: "text-gray-900",
  };

  if (hidden) {
    return (
      <>
        <div
          className={`${
            deckIndex === 0 ? "bg-blue-950" : "bg-red-950"
          } h-44 w-24 rounded-md shadow-xl hover:rotate-1 border border-white`}
        ></div>
      </>
    );
  }

  return (
    <>
      <div
        onClick={onClick}
        className={`relative h-32 w-20 rounded-md tracking-tighter bg-white transition ${
          isSelected ? "outline-2 outline-amber-400 -translate-y-3" : ""
        }
           select-none shadow-xl m-1 font-extrabold  leading-none`}
      >
        <div
          className="absolute top-1 left-1
         flex flex-col items-center justify-center"
        >
          <span className={`${colorMap[color]}`}>{value}</span>
          <span className={`${colorMap[color]}`}>{suit.icon}</span>
        </div>

        <div className={`absolute text-7xl top-6 left-3.5 ${colorMap[color]}`}>
          {suit.icon}
        </div>

        <div
          className="absolute bottom-1 rotate-180 right-1
         flex flex-col items-center justify-center"
        >
          <span className={`${colorMap[color]}`}>{value}</span>
          <span className={`${colorMap[color]}`}>{suit.icon}</span>
        </div>
      </div>
    </>
  );
}
