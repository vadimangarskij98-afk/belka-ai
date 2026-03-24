import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Send, Mic, MicOff, Plug, Paperclip, Loader2, Search, FileCode, CheckCircle, Eye, Brain, FolderOpen, Github, PanelRight, PanelRightClose, Upload, X, Globe, ExternalLink, Code, ShieldCheck, Sparkles, TerminalSquare, Server, Download, ImageIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatSidebar } from "@/components/layout/ChatSidebar";
import { AgentAvatar } from "@/components/ui-custom/AgentAvatar";
import { ShinyText } from "@/components/ui-custom/ShinyText";
import { VoiceModal } from "@/components/ui-custom/VoiceModal";
import { CodeBlock } from "@/components/ui-custom/CodeBlock";
import { FileExplorer, type FileItem } from "@/components/ui-custom/FileExplorer";
import { CodeEditor } from "@/components/ui-custom/CodeEditor";
import { DiffViewer } from "@/components/ui-custom/DiffViewer";
import TerminalPanel from "@/components/ui-custom/TerminalPanel";
import PreviewStatusPopup from "@/components/ui-custom/PreviewStatusPopup";
import WorkspacePicker from "@/components/ui-custom/WorkspacePicker";
import { McpModal } from "@/components/modals/McpModal";
import { ProfileModal } from "@/components/modals/ProfileModal";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { PricingModal } from "@/components/modals/PricingModal";
import { GitHubModal } from "@/components/modals/GitHubModal";
import { useVoiceModal, useVoiceAssistant, playVoice } from "@/hooks/use-voice";
import type { VoiceAction } from "@/lib/voice-phrases";
import { t } from "@/lib/i18n";
import { openLocalFolder, listLocalFiles, readLocalFile, writeLocalFile, type LocalFile, getLanguageFromFilename, getFileIcon } from "@/lib/local-fs";
import { useTheme } from "@/lib/theme";
import {
  useGetConversation,
  useGetMessages,
  useCreateConversation,
  AgentRole,
} from "@workspace/api-client-react";

