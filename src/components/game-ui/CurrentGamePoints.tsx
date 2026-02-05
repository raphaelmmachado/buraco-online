export default function CurrentGamePoints({
  points,
  position,
}: {
  points: number;
  position: string;
}) {
  return (
    <>
      {" "}
      <div
        className={`absolute ${position} bg-green-950 border border-green-900/10 px-2 md:px-4 py-1 md:py-1 rounded-xl
          shadow-inner flex items-center`}
      >
        <span className="text-sm font-mono text-white leading-none">
          {points}{" "}
          <span className="text-[5px] md:text-[10px] text-gray-400 uppercase ml-1">
            pt
          </span>
        </span>
      </div>{" "}
    </>
  );
}
