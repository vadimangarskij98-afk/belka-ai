import { useMemo } from "react";
import { computeDiff, type FileDiff } from "@/lib/local-fs";
import { X, Plus, Minus, FileCode } from "lucide-react";

interface DiffViewerProps {
  path: string;
  oldContent: string | null;
  newContent: string | null;
  onClose?: () => void;
}

export function DiffViewer({ path, oldContent, newContent, onClose }: DiffViewerProps) {
  const diff = useMemo(() => computeDiff(oldContent, newContent, path), [path, oldContent, newContent]);

  const statusColor = diff.status === "added"
    ? "text-green-400"
    : diff.status === "deleted"
    ? "text-red-400"
    : "text-blue-400";

  const statusIcon = diff.status === "added"
    ? <Plus size={12} className="text-green-400" />
    : diff.status === "deleted"
    ? <Minus size={12} className="text-red-400" />
    : <FileCode size={12} className="text-blue-400" />;

  const statusLabel = diff.status === "added" ? "добавлен" : diff.status === "deleted" ? "удалён" : "изменён";

  const addedLines = diff.chunks.filter(c => c.type === "added").reduce((s, c) => s + c.lines.length, 0);
  const removedLines = diff.chunks.filter(c => c.type === "removed").reduce((s, c) => s + c.lines.length, 0);

  return (
    <div className="flex flex-col h-full bg-background/95 border-l border-border/50">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-card/50 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {statusIcon}
          <span className="text-xs font-mono text-foreground/80 truncate">{path}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-muted ${statusColor}`}>{statusLabel}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {addedLines > 0 && (
            <span className="text-[10px] text-green-400">+{addedLines}</span>
          )}
          {removedLines > 0 && (
            <span className="text-[10px] text-red-400">-{removedLines}</span>
          )}
          {onClose && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto font-mono text-xs">
        {diff.chunks.map((chunk, ci) => (
          chunk.lines.map((line, li) => {
            const isAdded = chunk.type === "added";
            const isRemoved = chunk.type === "removed";
            const lineNum = chunk.startLine + li;

            return (
              <div
                key={`${ci}-${li}`}
                className={`flex items-start min-h-[1.5rem] ${
                  isAdded
                    ? "bg-green-500/10 border-l-2 border-green-500"
                    : isRemoved
                    ? "bg-red-500/10 border-l-2 border-red-500"
                    : "border-l-2 border-transparent"
                }`}
              >
                <span className="w-8 text-right pr-2 text-muted-foreground/40 flex-shrink-0 select-none py-0.5">
                  {lineNum}
                </span>
                <span className={`w-5 text-center flex-shrink-0 py-0.5 ${isAdded ? "text-green-400" : isRemoved ? "text-red-400" : "text-transparent"}`}>
                  {isAdded ? "+" : isRemoved ? "-" : " "}
                </span>
                <span className={`flex-1 py-0.5 pr-3 whitespace-pre-wrap break-all ${
                  isAdded ? "text-green-100" : isRemoved ? "text-red-200 line-through opacity-60" : "text-foreground/80"
                }`}>
                  {line || " "}
                </span>
              </div>
            );
          })
        ))}
        {diff.chunks.length === 0 && (
          <div className="flex items-center justify-center h-20 text-muted-foreground text-xs">
            Нет изменений
          </div>
        )}
      </div>
    </div>
  );
}

interface MultiDiffViewerProps {
  diffs: { path: string; oldContent: string | null; newContent: string | null }[];
  onApplyFile?: (path: string, content: string) => void;
  onDismissFile?: (path: string) => void;
}

export function MultiDiffViewer({ diffs, onApplyFile, onDismissFile }: MultiDiffViewerProps) {
  if (diffs.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {diffs.map((d) => (
        <div key={d.path} className="border border-border/50 rounded-lg overflow-hidden">
          <DiffViewer
            path={d.path}
            oldContent={d.oldContent}
            newContent={d.newContent}
          />
          {(onApplyFile || onDismissFile) && (
            <div className="flex items-center gap-2 px-3 py-2 border-t border-border/50 bg-card/30">
              {onApplyFile && d.newContent !== null && (
                <button
                  onClick={() => onApplyFile(d.path, d.newContent!)}
                  className="text-[11px] px-3 py-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-md transition-colors border border-green-500/30"
                >
                  Применить
                </button>
              )}
              {onDismissFile && (
                <button
                  onClick={() => onDismissFile(d.path)}
                  className="text-[11px] px-3 py-1 bg-muted/50 text-muted-foreground hover:bg-muted rounded-md transition-colors"
                >
                  Отклонить
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