function parseContent(text: string) {
  const parts: { type: "text" | "code"; content: string; lang?: string; filename?: string }[] = [];
  const codeRegex = /```(\w*(?::[^\n]*)?)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const t = text.slice(lastIndex, match.index).trim();
      if (t) parts.push({ type: "text", content: t });
    }
    const [langRaw, filename] = match[1].split(":");
    parts.push({
      type: "code",
      content: match[2].trim(),
      lang: langRaw || "text",
      filename: filename?.trim(),
    });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    const t = text.slice(lastIndex).trim();
    if (t) parts.push({ type: "text", content: t });
  }
  return parts.length ? parts : [{ type: "text" as const, content: text }];
}

function buildPreviewFromMessages(messages: any[]): string {
  let html = "";
  let css = "";
  let js = "";
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === "user") continue;
    const parts = parseContent(msg.content || "");
    for (const part of parts) {
      if (part.type !== "code") continue;
      const lang = (part.lang || "").toLowerCase();
      if ((lang === "html" || lang === "htm") && !html) html = part.content;
      else if (lang === "css" && !css) css = part.content;
      else if ((lang === "javascript" || lang === "js" || lang === "jsx" || lang === "tsx") && !js) js = part.content;
    }
    if (html) break;
  }
  if (!html && !css && !js) return "";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${html}<script>${js}<\/script></body></html>`;
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg font-bold text-foreground mt-4 mb-2 first:mt-0 last:mb-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold text-foreground mt-3 mb-1.5 first:mt-0 last:mb-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-foreground mt-2 mb-1 first:mt-0 last:mb-0">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-foreground leading-relaxed mb-2 last:mb-0">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-foreground/90">{children}</em>
          ),
          code: ({ children, className, ...props }: any) => {
            const isBlock = /language-(\w+)/.test(className || "");
            if (isBlock) {
              const lang = /language-(\w+)/.exec(className || "")?.[1] || "text";
              return <CodeBlock code={String(children).trim()} language={lang} />;
            }
            return (
              <code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono text-[12px] border border-primary/20">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <>{children}</>,
          ul: ({ children }) => (
            <ul className="my-2 space-y-1 pl-0 list-none">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 space-y-1 pl-0 list-none">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="flex items-start gap-2 text-foreground">
              <span className="mt-2 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary/60" />
              <span className="flex-1">{children}</span>
            </li>
          ),
          hr: () => <hr className="my-3 border-border/40" />,
          blockquote: ({ children }) => (
            <blockquote className="pl-3 my-2 border-l-2 border-primary/50 text-muted-foreground italic">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-lg border border-border/50">
              <table className="w-full text-sm border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="border-b border-border/30 last:border-0">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-semibold text-foreground text-xs uppercase tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-foreground/80">{children}</td>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

interface ToolCall {
  tool: string;
  args: Record<string, any>;
  status: "running" | "done" | "error";
  result?: string;
  error?: string;
  startedAt: number;
}

interface StreamingState {
  isStreaming: boolean;
  steps: { step: string; text: string; done: boolean; startedAt?: number; endedAt?: number }[];
  content: string;
  sources: { title: string; url: string; snippet: string }[];
  agentName: string;
  agentContent: string;
  agentStreaming: boolean;
  error: string | null;
  thinkingStartMs: number;
  thinkingDurationMs: number;
  toolCalls: ToolCall[];
  imageUrl: string | null;
  imagePrompt: string | null;
}

const STEP_ICONS: Record<string, any> = {
  thinking: Brain,
  searching: Search,
  generating: Sparkles,
  generating_image: ImageIcon,
  coding: Code,
  reviewing: ShieldCheck,
  writing: FileCode,
};

const STEP_LABELS: Record<string, string> = {
  thinking: "Анализ запроса",
  searching: "Поиск в интернете",
  generating: "Генерация ответа",
  generating_image: "Генерация изображения",
  coding: "Написание кода",
  reviewing: "Ревью решения",
  writing: "Написание ответа",
};

const TOOL_LABELS: Record<string, string> = {
  create_file: "Создание файла",
  edit_file: "Редактирование",
  delete_file: "Удаление файла",
  run_command: "Команда",
};

function ToolCallBlockInline({ tool, args, status, result, error }: { tool: string; args: Record<string, any>; status: string; result?: string; error?: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs py-1 ${status === "error" ? "text-red-400" : status === "done" ? "text-muted-foreground" : "text-foreground"}`}>
      {status === "running" ? (
        <Loader2 size={13} className="animate-spin text-primary flex-shrink-0" />
      ) : status === "done" ? (
        <CheckCircle size={13} className="text-green-500 flex-shrink-0" />
      ) : (
        <FileCode size={13} className="text-red-400 flex-shrink-0" />
      )}
      <span className={status === "running" ? "font-medium" : ""}>{TOOL_LABELS[tool] || tool}</span>
      {args.path && <code className="text-[10px] bg-white/10 dark:bg-white/10 px-1 py-0.5 rounded font-mono">{args.path}</code>}
      {result && <span className="text-[10px] text-muted-foreground/50 ml-auto truncate max-w-[150px]">{result}</span>}
      {error && <span className="text-[10px] text-red-400/70 ml-auto truncate max-w-[150px]">{error}</span>}
    </div>
  );
}

const MODE_OPTIONS = [
  { value: "code" as const, label: () => t("code"), icon: Code },
  { value: "chat" as const, label: () => t("chat"), icon: Sparkles },
  { value: "multi-agent" as const, label: () => t("multiAgent"), icon: Brain },
  { value: "image" as const, label: () => t("image"), icon: ImageIcon },
];

function ModeSwitcher({ mode, setMode }: { mode: string; setMode: (m: any) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  const updateIndicator = useCallback(() => {
    if (!containerRef.current) return;
    const activeBtn = containerRef.current.querySelector(`[data-mode="${mode}"]`) as HTMLElement;
    if (activeBtn) {
      setIndicatorStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
      });
    }
  }, [mode]);

  useEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(updateIndicator);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [updateIndicator]);

  return (
    <div ref={containerRef} className="relative flex items-center gap-0 rounded-xl border border-white/[0.08] bg-white/[0.04] p-[3px]">
      <div
        className="absolute top-[3px] h-[calc(100%-6px)] rounded-lg transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
          background: "linear-gradient(135deg, rgba(59,130,246,0.55), rgba(139,92,246,0.55))",
          backdropFilter: "blur(12px)",
          boxShadow: "0 0 12px rgba(59,130,246,0.25), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.1)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      />
      {MODE_OPTIONS.map((m) => {
        const Icon = m.icon;
        const isActive = mode === m.value;
        return (
          <button
            key={m.value}
            data-mode={m.value}
            onClick={() => setMode(m.value)}
            className={`relative z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors duration-300 ${
              isActive ? "text-white" : "text-muted-foreground hover:text-foreground/80"
            }`}
          >
            <Icon size={12} />
            <span>{m.label()}</span>
          </button>
        );
      })}
    </div>
  );
}

function StepTimer({ startedAt, isActive }: { startedAt?: number; isActive: boolean }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!isActive || !startedAt) return;
    const interval = setInterval(() => setElapsed(Date.now() - startedAt), 100);
    return () => clearInterval(interval);
  }, [isActive, startedAt]);
  if (!isActive && !startedAt) return null;
  const ms = isActive ? elapsed : 0;
  return <span className="text-[10px] font-mono text-muted-foreground/50 ml-auto tabular-nums">{(ms / 1000).toFixed(1)}s</span>;
}

function StreamingIndicator({ state }: { state: StreamingState }) {
  return (
    <div className="flex gap-2.5 justify-start">
      <div className="mt-0.5 flex-shrink-0">
        <AgentAvatar role={AgentRole.coder} isPulsing className="w-7 h-7" />
      </div>
      <div className="flex flex-col items-start max-w-[80%] w-full">
        <span className="text-[10px] font-semibold text-muted-foreground mb-0.5 ml-0.5 tracking-wider uppercase">
          BELKA CODER
        </span>

        {state.steps.length > 0 && (
          <div className="glass-panel px-3 py-2 rounded-2xl rounded-tl-sm mb-1.5 w-full">
            <div className="space-y-1.5">
              {state.steps.map((step, i) => {
                const Icon = STEP_ICONS[step.step] || Brain;
                const isActive = !step.done;
                const label = STEP_LABELS[step.step] || step.text;
                const duration = step.endedAt && step.startedAt ? step.endedAt - step.startedAt : undefined;
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-2 text-xs transition-all duration-500 ${
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {isActive ? (
                      <Loader2 size={13} className="animate-spin text-primary flex-shrink-0" />
                    ) : (
                      <CheckCircle size={13} className="text-green-500 flex-shrink-0" />
                    )}
                    <span className={isActive ? "font-medium" : ""}>{label}</span>
                    {isActive ? (
                      <StepTimer startedAt={step.startedAt} isActive={true} />
                    ) : duration !== undefined ? (
                      <span className="text-[10px] font-mono text-muted-foreground/40 ml-auto tabular-nums">{(duration / 1000).toFixed(1)}s</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {state.toolCalls.length > 0 && (
          <div className="glass-panel px-3 py-2 rounded-2xl rounded-tl-sm mb-1.5 w-full">
            {state.toolCalls.map((tc, i) => (
              <ToolCallBlockInline key={i} tool={tc.tool} args={tc.args} status={tc.status} result={tc.result} error={tc.error} />
            ))}
          </div>
        )}

        {state.sources.length > 0 && (
          <div className="glass-panel px-3 py-2 rounded-2xl rounded-tl-sm mb-1.5 w-full">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Globe size={12} className="text-blue-400" />
              <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Источники</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {state.sources.map((src, i) => (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 hover:bg-blue-500/20 hover:text-blue-200 transition-colors max-w-[200px] truncate"
                  title={src.title}
                >
                  <ExternalLink size={10} className="flex-shrink-0" />
                  <span className="truncate">{src.title || new URL(src.url).hostname}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {state.imageUrl && (
          <div className="glass-panel px-3 py-2 rounded-2xl rounded-tl-sm mb-1.5 w-full">
            <div className="flex items-center gap-1.5 mb-2">
              <ImageIcon size={12} className="text-violet-400" />
              <span className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider">Сгенерированное изображение</span>
            </div>
            <div className="relative group/img rounded-xl overflow-hidden">
              <img src={state.imageUrl} alt={state.imagePrompt || "Generated image"} className="w-full max-w-md rounded-xl" loading="eager" />
              <a
                href={state.imageUrl}
                download={`belka-image-${Date.now()}.png`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-2 right-2 p-2 rounded-lg bg-black/60 backdrop-blur-sm text-white opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-black/80"
                title="Скачать изображение"
              >
                <Download size={16} />
              </a>
            </div>
          </div>
        )}

        {state.content && (
          <StreamingContent content={state.content} />
        )}

        {state.agentStreaming && (
          <div className="mt-2 w-full">
            <div className="flex gap-2.5 justify-start">
              <div className="mt-0.5 flex-shrink-0">
                <AgentAvatar role={AgentRole.reviewer} isPulsing className="w-7 h-7" />
              </div>
              <div className="flex flex-col items-start max-w-full w-full">
                <span className="text-[10px] font-semibold text-muted-foreground mb-0.5 ml-0.5 tracking-wider uppercase">
                  {state.agentName}
                </span>
                {state.agentContent && <StreamingContent content={state.agentContent} />}
              </div>
            </div>
          </div>
        )}

        {state.error && (
          <div className="glass-panel px-3 py-2 rounded-2xl rounded-tl-sm border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
            {state.error}
          </div>
        )}
      </div>
    </div>
  );
}

function StreamingContent({ content }: { content: string }) {
  const parts = useMemo(() => parseContent(content), [content]);
  return (
    <div className="space-y-1 w-full">
      {parts.map((part, idx) =>
        part.type === "code" ? (
          <CodeBlock key={idx} code={part.content} language={part.lang || "text"} filename={part.filename} />
        ) : (
          <div key={idx} className="glass-panel px-3 py-2 rounded-2xl rounded-tl-sm">
            <ShinyText className="text-sm leading-relaxed whitespace-pre-wrap">{part.content}</ShinyText>
          </div>
        )
      )}
    </div>
  );
}

export default function ChatPage() {
  const params = useParams();
  const conversationId = params.id;
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"chat" | "code" | "multi-agent" | "image">("code");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mcpOpen, setMcpOpen] = useState(false);
  const [githubOpen, setGithubOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [, navigate] = useLocation();
  const handleSubmitRef = useRef<(text: string) => void>(() => {});
  const { theme, setTheme: setThemeValue } = useTheme();

  const [filesPanelOpen, setFilesPanelOpen] = useState(false);
  const [fileSource, setFileSource] = useState<"local" | "github" | null>(null);
  const [localFiles, setLocalFiles] = useState<FileItem[]>([]);
  const [localDirHandle, setLocalDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [openedFileContent, setOpenedFileContent] = useState<string | null>(null);
  const [fileIsModified, setFileIsModified] = useState(false);
  const [pendingDiffs, setPendingDiffs] = useState<{ path: string; oldContent: string | null; newContent: string | null }[]>([]);
  const [changedPaths, setChangedPaths] = useState<Set<string>>(new Set());
  const [githubRepo, setGithubRepo] = useState<{ fullName: string; branch: string } | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [previewStatusOpen, setPreviewStatusOpen] = useState(false);
  const [workspacePickerOpen, setWorkspacePickerOpen] = useState(false);
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);

  const [streaming, setStreaming] = useState<StreamingState>({
    isStreaming: false,
    steps: [],
    content: "",
    sources: [],
    agentName: "",
    agentContent: "",
    agentStreaming: false,
    error: null,
    thinkingStartMs: 0,
    thinkingDurationMs: 0,
    toolCalls: [],
    imageUrl: null,
    imagePrompt: null,
  });

  const handleVoiceAction = useCallback((action: VoiceAction) => {
    switch (action.type) {
      case 'navigate':
        if (action.path === '__sidebar_open') setSidebarCollapsed(false);
        else if (action.path === '__sidebar_close') setSidebarCollapsed(true);
        else navigate(action.path);
        break;
      case 'setMode': setMode(action.mode); break;
      case 'newChat': navigate('/chat'); break;
      case 'writePrompt': setInput(prev => prev ? prev + ' ' + action.text : action.text); break;
      case 'sendChat':
        setInput(prev => {
          if (prev.trim()) setTimeout(() => handleSubmitRef.current(prev), 0);
          return '';
        });
        break;
      case 'logout':
        localStorage.removeItem('belka-user');
        localStorage.removeItem('belka-plan');
        localStorage.removeItem('belka-card');
        navigate('/auth');
        break;
      case 'toggleSidebar': setSidebarCollapsed(prev => !prev); break;
      case 'clearInput': setInput(''); break;
      case 'toggleTheme': setThemeValue(theme === 'dark' ? 'light' : 'dark'); break;
      case 'setTheme': setThemeValue(action.theme); break;
      case 'changeName': localStorage.setItem('belka-display-name', action.name); playVoice('settings_saved'); break;
      case 'changeBio': localStorage.setItem('belka-bio', action.bio); playVoice('settings_saved'); break;
      case 'micOff': break;
      case 'sendToAgent':
        setInput(action.text);
        setTimeout(() => handleSubmitRef.current(action.text), 100);
        break;
      case 'webSearch':
        setInput(`Найди информацию в интернете: ${action.query}`);
        setTimeout(() => handleSubmitRef.current(`Найди информацию в интернете: ${action.query}`), 100);
        break;
      case 'openLocalFolder': handleOpenLocalFolder(); break;
      case 'connectGitHub': setGithubOpen(true); break;
      case 'openFilesPanel': setFilesPanelOpen(true); break;
      case 'closeFilesPanel': setFilesPanelOpen(false); break;
      case 'pushToGitHub':
        if (githubRepo) handlePushToGitHub(action.message || 'Update files via BELKA AI');
        else setGithubOpen(true);
        break;
      case 'saveCurrentFile':
        if (selectedFilePath && openedFileContent !== null) handleSaveFile(selectedFilePath, openedFileContent);
        break;
      case 'createFile': setInput('Создай новый файл в проекте'); break;
      case 'openModal':
        if (action.modal === 'profile') setProfileOpen(true);
        else if (action.modal === 'settings') setSettingsOpen(true);
        else if (action.modal === 'pricing') setPricingOpen(true);
        else if (action.modal === 'mcp') setMcpOpen(true);
        else if (action.modal === 'github') setGithubOpen(true);
        break;
      case 'clarify': playVoice('start_work'); break;
      case 'runPreview': {
        setPreviewOpen(true);
        break;
      }
    }
  }, [navigate, theme, setThemeValue, githubRepo, selectedFilePath, openedFileContent]);

  const handleOpenLocalFolder = useCallback(async () => {
    const handle = await openLocalFolder();
    if (!handle) return;
    setLocalDirHandle(handle);
    const files = await listLocalFiles(handle);
    const toFileItem = (f: LocalFile, depth = 0): FileItem => ({
      name: f.name, path: f.path, type: f.type, size: f.size,
      language: f.type === 'file' ? getLanguageFromFilename(f.name) : undefined,
      icon: f.type === 'file' ? getFileIcon(f.name) : undefined,
      children: f.children ? f.children.map(c => toFileItem(c, depth + 1)) : undefined,
    });
    setLocalFiles(files.map(f => toFileItem(f)));
    setFileSource("local");
    setFilesPanelOpen(true);
    playVoice('analyzing');
  }, []);

  const handleOpenFile = useCallback(async (file: FileItem) => {
    if (!localDirHandle || file.type !== 'file') return;
    setSelectedFilePath(file.path);
    try {
      const content = await readLocalFile(file.path, localDirHandle);
      setOpenedFileContent(content || '');
      setFileIsModified(false);
    } catch { setOpenedFileContent(''); }
  }, [localDirHandle]);

  const handleSaveFile = useCallback(async (path: string, content: string) => {
    if (!localDirHandle) return;
    await writeLocalFile(path, content, localDirHandle);
    setFileIsModified(false);
    playVoice('save');
  }, [localDirHandle]);

  const handlePushToGitHub = useCallback(async (message: string) => {
    if (!githubRepo || !localDirHandle) return;
    const token = localStorage.getItem("belka-token") || "";
    const BASE = import.meta.env.BASE_URL || "/";
    const API = `${BASE}api`.replace(/\/\/+/g, "/");
    const filesToPush = Array.from(changedPaths);
    if (filesToPush.length === 0) { playVoice('start_work'); return; }
    const files: { path: string; content: string }[] = [];
    for (const fp of filesToPush) {
      const c = await readLocalFile(fp, localDirHandle);
      if (c !== null) files.push({ path: fp, content: c });
    }
    const res = await fetch(`${API}/github/repos/${encodeURIComponent(githubRepo.fullName)}/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ branch: githubRepo.branch, message, files }),
    });
    const data = await res.json();
    if (data.success) { setChangedPaths(new Set()); playVoice('save'); }
    else playVoice('start_work');
  }, [githubRepo, localDirHandle, changedPaths]);

  const voiceModal = useVoiceModal();
  const voiceAssistant = useVoiceAssistant(handleVoiceAction);
  const createConvMutation = useCreateConversation();

  const { data: conversation } = useGetConversation(conversationId || "", {
    query: { enabled: !!conversationId }
  });
  const { data: messagesData, refetch: refetchMessages } = useGetMessages(conversationId || "", {
    query: { enabled: !!conversationId }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messagesData?.messages, streaming.content, streaming.steps]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    if (mq.matches) setSidebarCollapsed(true);
  }, []);

  const handleSubmit = useCallback(async (text: string) => {
    if (!text.trim() || streaming.isStreaming) return;

    let content = text;
    if (attachedFile) {
      content += `\n\n[Файл: ${attachedFile.name}]`;
      setAttachedFile(null);
      setAttachedPreview(null);
    }

    setInput("");

    try {
      let activeId = conversationId;

      if (!activeId) {
        const newConv = await createConvMutation.mutateAsync({
          data: { title: text.slice(0, 30) + "...", mode }
        });
        activeId = newConv.id;
        window.history.pushState({}, '', `${import.meta.env.BASE_URL}chat/${activeId}`);
      }

      setStreaming({
        isStreaming: true,
        steps: [],
        content: "",
        sources: [],
        agentName: "",
        agentContent: "",
        agentStreaming: false,
        error: null,
        thinkingStartMs: Date.now(),
        thinkingDurationMs: 0,
        toolCalls: [],
        imageUrl: null,
        imagePrompt: null,
      });

      const BASE = import.meta.env.BASE_URL || "/";
      const API = `${BASE}api`.replace(/\/\/+/g, "/");

      const response = await fetch(`${API}/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, mode, useMultiAgent: mode === "multi-agent" }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: "Network error" }));
        setStreaming(prev => ({ ...prev, isStreaming: false, error: errData.error || "Request failed" }));
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setStreaming(prev => ({ ...prev, isStreaming: false, error: "No response stream" }));
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() || "";

        for (const block of blocks) {
          if (!block.trim()) continue;
          const lines = block.split("\n");
          let eventType = "";
          let dataStr = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) eventType = line.slice(7).trim();
            else if (line.startsWith("data: ")) dataStr = line.slice(6);
          }
          if (eventType && dataStr) {
            try {
              const data = JSON.parse(dataStr);
              handleSSEEvent(eventType, data);
            } catch {}
          }
        }
      }

      setStreaming(prev => ({ ...prev, isStreaming: false }));
      refetchMessages();
    } catch (error: any) {
      console.error("Failed to send message", error);
      setStreaming(prev => ({ ...prev, isStreaming: false, error: error.message || "Connection error" }));
    }
  }, [conversationId, mode, streaming.isStreaming, attachedFile, createConvMutation, refetchMessages]);

  const handleSSEEvent = useCallback((event: string, data: any) => {
    switch (event) {
      case "thinking_start":
        setStreaming(prev => ({ ...prev, thinkingStartMs: data.timestamp || Date.now() }));
        break;
      case "thinking_end":
        setStreaming(prev => ({ ...prev, thinkingDurationMs: data.duration || 0 }));
        break;
      case "status":
        setStreaming(prev => {
          const now = Date.now();
          const updatedSteps = prev.steps.map(s => s.done ? s : { ...s, done: true, endedAt: now });
          return {
            ...prev,
            steps: [...updatedSteps, { step: data.step, text: data.text, done: false, startedAt: now }],
          };
        });
        if (voiceAssistant.isActive) {
          if (data.step === "searching") playVoice("researching");
          else if (data.step === "thinking") playVoice("analyzing");
          else if (data.step === "generating" || data.step === "coding") playVoice("writing");
          else if (data.step === "reviewing") playVoice("checking");
        }
        break;
      case "sources":
        setStreaming(prev => ({ ...prev, sources: data.sources }));
        break;
      case "delta":
        setStreaming(prev => ({
          ...prev,
          steps: prev.steps.map(s => s.done ? s : { ...s, done: true, endedAt: Date.now() }),
          content: prev.content + data.content,
        }));
        break;
      case "tool_call":
        setStreaming(prev => ({
          ...prev,
          toolCalls: [...prev.toolCalls, { tool: data.tool, args: data.args || {}, status: "running", startedAt: Date.now() }],
        }));
        break;
      case "tool_result":
        setStreaming(prev => ({
          ...prev,
          toolCalls: prev.toolCalls.map((tc, i) =>
            i === prev.toolCalls.length - 1
              ? { ...tc, status: data.status || "done", result: data.result, error: data.error }
              : tc
          ),
        }));
        break;
      case "agent_start":
        setStreaming(prev => ({
          ...prev,
          agentStreaming: true,
          agentName: data.agent,
          agentContent: "",
        }));
        break;
      case "agent_delta":
        setStreaming(prev => ({
          ...prev,
          agentContent: prev.agentContent + data.content,
        }));
        break;
      case "agent_done":
        setStreaming(prev => ({
          ...prev,
          agentStreaming: false,
        }));
        break;
      case "image":
        setStreaming(prev => ({
          ...prev,
          imageUrl: data.url,
          imagePrompt: data.prompt || "",
        }));
        break;
      case "error":
        setStreaming(prev => ({
          ...prev,
          isStreaming: false,
          error: data.message,
        }));
        break;
      case "done":
        setStreaming(prev => ({
          ...prev,
          steps: prev.steps.map(s => s.done ? s : { ...s, done: true, endedAt: Date.now() }),
        }));
        break;
    }
  }, [voiceAssistant.isActive]);

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  const messages = messagesData?.messages || [];

  useEffect(() => {
    if (previewOpen && messages.length) {
      const html = buildPreviewFromMessages(messages);
      if (html) setPreviewHtml(html);
    }
  }, [previewOpen, messages]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <ChatSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeConvId={conversationId}
        isPending={streaming.isStreaming}
      />

      <main className="flex-1 flex flex-col relative min-w-0">
        <header className="h-12 border-b border-border/50 flex items-center px-4 justify-between bg-background/80 backdrop-blur-md z-10 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-foreground truncate">
              {conversation?.title || t("newWorkspace")}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-mono border border-primary/20 flex-shrink-0">
              {mode === "multi-agent" ? t("multiAgent") : mode === "image" ? t("image") : mode === "chat" ? t("chat") : t("code")}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={() => setMcpOpen(true)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors" title="MCP Servers">
              <Plug size={14} />
            </button>
            <button onClick={() => setTerminalOpen(prev => !prev)} className={`p-1.5 rounded-lg transition-colors ${terminalOpen ? "bg-emerald-500/20 text-emerald-400" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`} title="Terminal">
              <TerminalSquare size={14} />
            </button>
            <button onClick={() => setPreviewStatusOpen(prev => !prev)} className={`p-1.5 rounded-lg transition-colors ${previewStatusOpen ? "bg-blue-500/20 text-blue-400" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`} title="Preview Server">
              <Server size={14} />
            </button>
            <button onClick={() => setWorkspacePickerOpen(true)} className={`p-1.5 rounded-lg transition-colors ${workspacePath ? "bg-violet-500/20 text-violet-400" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`} title="Рабочая папка">
              <FolderOpen size={14} />
            </button>
            <div className="h-4 w-px bg-border/50 mx-0.5" />
            <button onClick={() => setGithubOpen(true)} title="GitHub"
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors border ${githubRepo ? 'text-green-400 border-green-400/30 bg-green-400/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent hover:border-border/50'}`}>
              <Github size={14} />
              <span className="hidden sm:inline">{githubRepo ? githubRepo.fullName.split('/')[1] : 'GitHub'}</span>
            </button>
            {filesPanelOpen ? (
              <button onClick={() => setFilesPanelOpen(false)} title="Закрыть файловую панель"
                className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg text-primary bg-primary/10 border border-primary/20 transition-colors">
                <PanelRightClose size={14} />
              </button>
            ) : localFiles.length > 0 && (
              <button onClick={() => setFilesPanelOpen(true)} title="Открыть файловую панель"
                className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent hover:border-border/50 transition-colors">
                <PanelRight size={14} />
              </button>
            )}
            <AgentAvatar role={AgentRole.coder} className="w-7 h-7" />
            {mode === "multi-agent" && (
              <>
                <AgentAvatar role={AgentRole.reviewer} className="w-7 h-7 -ml-2" />
                <AgentAvatar role={AgentRole.designer} className="w-7 h-7 -ml-2" />
              </>
            )}
          </div>
        </header>

        <div className="flex flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto pb-36 px-4 md:px-6 lg:px-16 w-full">
            {messages.length === 0 && !streaming.isStreaming ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto p-4">
                <AgentAvatar role={AgentRole.coder} className="w-16 h-16 mb-4" isPulsing />
                <ShinyText as="h2" className="text-xl sm:text-2xl font-display font-bold mb-2">
                  {t("whatBuilding")}
                </ShinyText>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("describeProject")}
                </p>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-4 pt-4">
                {messages.map((msg: any, i: number) => (
                  <MessageBubble key={msg.id || i} msg={msg} isLast={i === messages.length - 1} isStreaming={streaming.isStreaming && i === messages.length - 1 && msg.role !== "user"} onImagePreview={setImagePreviewUrl} />
                ))}

                {streaming.isStreaming && <StreamingIndicator state={streaming} />}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {filesPanelOpen && (
            <div className="w-80 border-l border-border/50 flex flex-col bg-background/80 backdrop-blur-sm flex-shrink-0">
              <div className="h-10 border-b border-border/50 flex items-center justify-between px-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">
                    {fileSource === 'github' ? githubRepo?.fullName : 'Локальный проект'}
                  </span>
                  {changedPaths.size > 0 && (
                    <span className="text-[10px] bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 px-1.5 py-0.5 rounded-full">
                      {changedPaths.size} изм.
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {githubRepo && changedPaths.size > 0 && (
                    <button onClick={() => handlePushToGitHub('Update via BELKA AI')} title="Push to GitHub"
                      className="flex items-center gap-1 text-[10px] px-2 py-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg border border-green-500/30 transition-colors">
                      <Upload size={10} /> Push
                    </button>
                  )}
                  <button onClick={() => setFilesPanelOpen(false)} className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors">
                    <X size={14} />
                  </button>
                </div>
              </div>

              {selectedFilePath && openedFileContent !== null ? (
                <div className="flex flex-col flex-1 min-h-0">
                  <div className="h-8 border-b border-border/50 flex items-center px-3 gap-2 flex-shrink-0">
                    <button onClick={() => { setSelectedFilePath(null); setOpenedFileContent(null); }}
                      className="text-muted-foreground hover:text-foreground text-xs">← Назад</button>
                    <span className="text-[10px] text-muted-foreground truncate flex-1">{selectedFilePath}</span>
                    {fileIsModified && (
                      <button onClick={() => handleSaveFile(selectedFilePath, openedFileContent)}
                        className="text-[10px] px-2 py-0.5 bg-primary/20 text-primary rounded border border-primary/30">Сохранить</button>
                    )}
                  </div>
                  <CodeEditor
                    content={openedFileContent}
                    path={selectedFilePath}
                    onChange={(v) => { setOpenedFileContent(v); setFileIsModified(true); setChangedPaths(prev => new Set(prev).add(selectedFilePath)); }}
                    onSave={(v) => handleSaveFile(selectedFilePath, v)}
                    isModified={fileIsModified}
                  />
                </div>
              ) : (
                <FileExplorer
                  files={localFiles}
                  onSelectFile={(path) => {
                    const findFile = (items: FileItem[], p: string): FileItem | null => {
                      for (const f of items) {
                        if (f.path === p) return f;
                        if (f.children) { const r = findFile(f.children, p); if (r) return r; }
                      }
                      return null;
                    };
                    const f = findFile(localFiles, path);
                    if (f) handleOpenFile(f);
                  }}
                  changedPaths={changedPaths}
                  source={fileSource}
                  githubRepo={githubRepo?.fullName}
                  githubBranch={githubRepo?.branch}
                  onOpenLocalFolder={handleOpenLocalFolder}
                  onConnectGitHub={() => setGithubOpen(true)}
                />
              )}
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-8 pb-3 px-4 md:px-6 lg:px-16">
          <div className="max-w-3xl mx-auto">
            {attachedFile && (
              <div className="mb-1.5 flex items-center gap-2 w-fit">
                {attachedPreview ? (
                  <div className="relative group">
                    <img
                      src={attachedPreview}
                      alt={attachedFile.name}
                      className="h-16 max-w-[200px] rounded-lg border border-primary/20 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setImagePreviewUrl(attachedPreview)}
                    />
                    <button onClick={() => { setAttachedFile(null); setAttachedPreview(null); }} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs shadow-lg hover:bg-red-600">
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary">
                    <Paperclip size={12} />
                    <span className="truncate max-w-[180px]">{attachedFile.name}</span>
                    <button onClick={() => setAttachedFile(null)} className="text-primary/60 hover:text-primary ml-1">&times;</button>
                  </div>
                )}
              </div>
            )}
            <div className="glass-panel rounded-xl p-1.5 flex flex-col shadow-xl border border-border focus-within:border-primary/50 transition-all duration-300">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(input);
                  }
                }}
                placeholder={t("messagePlaceholder")}
                className="w-full bg-transparent border-none resize-none px-3 py-2 min-h-[44px] max-h-[140px] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
                style={{ outline: "none", boxShadow: "none", WebkitAppearance: "none" }}
                rows={1}
                disabled={streaming.isStreaming}
              />

              <div className="flex items-center justify-between px-1.5 pb-0.5 pt-1">
                <div className="flex items-center gap-0.5">
                  <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setAttachedFile(f);
                      if (f.type.startsWith("image/")) {
                        const reader = new FileReader();
                        reader.onload = (ev) => setAttachedPreview(ev.target?.result as string);
                        reader.readAsDataURL(f);
                      } else {
                        setAttachedPreview(null);
                      }
                    }
                  }} />
                  <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Attach file">
                    <Paperclip size={16} />
                  </button>
                  <ModeSwitcher mode={mode} setMode={setMode} />
                </div>

                <div className="flex items-center gap-1.5">
                  {voiceAssistant.isActive && voiceAssistant.lastTranscript && (
                    <div className="text-[10px] text-muted-foreground/70 max-w-[140px] truncate animate-pulse">
                      {voiceAssistant.lastTranscript}
                    </div>
                  )}
                  {voiceAssistant.isDictating && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-medium animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      ДИКТОВКА
                    </div>
                  )}
                  <button
                    onClick={voiceAssistant.toggle}
                    className={`relative p-2 rounded-lg transition-all ${
                      voiceAssistant.isDictating
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 ring-1 ring-red-500/40'
                        : voiceAssistant.isActive
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 ring-1 ring-green-500/40'
                          : 'bg-secondary/10 text-secondary hover:bg-secondary/20'
                    }`}
                    title={voiceAssistant.isDictating ? 'Режим диктовки' : voiceAssistant.isActive ? 'Voice Assistant ON' : 'Voice Assistant OFF'}
                  >
                    {voiceAssistant.isActive ? <Mic size={16} /> : <MicOff size={16} />}
                    {voiceAssistant.isActive && (
                      <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse ${voiceAssistant.isDictating ? 'bg-red-400' : 'bg-green-400'}`} />
                    )}
                  </button>
                  <button
                    onClick={() => handleSubmit(input)}
                    disabled={!input.trim() || streaming.isStreaming}
                    className="p-2 rounded-lg belka-gradient text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20"
                  >
                    <Send size={16} className={streaming.isStreaming ? "animate-pulse" : ""} />
                  </button>
                </div>
              </div>
            </div>
            {terminalOpen && (
              <div className="mt-2">
                <TerminalPanel isOpen={terminalOpen} onClose={() => setTerminalOpen(false)} />
              </div>
            )}
            <div className="text-center mt-2 text-[10px] text-muted-foreground/50 font-mono">
              {t("disclaimer")}
            </div>
          </div>
        </div>
      </main>

      <VoiceModal
        isOpen={voiceModal.isOpen}
        isListening={voiceModal.isListening}
        transcript={voiceModal.transcript}
        onClose={voiceModal.closeModal}
        onStopListening={voiceModal.stopListening}
        onSubmit={(text) => {
          playVoice('sending');
          setInput(text);
          voiceModal.closeModal();
          handleSubmit(text);
        }}
      />

      <McpModal open={mcpOpen} onClose={() => setMcpOpen(false)} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} />

      {imagePreviewUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setImagePreviewUrl(null)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setImagePreviewUrl(null)} className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-black/80 text-white flex items-center justify-center shadow-lg hover:bg-black z-10 border border-white/20">
              <X size={16} />
            </button>
            <img src={imagePreviewUrl} alt="Preview" className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain" />
            <a href={imagePreviewUrl} download="belka-image.png" target="_blank" rel="noopener noreferrer"
              className="absolute bottom-3 right-3 p-2.5 rounded-lg bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-colors border border-white/20">
              <Download size={18} />
            </a>
          </div>
        </div>
      )}
      <GitHubModal
        open={githubOpen}
        onClose={() => setGithubOpen(false)}
        onSelectRepo={(repo) => {
          setGithubRepo(repo);
          setFileSource("github");
          setFilesPanelOpen(true);
        }}
      />

      <WorkspacePicker
        isOpen={workspacePickerOpen}
        onClose={() => setWorkspacePickerOpen(false)}
        onSelect={(p) => setWorkspacePath(p)}
      />

      <PreviewStatusPopup
        isOpen={previewStatusOpen}
        onClose={() => setPreviewStatusOpen(false)}
      />

      {previewOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold text-foreground">Превью</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPreviewStatusOpen(prev => !prev)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Server status">
                  <Server size={14} />
                </button>
                <button onClick={() => setPreviewOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-white">
              {previewHtml ? (
                <iframe srcDoc={previewHtml} className="w-full h-full border-0" sandbox="allow-scripts allow-modals" title="Preview" />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Нет содержимого для предпросмотра. Сгенерируйте HTML/CSS/JS код в чате.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg, isLast, isStreaming, onImagePreview }: {
  msg: any;
  isLast: boolean;
  isStreaming?: boolean;
  onImagePreview?: (url: string) => void;
}) {
  const parts = useMemo(() => parseContent(msg.content || ""), [msg.content]);
  const sources = useMemo(() => {
    try {
      return msg.metadata?.sources || [];
    } catch { return []; }
  }, [msg.metadata]);
  const imageUrl = msg.metadata?.image || null;
  const isUser = msg.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} group`}>
      {!isUser && (
        <div className="mt-0.5 flex-shrink-0">
          <AgentAvatar
            role={msg.agentName === "CODE REVIEWER" ? AgentRole.reviewer : AgentRole.coder}
            className="w-8 h-8"
          />
        </div>
      )}

      <div className={`flex flex-col min-w-0 ${isUser ? "items-end max-w-[80%]" : "items-start max-w-[88%]"}`}>
        {!isUser && msg.agentName && (
          <span className="text-[10px] font-semibold text-muted-foreground mb-1 ml-1 tracking-widest uppercase">
            {msg.agentName}
          </span>
        )}

        {sources.length > 0 && (
          <div className="glass-panel px-3 py-2 rounded-2xl rounded-tl-sm mb-1 w-full">
            <div className="flex items-center gap-1.5 mb-1">
              <Globe size={12} className="text-blue-400" />
              <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Источники</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sources.map((src: any, i: number) => (
                <a key={i} href={src.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 hover:bg-blue-500/20 hover:text-blue-200 transition-colors max-w-[200px] truncate"
                  title={src.title}>
                  <ExternalLink size={10} className="flex-shrink-0" />
                  <span className="truncate">{src.title || new URL(src.url).hostname}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {imageUrl && !isUser && (
          <div className="glass-panel px-3 py-2 rounded-2xl rounded-tl-sm mb-1 w-full">
            <div className="flex items-center gap-1.5 mb-2">
              <ImageIcon size={12} className="text-violet-400" />
              <span className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider">Изображение</span>
            </div>
            <div className="relative group/img rounded-xl overflow-hidden">
              <img
                src={imageUrl}
                alt="Generated image"
                className="w-full max-w-md rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                loading="lazy"
                onClick={() => onImagePreview?.(imageUrl)}
              />
              <a
                href={imageUrl}
                download={`belka-image.png`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-2 right-2 p-2 rounded-lg bg-black/60 backdrop-blur-sm text-white opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-black/80"
                title="Скачать"
              >
                <Download size={16} />
              </a>
            </div>
          </div>
        )}

        {isUser ? (
          <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm bg-primary text-primary-foreground text-sm leading-relaxed shadow-lg shadow-primary/15 select-text">
            {msg.content}
          </div>
        ) : (
          <div className="space-y-1.5 w-full min-w-0">
            {parts.map((part, idx) => {
              const isLastPart = idx === parts.length - 1;
              if (part.type === "code") {
                return <CodeBlock key={idx} code={part.content} language={part.lang || "text"} filename={part.filename} />;
              }
              return (
                <div key={idx} className="glass-panel px-4 py-3 rounded-2xl rounded-tl-sm select-text">
                  <MarkdownContent content={part.content} />
                  {isStreaming && isLastPart && (
                    <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle animate-pulse rounded-sm" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {msg.createdAt && (
          <span className="text-[10px] text-muted-foreground/40 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 select-none">
            {new Date(msg.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {isUser && (
        <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs font-bold select-none">
          Я
        </div>
      )}
    </div>
  );
}
