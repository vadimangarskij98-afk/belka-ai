import { useState, useRef, useEffect } from "react";
import { Copy, Check, Save, X, Download, Eye } from "lucide-react";
import { getLanguageFromFilename, getFileIcon } from "@/lib/local-fs";
import { cn } from "@/lib/utils";

interface CodeEditorProps {
  path: string;
  content: string;
  onChange?: (content: string) => void;
  onSave?: (content: string) => void;
  onClose?: () => void;
  readOnly?: boolean;
  isModified?: boolean;
}

export function CodeEditor({ path, content, onChange, onSave, onClose, readOnly, isModified }: CodeEditorProps) {
  const [localContent, setLocalContent] = useState(content);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lang = getLanguageFromFilename(path);
  const icon = getFileIcon(path.split("/").pop() || path);

  useEffect(() => {
    setLocalContent(content);
  }, [content, path]);

  const handleChange = (val: string) => {
    setLocalContent(val);
    onChange?.(val);
  };

  const handleSave = () => {
    onSave?.(localContent);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(localContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const start = (e.target as HTMLTextAreaElement).selectionStart;
      const end = (e.target as HTMLTextAreaElement).selectionEnd;
      const newVal = localContent.substring(0, start) + "  " + localContent.substring(end);
      handleChange(newVal);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      });
    }
  };

  const lines = localContent.split("\n");

  return (
    <div className="flex flex-col h-full bg-background/95">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-card/50 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm flex-shrink-0">{icon}</span>
          <span className="text-xs font-mono text-foreground/80 truncate">{path}</span>
          {isModified && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" title="Изменён" />
          )}
          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground flex-shrink-0">{lang}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors" title="Копировать">
            {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
          </button>
          {onSave && !readOnly && (
            <button onClick={handleSave} className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors" title="Сохранить (Ctrl+S)">
              {saved ? <Check size={13} className="text-green-400" /> : <Save size={13} />}
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex flex-col text-right select-none py-2 px-2 border-r border-border/30 bg-card/20 overflow-hidden">
          {lines.map((_, i) => (
            <span key={i} className="text-[11px] leading-5 text-muted-foreground/30 font-mono">
              {i + 1}
            </span>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={localContent}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          spellCheck={false}
          className={cn(
            "flex-1 p-2 font-mono text-[12px] leading-5 bg-transparent text-foreground/90",
            "resize-none outline-none border-none overflow-auto",
            "placeholder:text-muted-foreground/30",
            readOnly && "cursor-default"
          )}
          style={{ tabSize: 2 }}
        />
      </div>

      {!readOnly && onSave && (
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-border/50 bg-card/30 flex-shrink-0">
          <span className="text-[10px] text-muted-foreground">
            {lines.length} строк · {localContent.length} симв
          </span>
          <div className="flex items-center gap-2">
            <kbd className="text-[9px] bg-muted px-1 py-0.5 rounded text-muted-foreground">Ctrl+S</kbd>
            <span className="text-[9px] text-muted-foreground">сохранить</span>
          </div>
        </div>
      )}
    </div>
  );
}
