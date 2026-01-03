import { type Card } from "../config/deck.ts";
interface CardProps extends Card {
  hidden?: boolean;
}
export default function Card({
  symbol,
  value,
  color,
  deckIndex,
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
        className="relative h-44 w-24 rounded-md bg-white
      select-none shadow-xl m-1 hover:-rotate-1 font-extrabold  leading-none"
      >
        <div
          className="absolute top-1 left-1
         flex flex-col items-center justify-center"
        >
          <span className={`${colorMap[color]}`}>{value}</span>
          <span className={`${colorMap[color]}`}>{symbol.icon}</span>
        </div>

        <div className={`absolute text-8xl top-8 left-3.5 ${colorMap[color]}`}>
          {symbol.icon}
        </div>

        <div
          className="absolute bottom-1 rotate-180 right-1
         flex flex-col items-center justify-center"
        >
          <span className={`${colorMap[color]}`}>{value}</span>
          <span className={`${colorMap[color]}`}>{symbol.icon}</span>
        </div>
      </div>
    </>
  );
}
