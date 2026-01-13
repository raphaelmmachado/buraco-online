import { Skull } from "lucide-react";

export default function TookDeadPile({
  took,
  position,
  myTeam,
}: {
  took: boolean;
  position: string;
  myTeam?: boolean;
}) {
  if (!took) return null;

  return (
    <div
      className={`absolute ${position} bg-red-950/30 border border-red-900/10 px-2 md:px-4 py-1 md:py-2 rounded-lg shadow-inner flex items-center gap-2`}
    >
      <Skull size={14} className="text-white" />
      <span
        className="text-[8px] md:text-xs
       text-white leading-none uppercase tracking-tight"
      >
        Pegou
      </span>
    </div>
  );
}
