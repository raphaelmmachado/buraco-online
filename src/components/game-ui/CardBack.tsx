interface CardBackProps {
  color?: "red" | "blue";
  className?: string;
  style?: React.CSSProperties;
}

export const CardBack = ({
  color = "blue",
  className = "",
  style,
}: CardBackProps) => {
  const baseColor = color === "blue" ? "bg-blue-800" : "bg-red-800";
  const patternColor = color === "blue" ? "text-blue-600" : "text-red-600";
  const borderColor = color === "blue" ? "border-blue-200" : "border-red-200";

  return (
    <div
      className={`
        relative rounded-md shadow-md border-2 ${borderColor} ${baseColor} 
        flex items-center justify-center overflow-hidden
        w-full h-full
        ${className}
      `}
      style={style}
    >
      {/* Padrão decorativo simples */}
      <div
        className={`absolute inset-1 border ${
          color === "blue" ? "border-blue-600" : "border-red-600"
        } rounded-sm`}
      />
      <div
        className={`w-full h-full opacity-20 ${patternColor}`}
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "8px 8px",
        }}
      />
      
      {/* Círculo central */}
      <div className={`absolute w-1/3 h-1/3 rounded-full border-2 ${color === "blue" ? "border-blue-600" : "border-red-600"} opacity-30`} />
    </div>
  );
};
