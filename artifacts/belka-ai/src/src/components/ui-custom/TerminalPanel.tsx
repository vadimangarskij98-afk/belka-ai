import { useState, useRef, useEffect, useCallback } from "react";
import { TerminalSquare, X, Maximize2, Minimize2, Loader2 } from "lucide-react";

interface TerminalLine {
  type: "input" | "output" | "error" | "system";
  content: string;
  timestamp: number;
}

interface TerminalPanelProps {
  isOpen: boolean;
  onClose: () => void;
  apiBase?: string;
}

export default function TerminalPanel({ isOpen, onClose, apiBase = "/api" }: TerminalPanelProps) {
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: "system", content: "BELKA Terminal v1.0 — готов к работе", timestamp: Date.now() },
    { type: "system", content: 'Введите команду. Для справки — "help"', timestamp: Date.now() },
  ]);
  const [input, setInput] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [cwd, setCwd] = useState("~/belka-workspace");
  const [isMaximized, setIsMaximized] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || sessionId) return;
    fetch(`${apiBase}/terminal/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then(r => r.json())
      .then(data => {
        setSessionId(data.id);
        if (data.cwd) setCwd(data.cwd);
      })
      .catch(() => {});
  }, [isOpen, sessionId, apiBase]);

  const executeCommand = useCallback(async (command: string) => {
    if (!command.trim()) return;

    setLines(prev => [...prev, { type: "input", content: command, timestamp: Date.now() }]);
    setHistory(prev => [...prev, command]);
    setHistoryIdx(-1);
    setIsExecuting(true);

    if (command === "clear") {
      setLines([{ type: "system", content: "Терминал очищен", timestamp: Date.now() }]);
      setIsExecuting(false);
      return;
    }

    if (command === "help") {
      setLines(prev => [...prev, {
        type: "system",
        content: "Доступные команды:\n  clear    — очистить терминал\n  help     — показать справку\n  pwd      — текущая директория\n  ls       — список файлов\n  cd <dir> — сменить директорию\n  npm/node/python — запуск скриптов\n  git      — работа с репозиторием\n  Любая bash-команда",
        timestamp: Date.now(),
      }]);
      setIsExecuting(false);
      return;
    }

    try {
      const endpoint = sessionId
        ? `${apiBase}/terminal/${sessionId}/write`
        : `${apiBase}/terminal/exec`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });

      const data = await res.json();

      if (data.cwd) setCwd(data.cwd);

      if (data.output) {
        setLines(prev => [...prev, { type: "output", content: data.output, timestamp: Date.now() }]);
      }
      if (data.error && data.exitCode !== 0) {
        setLines(prev => [...prev, { type: "error", content: data.error, timestamp: Date.now() }]);
      }
    } catch (err: any) {
      setLines(prev => [...prev, { type: "error", content: `Ошибка: ${err.message}`, timestamp: Date.now() }]);
    }

    setIsExecuting(false);
  }, [sessionId, apiBase]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isExecuting) {
      executeCommand(input);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const newIdx = historyIdx < 0 ? history.length - 1 : Math.max(0, historyIdx - 1);
        setHistoryIdx(newIdx);
        setInput(history[newIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx >= 0) {
        const newIdx = historyIdx + 1;
        if (newIdx >= history.length) {
          setHistoryIdx(-1);
          setInput("");
        } else {
          setHistoryIdx(newIdx);
          setInput(history[newIdx]);
        }
      }
    }
  };

  if (!isOpen) return null;

  const lineColor = (type: string) => {
    switch (type) {
      case "input": return "text-emerald-400";
      case "output": return "text-white/80";
      case "error": return "text-red-400";
      case "system": return "text-blue-400/70";
      default: return "text-white/60";
    }
  };

  return (
    <div className={`flex flex-col bg-[#0a0a0f] border border-white/10 rounded-lg overflow-hidden transition-all ${
      isMaximized ? "fixed inset-4 z-50" : "h-72"
    }`}>
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <TerminalSquare className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs text-white/60 font-medium">Terminal</span>
          <span className="text-xs text-white/30 font-mono">{cwd}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMaximized(!isMaximized)} className="p-1 hover:bg-white/10 rounded transition-colors">
            {isMaximized ? <Minimize2 className="w-3 h-3 text-white/40" /> : <Maximize2 className="w-3 h-3 text-white/40" />}
          </button>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors">
            <X className="w-3 h-3 text-white/40" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 font-mono text-sm space-y-0.5" onClick={() => inputRef.current?.focus()}>
        {lines.map((line, i) => (
          <div key={i} className={`${lineColor(line.type)} whitespace-pre-wrap leading-relaxed`}>
            {line.type === "input" ? (
              <span><span className="text-emerald-500">❯ </span>{line.content}</span>
            ) : (
              line.content
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 px-3 py-2 border-t border-white/10 bg-white/[0.02]">
        <span className="text-emerald-500 font-mono text-sm">❯</span>
        {isExecuting ? (
          <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
        ) : null}
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isExecuting}
          className="flex-1 bg-transparent text-white/90 text-sm font-mono outline-none placeholder:text-white/20"
          placeholder={isExecuting ? "Выполняется..." : "Введите команду..."}
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
}
