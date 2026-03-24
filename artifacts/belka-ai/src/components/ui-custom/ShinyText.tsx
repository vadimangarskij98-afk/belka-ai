import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ShinyTextProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "blue";
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div";
}

export function ShinyText({ 
  children, 
  className, 
  variant = "default",
  as: Component = "span" 
}: ShinyTextProps) {
  return (
    <Component 
      className={cn(
        variant === "default" ? "shiny-text" : "shiny-text-blue",
        className
      )}
    >
      {children}
    </Component>
  );
}
