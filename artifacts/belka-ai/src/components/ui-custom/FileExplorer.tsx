import { useState, useCallback, useEffect } from "react";
import {
  FolderOpen, Folder, File, ChevronRight, ChevronDown, Plus, Trash2,
  RefreshCw, GitBranch, FolderInput, Upload, Github, Loader2,
  Check, X, AlertCircle, FilePlus, FolderPlus
} from "lucide-react";
import { getFileIcon, getLanguageFromFilename, type LocalFile } from "@/lib/local-fs";
import { cn } from "@/lib/utils";

export interface FileItem {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  sha?: string;
  children?: FileItem[];
  status?: "added" | "modified" | "deleted" | "unchanged";
  isOpen?: boolean;
  language?: string;
  icon?: string;
}

interface FileExplorerProps {
  files: FileItem[];
  selectedPath?: string;
  onSelectFile?: (path: string) => void;
  onDeleteFile?: (path: string, sha?: string) => void;
  onCreateFile?: (dirPath: string, name: string) => void;
  onCreateFolder?: (dirPath: string, name: string) => void;
  onRefresh?: () => void;
  onOpenLocalFolder?: () => void;
  onConnectGitHub?: () => void;
  source?: "local" | "github" | null;
  githubRepo?: string;
  githubBranch?: string;
  isLoading?: boolean;
  isConnected?: boolean;
  changedPaths?: Set<string>;
}

function StatusBadge({ status }: { status?: FileItem["status"] }) {
  if (!status || status === "unchanged") return null;
  const cls = status === "added"
    ? "bg-green-500/20 text-green-400 border-green-500/30"
    : status === "deleted"
    ? "bg-red-500/20 text-red-400 border-red-500/30"
    : "bg-blue-500/20 text-blue-400 border-blue-500/30";
  const label = status === "added" ? "A" : status === "deleted" ? "D" : "M";
  return (
    <span className={`text-[9px] px-1 py-0.5 rounded border font-mono ${cls}`}>{label}</span>
  );
}

