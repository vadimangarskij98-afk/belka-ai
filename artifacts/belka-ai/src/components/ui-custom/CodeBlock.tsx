import { Check, Copy, ChevronDown, ChevronRight, Play, X } from "lucide-react";
import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface CodeBlockProps {
  code: string;
  language: string;
  filename?: string;
}

const PREVIEWABLE = new Set(["html", "htm", "svg", "css", "javascript", "js", "jsx", "tsx"]);

function buildPreviewHtml(code: string, lang: string): string {
  const l = lang.toLowerCase();
  if (l === "html" || l === "htm" || l === "svg") return code;
  if (l === "css") return `<!DOCTYPE html><html><head><style>${code}</style></head><body><div class="demo">CSS Preview</div></body></html>`;
  if (["javascript", "js", "jsx", "tsx"].includes(l))
    return `<!DOCTYPE html><html><head><style>body{font-family:system-ui;padding:16px;background:#1a1b26;color:#e0e0e0}</style></head><body><pre id="out"></pre><script>const _log=console.log;const _lines=[];console.log=(...a)=>{_lines.push(a.map(x=>typeof x==='object'?JSON.stringify(x,null,2):String(x)).join(' '));document.getElementById('out').textContent=_lines.join('\\n')};try{${code}}catch(e){document.getElementById('out').textContent='Error: '+e.message}<\/script></body></html>`;
  return code;
}

export function CodeBlock({ code, language, filename }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const lines = code.split("\n").length;
  const canPreview = PREVIEWABLE.has(language.toLowerCase());

  const onCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="my-2 rounded-lg overflow-hidden border border-white/10 bg-[#1a1b26] text-sm">
        <div
          className="flex items-center justify-between px-3 py-1.5 bg-[#13141d] border-b border-white/5 cursor-pointer select-none"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            {expanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
            <span className="text-xs font-mono text-muted-foreground">{filename || language}</span>
            <span className="text-[10px] text-muted-foreground/50">{lines} lines</span>
          </div>
          <div className="flex items-center gap-1">
            {canPreview && (
              <button
                onClick={(e) => { e.stopPropagation(); setPreviewOpen(true); }}
                className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-green-400 transition-colors"
                title="Запустить превью"
              >
                <Play size={13} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onCopy(); }}
              className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            >
              {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
            </button>
          </div>
        </div>
        {expanded && (
          <div className="max-h-[400px] overflow-auto">
            <SyntaxHighlighter
              language={language.toLowerCase()}
              style={vscDarkPlus}
              customStyle={{ margin: 0, padding: '0.75rem', background: 'transparent', fontSize: '12px' }}
              showLineNumbers
              lineNumberStyle={{ minWidth: '2em', paddingRight: '0.75em', color: 'rgba(255,255,255,0.15)' }}
            >
              {code}
            </SyntaxHighlighter>
          </div>
        )}
      </div>

      {previewOpen && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold text-foreground">Превью — {filename || language}</span>
              <button onClick={() => setPreviewOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 bg-white">
              <iframe
                srcDoc={buildPreviewHtml(code, language)}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-modals"
                title="Code Preview"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
