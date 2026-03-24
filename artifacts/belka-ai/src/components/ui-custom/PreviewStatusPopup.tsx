import { useState, useEffect, useCallback } from "react";
import { Server, CheckCircle, AlertCircle, Loader2, X, RefreshCw, Play, Square } from "lucide-react";

interface PreviewLog {
  text: string;
  isError: boolean;
}

interface PreviewStatusPopupProps {
  isOpen: boolean;
  onClose: () => void;
  apiBase?: string;
}

export default function PreviewStatusPopup({ isOpen, onClose, apiBase = "/api" }: PreviewStatusPopupProps) {
  const [status, setStatus] = useState<"stopped" | "starting" | "running" | "error">("stopped");
  const [logs, setLogs] = useState<PreviewLog[]>([]);
  const [port, setPort] = useState<number | null>(null);
  const [command, setCommand] = useState("");
  const [uptime, setUptime] = useState(0);
  const [customCommand, setCustomCommand] = useState("");

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/preview/status`);
      const data = await res.json();
      setStatus(data.running ? data.status : "stopped");
      setPort(data.port || null);
      setCommand(data.command || "");
      setUptime(data.uptime || 0);
      if (data.logs) {
        setLogs(data.logs.map((l: string) => ({
          text: l,
          isError: l.includes("[ERROR]") || l.includes("error") || l.includes("Error"),
        })));
      }
    } catch {}
  }, [apiBase]);

  useEffect(() => {
    if (!isOpen) return;
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [isOpen, fetchStatus]);

  const startServer = async () => {
    try {
      await fetch(`${apiBase}/preview/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: customCommand || undefined }),
      });
      setStatus("starting");
      setTimeout(fetchStatus, 2000);
    } catch {}
  };

  const stopServer = async () => {
    try {
      await fetch(`${apiBase}/preview/stop`, { method: "POST" });
      setStatus("stopped");
    } catch {}
  };

  const formatUptime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-12 right-4 z-50 w-96 bg-[#0d0d14] border border-white/10 rounded-lg shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-white/60" />
          <span className="text-sm text-white/80 font-medium">Preview Server</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            status === "running" ? "bg-emerald-400 animate-pulse" :
            status === "starting" ? "bg-yellow-400 animate-pulse" :
            status === "error" ? "bg-red-400" : "bg-white/20"
          }`} />
          <span className="text-xs text-white/50 capitalize">{status === "running" ? "Запущен" : status === "starting" ? "Запуск..." : status === "error" ? "Ошибка" : "Остановлен"}</span>
          <button onClick={onClose} className="p-0.5 hover:bg-white/10 rounded">
            <X className="w-3.5 h-3.5 text-white/40" />
          </button>
        </div>
      </div>

      {status !== "stopped" && (
        <div className="px-3 py-2 border-b border-white/5 text-xs space-y-1">
          {command && <div className="flex justify-between"><span className="text-white/40">Команда:</span><code className="text-white/60 font-mono">{command}</code></div>}
          {port && <div className="flex justify-between"><span className="text-white/40">Порт:</span><span className="text-white/60">{port}</span></div>}
          {uptime > 0 && <div className="flex justify-between"><span className="text-white/40">Время работы:</span><span className="text-white/60">{formatUptime(uptime)}</span></div>}
        </div>
      )}

      <div className="max-h-48 overflow-y-auto p-2">
        {logs.length > 0 ? (
          <div className="space-y-0.5 font-mono text-[11px]">
            {logs.slice(-30).map((log, i) => (
              <div key={i} className={`${log.isError ? "text-red-400/80" : "text-white/40"} whitespace-pre-wrap break-all`}>
                {log.text}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-white/30 text-center py-4">
            {status === "stopped" ? "Сервер не запущен" : "Загрузка логов..."}
          </p>
        )}
      </div>

      <div className="px-3 py-2 border-t border-white/10 bg-white/[0.02] flex items-center gap-2">
        {status === "stopped" ? (
          <>
            <input
              value={customCommand}
              onChange={e => setCustomCommand(e.target.value)}
              placeholder="npm run dev (авто)"
              className="flex-1 bg-white/5 text-xs text-white/70 px-2 py-1.5 rounded border border-white/10 outline-none font-mono placeholder:text-white/20"
            />
            <button onClick={startServer} className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/20 text-emerald-400 rounded text-xs hover:bg-emerald-500/30 transition-colors">
              <Play className="w-3 h-3" /> Start
            </button>
          </>
        ) : (
          <>
            <button onClick={fetchStatus} className="flex items-center gap-1 px-2 py-1.5 bg-white/5 text-white/50 rounded text-xs hover:bg-white/10 transition-colors">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
            <button onClick={stopServer} className="flex items-center gap-1 px-2 py-1.5 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30 transition-colors ml-auto">
              <Square className="w-3 h-3" /> Stop
            </button>
          </>
        )}
      </div>
    </div>
  );
}