function FileNode({
  item,
  depth,
  selectedPath,
  onSelectFile,
  onDeleteFile,
  onCreateFile,
  onCreateFolder,
  changedPaths,
}: {
  item: FileItem;
  depth: number;
  selectedPath?: string;
  onSelectFile?: (path: string) => void;
  onDeleteFile?: (path: string, sha?: string) => void;
  onCreateFile?: (dirPath: string, name: string) => void;
  onCreateFolder?: (dirPath: string, name: string) => void;
  changedPaths?: Set<string>;
}) {
  const [isOpen, setIsOpen] = useState(depth === 0);
  const [isHovered, setIsHovered] = useState(false);
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);
  const [newName, setNewName] = useState("");
  const isDir = item.type === "directory";
  const isSelected = selectedPath === item.path;
  const isChanged = changedPaths?.has(item.path);

  const handleClick = () => {
    if (isDir) {
      setIsOpen(!isOpen);
    } else {
      onSelectFile?.(item.path);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    if (creating === "file") onCreateFile?.(item.path, newName.trim());
    else onCreateFolder?.(item.path, newName.trim());
    setCreating(null);
    setNewName("");
  };

  const statusColor = item.status === "added"
    ? "text-green-400"
    : item.status === "deleted"
    ? "text-red-400 line-through opacity-60"
    : item.status === "modified" || isChanged
    ? "text-blue-400"
    : "";

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 cursor-pointer rounded-md transition-colors group",
          isSelected ? "bg-primary/15 text-primary" : "hover:bg-muted/50",
          "min-h-[28px]"
        )}
        style={{ paddingLeft: `${(depth + 1) * 12}px` }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
      >
        {isDir ? (
          <>
            <span className="text-muted-foreground/60 flex-shrink-0">
              {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
            <span className="flex-shrink-0">
              {isOpen ? <FolderOpen size={13} className="text-yellow-400" /> : <Folder size={13} className="text-yellow-400/70" />}
            </span>
          </>
        ) : (
          <>
            <span className="w-3 flex-shrink-0" />
            <span className="text-[13px] flex-shrink-0">{getFileIcon(item.name)}</span>
          </>
        )}

        <span className={cn("text-xs truncate flex-1", statusColor || (isSelected ? "" : "text-foreground/80"))}>
          {item.name}
        </span>

        <div className="flex items-center gap-1 flex-shrink-0">
          <StatusBadge status={item.status} />

          {isHovered && (
            <>
              {isDir && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCreating("file"); setIsOpen(true); }}
                    className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                    title="Новый файл"
                  >
                    <FilePlus size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCreating("folder"); setIsOpen(true); }}
                    className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                    title="Новая папка"
                  >
                    <FolderPlus size={12} />
                  </button>
                </>
              )}
              {onDeleteFile && !isDir && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteFile(item.path, item.sha); }}
                  className="text-muted-foreground hover:text-red-400 p-0.5 rounded transition-colors"
                  title="Удалить"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {isDir && isOpen && (
        <div>
          {creating && (
            <form
              onSubmit={handleCreate}
              className="flex items-center gap-1 py-1"
              style={{ paddingLeft: `${(depth + 2) * 12}px` }}
            >
              {creating === "file" ? <FilePlus size={11} className="text-muted-foreground" /> : <FolderPlus size={11} className="text-yellow-400" />}
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === "Escape") { setCreating(null); setNewName(""); } }}
                className="flex-1 text-xs bg-muted border border-border/50 rounded px-1.5 py-0.5 outline-none focus:border-primary"
                placeholder={creating === "file" ? "имя файла..." : "имя папки..."}
              />
              <button type="submit" className="text-green-400 hover:text-green-300 p-0.5"><Check size={11} /></button>
              <button type="button" onClick={() => { setCreating(null); setNewName(""); }} className="text-muted-foreground p-0.5"><X size={11} /></button>
            </form>
          )}
          {item.children?.map(child => (
            <FileNode
              key={child.path}
              item={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
              onDeleteFile={onDeleteFile}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
              changedPaths={changedPaths}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileExplorer({
  files,
  selectedPath,
  onSelectFile,
  onDeleteFile,
  onCreateFile,
  onCreateFolder,
  onRefresh,
  onOpenLocalFolder,
  onConnectGitHub,
  source,
  githubRepo,
  githubBranch,
  isLoading,
  isConnected,
  changedPaths,
}: FileExplorerProps) {
  if (!source) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b border-border/50 flex-shrink-0">
          <span className="text-xs font-medium text-foreground/60 uppercase tracking-wider">Файлы</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
          <div className="text-center">
            <FolderInput size={32} className="text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground mb-4">Выберите источник файлов</p>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-[180px]">
            <button
              onClick={onOpenLocalFolder}
              className="flex items-center gap-2 px-3 py-2.5 bg-muted/50 hover:bg-muted rounded-lg transition-colors text-xs text-foreground border border-border/50"
            >
              <FolderOpen size={14} className="text-yellow-400" />
              <div className="text-left">
                <div className="font-medium">Локальная папка</div>
                <div className="text-[10px] text-muted-foreground">Открыть папку на PC</div>
              </div>
            </button>
            <button
              onClick={onConnectGitHub}
              className="flex items-center gap-2 px-3 py-2.5 bg-muted/50 hover:bg-muted rounded-lg transition-colors text-xs text-foreground border border-border/50"
            >
              <Github size={14} />
              <div className="text-left">
                <div className="font-medium">GitHub репозиторий</div>
                <div className="text-[10px] text-muted-foreground">Подключить репозиторий</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            {source === "github" ? (
              <Github size={12} className="text-muted-foreground flex-shrink-0" />
            ) : (
              <FolderOpen size={12} className="text-yellow-400 flex-shrink-0" />
            )}
            <span className="text-xs font-medium text-foreground/80 truncate">
              {githubRepo || "Локальный проект"}
            </span>
            {githubBranch && (
              <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground/60 flex-shrink-0">
                <GitBranch size={9} />
                {githubBranch}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {changedPaths && changedPaths.size > 0 && (
              <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full border border-blue-500/30">
                {changedPaths.size} изм.
              </span>
            )}
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
                title="Обновить"
              >
                <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-20 text-muted-foreground gap-2">
            <AlertCircle size={16} />
            <span className="text-xs">Пусто</span>
          </div>
        ) : (
          files.map(item => (
            <FileNode
              key={item.path}
              item={item}
              depth={0}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
              onDeleteFile={onDeleteFile}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
              changedPaths={changedPaths}
            />
          ))
        )}
      </div>

      {source === "local" && (
        <div className="px-3 py-2 border-t border-border/50 flex-shrink-0">
          <button
            onClick={onOpenLocalFolder}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <FolderInput size={11} />
            Сменить папку
          </button>
        </div>
      )}
    </div>
  );
}
