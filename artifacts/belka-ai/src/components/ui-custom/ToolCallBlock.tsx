import { useState } from "react";
import { FileCode, FilePlus, FileEdit, Trash2, CheckCircle, Loader2, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";

interface ToolCallProps {
  tool: string;
  args: Record<string, any>;
  status: "running" | "done" | "error";
  result?: string;
  error?: string;
  duration?: number;
}

const toolIcons: Record<string, any> = {
  create_file: FilePlus,
  edit_file: FileEdit,
  delete_file: Trash2,
  run_command: FileCode,
};

const toolLabels: Record<string, string> = {
  create_file: "Создание файла",
  edit_file: "Редактирование файла",
  delete_file: "Удаление файла",
  run_command: "Выполнение команды",
};

export default function ToolCallBlock({ tool, args, status, result, error, duration }: ToolCallProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = toolIcons[tool] || FileCode;
  const label = toolLabels[tool] || tool;

  return (
    <div className={`rounded-lg border overflow-hidden my-2 transition-all ${
      status === "error" ? "border-red-500/30 bg-red-500/5" :
      status === "done" ? "border-emerald-500/20 bg-emerald-500/5" :
      "border-primary/20 bg-primary/5"
    }`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-white/5 transition-colors"
      >
        <div className={`flex items-center justify-center w-6 h-6 rounded ${
          status === "error" ? "bg-red-500/20 text-red-400" :
          status === "done" ? "bg-emerald-500/20 text-emerald-400" :
          "bg-primary/10 text-primary"
        }`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-white/80 font-medium">{label}</span>
        {args.path && (
          <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-white/60 font-mono">
            {args.path}
          </code>
        )}
        <div className="ml-auto flex items-center gap-2">
          {duration !== undefined && (
            <span className="text-xs text-white/30 font-mono">{(duration / 1000).toFixed(1)}s</span>
          )}
          {status === "running" && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />}
          {status === "done" && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
          {status === "error" && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
          {expanded ? <ChevronDown className="w-3.5 h-3.5 text-white/30" /> : <ChevronRight className="w-3.5 h-3.5 text-white/30" />}
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-2 border-t border-white/5">
          {result && (
            <pre className="text-xs text-white/50 font-mono mt-2 whitespace-pre-wrap">{result}</pre>
          )}
          {error && (
            <pre className="text-xs text-red-400/80 font-mono mt-2 whitespace-pre-wrap">{error}</pre>
          )}
          {!result && !error && status === "running" && (
            <p className="text-xs text-white/30 mt-2">Выполняется...</p>
          )}
        </div>
      )}
    </div>
  );
}
