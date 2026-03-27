import { useState, useEffect, useCallback } from "react";
import { FolderOpen, Folder, File, ChevronRight, ChevronDown, ArrowUp, Check, X, HardDrive, RefreshCw, FileText, FileCode, Image as ImageIcon, FileJson } from "lucide-react";
import { apiFetch, buildApiUrl, jsonHeaders } from "@/lib/api";

interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  modified?: number;
  children?: FileEntry[];
}

interface WorkspacePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  apiBase?: string;
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (["ts", "tsx", "js", "jsx", "py", "go", "rs", "java", "cpp", "c", "h"].includes(ext || "")) return <FileCode className="w-3.5 h-3.5 text-primary/80" />;
  if (["json", "yaml", "yml", "toml", "xml"].includes(ext || "")) return <FileJson className="w-3.5 h-3.5 text-yellow-400/70" />;
  if (["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"].includes(ext || "")) return <ImageIcon className="w-3.5 h-3.5 text-green-400/70" />;
  if (["md", "txt", "log", "csv"].includes(ext || "")) return <FileText className="w-3.5 h-3.5 text-white/40" />;
  return <File className="w-3.5 h-3.5 text-white/30" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function FileTreeItem({ entry, depth, browsePath, selectedPath }: {
  entry: FileEntry;
  depth: number;
  browsePath: (path: string) => void;
  selectedPath: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isDir = entry.type === "directory";
  const isSelected = entry.path === selectedPath;

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer transition-colors group ${
          isSelected ? "bg-primary/10 text-primary" : "hover:bg-white/5 text-white/60"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => {
          if (isDir) {
            if (entry.children) setExpanded(!expanded);
            browsePath(entry.path);
          }
        }}
      >
        {isDir ? (
          <>
            {expanded ? <ChevronDown className="w-3 h-3 text-white/30 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-white/30 flex-shrink-0" />}
            <Folder className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? "text-primary" : "text-yellow-400/60"}`} />
          </>
        ) : (
          <>
            <span className="w-3 flex-shrink-0" />
            {getFileIcon(entry.name)}
          </>
        )}
        <span className="text-xs truncate flex-1">{entry.name}</span>
        {!isDir && entry.size !== undefined && (
          <span className="text-[9px] text-white/20 flex-shrink-0">{formatSize(entry.size)}</span>
        )}
      </div>
      {isDir && expanded && entry.children && (
        <div>
          {entry.children.map((child) => (
            <FileTreeItem key={child.path} entry={child} depth={depth + 1} browsePath={browsePath} selectedPath={selectedPath} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function WorkspacePicker({ isOpen, onClose, onSelect, apiBase = buildApiUrl() }: WorkspacePickerProps) {
  const [currentPath, setCurrentPath] = useState("");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedDir, setSelectedDir] = useState("");
  const [inputPath, setInputPath] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [browsingPath, setBrowsingPath] = useState("");

  const fetchWorkspace = useCallback(async () => {
    try {
      const res = await apiFetch(`${apiBase}/workspace`);
      const data = await res.json();
      setCurrentPath(data.path || "");
      setInputPath(data.path || "");
      setBrowsingPath(data.path || "");
    } catch {}
  }, [apiBase]);

  const fetchFiles = useCallback(async (path?: string) => {
    setIsLoading(true);
    try {
      const url = path
        ? `${apiBase}/workspace/files?path=${encodeURIComponent(path)}`
        : `${apiBase}/workspace/files`;
      const res = await apiFetch(url);
      const data = await res.json();
      setFiles(data.files || []);
      setBrowsingPath(data.workspace || "");
    } catch {}
    setIsLoading(false);
  }, [apiBase]);

  useEffect(() => {
    if (!isOpen) return;
    fetchWorkspace().then(() => fetchFiles());
  }, [isOpen, fetchWorkspace, fetchFiles]);

  const handleSelectDir = (path: string) => {
    setSelectedDir(path);
    const fullPath = `${browsingPath}/${path}`;
    setInputPath(fullPath);
    void fetchFiles(fullPath);
  };

  const handleSet = async () => {
    if (!inputPath.trim()) return;
    setIsLoading(true);
    try {
      const res = await apiFetch(`${apiBase}/workspace/set`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ path: inputPath.trim() }),
      });
      const data = await res.json();
      setCurrentPath(data.path);
      localStorage.setItem("belka-workspace", data.path);
      onSelect(data.path);
      onClose();
    } catch {}
    setIsLoading(false);
  };

  const goUp = async () => {
    const parts = browsingPath.replace(/\\/g, "/").split("/");
    if (parts.length <= 1) return;
    parts.pop();
    const parent = parts.join("/") || "/";
    try {
      setInputPath(parent);
      await fetchFiles(parent);
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0d0d14] border border-white/10 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-primary" />
            <h3 className="text-sm text-white/90 font-semibold">Рабочая директория</h3>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => fetchFiles(browsingPath)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 text-white/40 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-3.5 h-3.5 text-white/40" />
            </button>
          </div>
        </div>

        {currentPath && (
          <div className="flex items-center gap-2 mx-4 mt-3 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span className="text-[10px] text-emerald-400/70">Текущая:</span>
            <code className="text-[11px] text-emerald-300/80 font-mono truncate">{currentPath}</code>
          </div>
        )}

        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={goUp} className="p-1.5 hover:bg-white/10 rounded-md transition-colors" title="Наверх">
              <ArrowUp className="w-3.5 h-3.5 text-white/40" />
            </button>
            <div className="flex-1 flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-md">
              <FolderOpen className="w-3 h-3 text-white/30 flex-shrink-0" />
              <span className="text-[11px] text-white/50 font-mono truncate">{browsingPath}</span>
            </div>
          </div>

          <div className="border border-white/5 rounded-lg bg-white/[0.02] max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-5 h-5 text-white/20 animate-spin" />
              </div>
            ) : files.length === 0 ? (
              <p className="text-xs text-white/30 text-center py-6">Пустая директория</p>
            ) : (
              <div className="py-1">
                {files.map(entry => (
                  <FileTreeItem
                    key={entry.path}
                    entry={entry}
                    depth={0}
                    browsePath={handleSelectDir}
                    selectedPath={selectedDir}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pb-4 space-y-3">
          <div className="flex gap-2">
            <input
              value={inputPath}
              onChange={e => setInputPath(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSet()}
              placeholder="/home/user/project"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-xs text-white/80 outline-none transition-colors placeholder:text-white/20 focus:border-primary/50"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs text-white/50 hover:bg-white/5 rounded-lg transition-colors">
              Отмена
            </button>
            <button
              onClick={handleSet}
              disabled={isLoading || !inputPath.trim()}
              className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-xs text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              {isLoading ? "Настройка..." : "Установить"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
