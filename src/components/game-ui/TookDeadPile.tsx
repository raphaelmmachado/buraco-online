import { Skull } from "lucide-react";

export default function TookDeadPile({
  took,
  position,
}: {
  took: boolean;
  position: string;
}) {
  if (!took) return null;

  return (
    <div
      className={`absolute ${position} bg-red-950/30 border border-red-900/10 px-2 md:px-4 py-1 md:py-1  rounded-xl shadow-inner flex items-center gap-2`}
    >
      <span
        className="text-[8px] md:text-[10px]
       text-white leading-none uppercase"
      >
        Pegou
      </span>
      <Skull size={14} className="text-white" />
    </div>
  );
}
