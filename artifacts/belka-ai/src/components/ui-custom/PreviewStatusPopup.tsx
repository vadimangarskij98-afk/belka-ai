import { useState, useEffect, useCallback, useRef } from "react";
import { Server, X, RefreshCw, Play, Square, Maximize2, Minimize2, Loader2, ExternalLink, GripHorizontal } from "lucide-react";

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [pos, setPos] = useState({ x: 200, y: 80 });
  const [size, setSize] = useState({ w: 700, h: 500 });
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const logsRef = useRef<HTMLDivElement>(null);

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
          isError: l.includes("[ERROR]") || l.toLowerCase().includes("error") || l.includes("Error"),
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

  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight;
  }, [logs]);

  useEffect(() => {
    if (!dragging && !resizing) return;
    const handleMove = (e: MouseEvent) => {
      if (dragging) {
        setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
      }
      if (resizing) {
        setSize(prev => ({
          w: Math.max(400, e.clientX - pos.x),
          h: Math.max(300, e.clientY - pos.y),
        }));
      }
    };
    const handleUp = () => { setDragging(false); setResizing(false); };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => { window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleUp); };
  }, [dragging, resizing, pos.x, pos.y]);

  const startServer = async () => {
    try {
      await fetch(`${apiBase}/preview/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: customCommand || undefined }),
      });
      setStatus("starting");
      setTimeout(() => { fetchStatus(); setIframeKey(k => k + 1); }, 3000);
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
    if (s < 60) return `${s}с`;
    const m = Math.floor(s / 60);
    return `${m}м ${s % 60}с`;
  };

  if (!isOpen) return null;

  const previewUrl = port ? `${window.location.protocol}//${window.location.hostname}:${port}` : null;
  const isRunning = status === "running";
  const isStarting = status === "starting";

  const containerStyle = isFullscreen
    ? { position: "fixed" as const, inset: 0, zIndex: 100 }
    : { position: "fixed" as const, left: pos.x, top: pos.y, width: size.w, height: size.h, zIndex: 100 };

  const handleDragStart = (e: React.MouseEvent) => {
    if (isFullscreen) return;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    setDragging(true);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setResizing(true);
  };

  const hasErrors = logs.some(l => l.isError);

  return (
    <div style={containerStyle} className="flex flex-col bg-[#0a0a12] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/10 cursor-move select-none"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="w-3.5 h-3.5 text-white/20" />
          <Server className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-white/80 font-medium">Preview Server</span>
          <div className={`w-2 h-2 rounded-full ml-1 ${
            isRunning ? "bg-emerald-400 animate-pulse" :
            isStarting ? "bg-yellow-400 animate-pulse" :
            status === "error" ? "bg-red-400" : "bg-white/20"
          }`} />
          <span className="text-[10px] text-white/40">
            {isRunning ? "Запущен" : isStarting ? "Запуск..." : status === "error" ? "Ошибка" : "Остановлен"}
          </span>
          {isRunning && uptime > 0 && (
            <span className="text-[10px] text-white/30 ml-1">({formatUptime(uptime)})</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isRunning && (
            <button onClick={() => setShowLogs(!showLogs)} className={`p-1.5 rounded-md transition-colors text-[10px] font-medium ${showLogs ? "bg-blue-500/20 text-blue-400" : "hover:bg-white/10 text-white/40"} ${hasErrors ? "text-red-400" : ""}`}>
              Логи{hasErrors ? " ⚠" : ""}
            </button>
          )}
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1.5 hover:bg-white/10 rounded-md transition-colors">
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-white/40" /> : <Maximize2 className="w-3.5 h-3.5 text-white/40" />}
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-md transition-colors">
            <X className="w-3.5 h-3.5 text-white/40" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {isRunning && previewUrl ? (
          <>
            <div className={`flex-1 bg-white ${showLogs ? "" : "w-full"}`}>
              <iframe
                key={iframeKey}
                src={previewUrl}
                className="w-full h-full border-0"
                title="Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              />
            </div>
            {showLogs && (
              <div className="w-72 border-l border-white/10 bg-[#08080e] flex flex-col">
                <div className="px-2 py-1.5 border-b border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-white/40 font-medium">Логи сервера</span>
                  <span className="text-[9px] text-white/20">{logs.length} строк</span>
                </div>
                <div ref={logsRef} className="flex-1 overflow-y-auto p-2 font-mono text-[10px] space-y-0.5">
                  {logs.slice(-100).map((log, i) => (
                    <div key={i} className={`${log.isError ? "text-red-400/80" : "text-white/35"} whitespace-pre-wrap break-all leading-relaxed`}>
                      {log.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : isStarting ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            <p className="text-sm text-white/50">Запуск сервера...</p>
            {command && <code className="text-xs text-white/30 font-mono">{command}</code>}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
            <Server className="w-12 h-12 text-white/10" />
            <p className="text-sm text-white/40 text-center">
              Введите команду для запуска вашего проекта
            </p>
            <div className="w-full max-w-sm space-y-3">
              <input
                value={customCommand}
                onChange={e => setCustomCommand(e.target.value)}
                onKeyDown={e => e.key === "Enter" && startServer()}
                placeholder="npm run dev"
                className="w-full bg-white/5 text-sm text-white/80 px-4 py-3 rounded-lg border border-white/10 outline-none font-mono placeholder:text-white/20 focus:border-blue-500/50 transition-colors"
              />
              <button
                onClick={startServer}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-500/30 transition-colors"
              >
                <Play className="w-4 h-4" /> Запустить сервер
              </button>
            </div>
            {logs.length > 0 && (
              <div className="w-full max-w-sm mt-2">
                <div className="text-[10px] text-white/30 mb-1">Последние логи:</div>
                <div className="max-h-24 overflow-y-auto bg-white/[0.02] rounded p-2 font-mono text-[10px] text-white/30 space-y-0.5">
                  {logs.slice(-10).map((l, i) => (
                    <div key={i} className={l.isError ? "text-red-400/70" : ""}>{l.text}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {(isRunning || isStarting) && (
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2 text-[10px] text-white/30 font-mono">
            {command && <span>{command}</span>}
            {port && <span className="text-blue-400/60">:{port}</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => { setIframeKey(k => k + 1); fetchStatus(); }} className="flex items-center gap-1 px-2 py-1 bg-white/5 text-white/40 rounded text-[10px] hover:bg-white/10 transition-colors">
              <RefreshCw className="w-2.5 h-2.5" /> Обновить
            </button>
            {previewUrl && (
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 bg-white/5 text-white/40 rounded text-[10px] hover:bg-white/10 transition-colors">
                <ExternalLink className="w-2.5 h-2.5" /> Открыть
              </a>
            )}
            <button onClick={stopServer} className="flex items-center gap-1 px-2 py-1 bg-red-500/15 text-red-400/70 rounded text-[10px] hover:bg-red-500/25 transition-colors">
              <Square className="w-2.5 h-2.5" /> Стоп
            </button>
          </div>
        </div>
      )}

      {!isFullscreen && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={handleResizeStart}
          style={{ background: "linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.1) 50%)" }}
        />
      )}
    </div>
  );
}
