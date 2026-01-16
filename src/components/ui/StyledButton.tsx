import type { ReactNode } from "react";

interface StyledButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg" | "xl";
  icon?: ReactNode;
  children: ReactNode;
  fullWidth?: boolean;
}

export const StyledButton = ({
  variant = "primary",
  size = "md",
  icon,
  children,
  className = "",
  fullWidth = false,
  ...props
}: StyledButtonProps) => {
  const baseStyles = "font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";
  
  const variants = {
    primary: "bg-green-600 hover:bg-green-500 text-white shadow-green-900/20 hover:shadow-green-500/20 border border-white/10",
    secondary: "bg-blue-600/80 hover:bg-blue-500 text-white shadow-blue-900/20 hover:shadow-blue-500/20 border border-white/10",
    danger: "bg-red-600/80 hover:bg-red-500 text-white shadow-red-900/20 hover:shadow-red-500/20 border border-white/10",
    ghost: "bg-transparent hover:bg-white/5 text-slate-400 hover:text-white border-transparent",
    outline: "bg-transparent border-2 border-white/10 text-white hover:bg-white/5 hover:border-white/20",
  };

  const sizes = {
    sm: "py-2 px-4 text-xs rounded-lg",
    md: "py-3 px-6 text-sm rounded-xl",
    lg: "py-4 px-8 text-base rounded-2xl",
    xl: "py-6 px-10 text-lg rounded-2xl",
  };

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
      {...props}
    >
      {icon && <span className="text-xl">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
