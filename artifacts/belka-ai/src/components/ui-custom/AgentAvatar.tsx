import { cn } from "@/lib/utils";
import { AgentRole } from "@workspace/api-client-react";
import { Bot, Code2, Search, Palette, Network } from "lucide-react";

interface AgentAvatarProps {
  role?: AgentRole | string;
  src?: string;
  className?: string;
  isPulsing?: boolean;
  size?: number;
}

const roleConfig: Record<string, { gradient: string; ring: string; shadow: string; icon: typeof Bot }> = {
  [AgentRole.coder]: {
    gradient: "from-blue-500 to-cyan-400",
    ring: "border-blue-500/60",
    shadow: "shadow-blue-500/30",
    icon: Code2,
  },
  [AgentRole.reviewer]: {
    gradient: "from-red-500 to-orange-400",
    ring: "border-red-500/60",
    shadow: "shadow-red-500/30",
    icon: Bot,
  },
  [AgentRole.researcher]: {
    gradient: "from-green-500 to-emerald-400",
    ring: "border-green-500/60",
    shadow: "shadow-green-500/30",
    icon: Search,
  },
  [AgentRole.designer]: {
    gradient: "from-purple-500 to-pink-400",
    ring: "border-purple-500/60",
    shadow: "shadow-purple-500/30",
    icon: Palette,
  },
  [AgentRole.orchestrator]: {
    gradient: "from-yellow-500 to-amber-400",
    ring: "border-yellow-500/60",
    shadow: "shadow-yellow-500/30",
    icon: Network,
  },
};

const defaultConfig = {
  gradient: "from-primary to-secondary",
  ring: "border-primary/60",
  shadow: "shadow-primary/30",
  icon: Bot,
};

export function AgentAvatar({ role = AgentRole.coder, src, className, isPulsing, size }: AgentAvatarProps) {
  const config = roleConfig[role?.toLowerCase?.()] || defaultConfig;
  const IconComponent = config.icon;
  const iconSize = size ? Math.floor(size * 0.45) : 18;

  return (
    <div className={cn("relative flex items-center justify-center", className)} style={size ? { width: size, height: size } : undefined}>
      <div
        className={cn(
          "absolute inset-0 rounded-full bg-gradient-to-tr opacity-20",
          config.gradient
        )}
        style={{
          animation: isPulsing ? "avatar-ring-pulse 2s ease-in-out infinite" : undefined,
        }}
      />

      <div
        className={cn(
          "absolute inset-0 rounded-full border-2",
          config.ring
        )}
        style={{
          background: `conic-gradient(from 0deg, transparent 0%, hsl(var(--primary) / 0.3) 25%, transparent 50%, hsl(var(--secondary) / 0.3) 75%, transparent 100%)`,
          animation: isPulsing ? "avatar-ring-rotate 4s linear infinite" : undefined,
        }}
      />

      <div
        className={cn(
          "absolute inset-[3px] rounded-full border-2 border-background dark:border-background"
        )}
      />

      <div
        className={cn(
          "relative z-10 flex items-center justify-center rounded-full w-[calc(100%-8px)] h-[calc(100%-8px)] bg-gradient-to-br shadow-lg",
          config.gradient,
          config.shadow
        )}
      >
        {src ? (
          <img src={src} alt={String(role)} className="w-full h-full rounded-full object-cover" />
        ) : (
          <IconComponent size={iconSize} className="text-white drop-shadow-sm" />
        )}
      </div>

      {isPulsing && (
        <span
          className={cn("absolute inset-0 rounded-full bg-gradient-to-tr opacity-30", config.gradient)}
          style={{ animation: "avatar-ring-pulse 1.5s ease-in-out infinite 0.3s" }}
        />
      )}
    </div>
  );
}
