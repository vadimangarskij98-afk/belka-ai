import { useState, useEffect, useRef } from "react";
import { Brain, Search, Code, CheckCircle, Loader2 } from "lucide-react";

interface ThinkingStep {
  id: string;
  text: string;
  status: "active" | "done" | "pending";
  duration?: number;
}

interface ThinkingIndicatorProps {
  steps: ThinkingStep[];
  elapsedMs: number;
  isActive: boolean;
}

const stepIcons: Record<string, any> = {
  thinking: Brain,
  searching: Search,
  generating: Code,
  coding: Code,
  reviewing: CheckCircle,
  generating_image: Loader2,
};

export default function ThinkingIndicator({ steps, elapsedMs, isActive }: ThinkingIndicatorProps) {
  const [displayTime, setDisplayTime] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (!isActive) return;
    startRef.current = Date.now() - elapsedMs;
    const interval = setInterval(() => {
      setDisplayTime(Date.now() - startRef.current);
    }, 100);
    return () => clearInterval(interval);
  }, [isActive, elapsedMs]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const tenths = Math.floor((ms % 1000) / 100);
    return `${seconds}.${tenths}s`;
  };

  if (steps.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 py-2">
      {steps.map((step, i) => {
        const Icon = stepIcons[step.id] || Brain;
        const isLast = i === steps.length - 1;
        return (
          <div key={step.id + i} className="flex items-center gap-2.5 text-sm">
            <div className={`flex items-center justify-center w-5 h-5 rounded-full ${
              step.status === "done" ? "bg-emerald-500/20 text-emerald-400" :
              step.status === "active" ? "bg-blue-500/20 text-blue-400" :
              "bg-white/5 text-white/30"
            }`}>
              {step.status === "done" ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : step.status === "active" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Icon className="w-3.5 h-3.5" />
              )}
            </div>
            <span className={`${
              step.status === "done" ? "text-white/50" :
              step.status === "active" ? "text-white/90" :
              "text-white/30"
            }`}>
              {step.text}
            </span>
            {step.status === "done" && step.duration !== undefined && (
              <span className="text-white/30 text-xs ml-auto font-mono">{formatTime(step.duration)}</span>
            )}
            {step.status === "active" && isLast && isActive && (
              <span className="text-blue-400/70 text-xs ml-auto font-mono animate-pulse">
                {formatTime(displayTime)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
