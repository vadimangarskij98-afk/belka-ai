import { useState, useEffect } from "react";
import { FolderOpen, FolderPlus, Check, X } from "lucide-react";

interface WorkspacePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  apiBase?: string;
}

export default function WorkspacePicker({ isOpen, onClose, onSelect, apiBase = "/api" }: WorkspacePickerProps) {
  const [currentPath, setCurrentPath] = useState("");
  const [inputPath, setInputPath] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetch(`${apiBase}/workspace`)
      .then(r => r.json())
      .then(data => {
        setCurrentPath(data.path || "");
        setInputPath(data.path || "");
      })
      .catch(() => {});
  }, [isOpen, apiBase]);

  const handleSet = async () => {
    if (!inputPath.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${apiBase}/workspace/set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: inputPath.trim() }),
      });
      const data = await res.json();
      setCurrentPath(data.path);
      onSelect(data.path);
      onClose();
    } catch {}
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0d0d14] border border-white/10 rounded-xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-400" />
            <h3 className="text-white/90 font-semibold">Рабочая директория</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>

        <p className="text-sm text-white/50 mb-4">
          Укажите путь к папке, в которой агент будет создавать и редактировать файлы
        </p>

        {currentPath && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-white/5 rounded-lg">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-white/50">Текущая:</span>
            <code className="text-xs text-white/70 font-mono">{currentPath}</code>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <input
            value={inputPath}
            onChange={e => setInputPath(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSet()}
            placeholder="/home/user/project"
            className="flex-1 bg-white/5 text-sm text-white/80 px-3 py-2.5 rounded-lg border border-white/10 outline-none font-mono placeholder:text-white/20 focus:border-blue-500/50 transition-colors"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-white/50 hover:bg-white/5 rounded-lg transition-colors">
            Отмена
          </button>
          <button
            onClick={handleSet}
            disabled={isLoading || !inputPath.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 text-sm rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            {isLoading ? "Настройка..." : "Установить"}
          </button>
        </div>
      </div>
    </div>
  );
}
