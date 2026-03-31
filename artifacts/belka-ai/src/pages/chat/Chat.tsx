import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Send, Mic, MicOff, Plug, Paperclip, Loader2, Search, FileCode, CheckCircle, Eye, Brain, FolderOpen, Github, PanelLeft, PanelRight, PanelRightClose, Upload, X, Globe, ExternalLink, Code, ShieldCheck, Sparkles, TerminalSquare, Server, Download, ImageIcon, AudioLines, Waves } from "lucide-react";
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
import { DocsModal } from "@/components/modals/DocsModal";
import { PricingModal } from "@/components/modals/PricingModal";
import { GitHubModal } from "@/components/modals/GitHubModal";
import { useVoiceModal, useVoiceAssistant, playVoice, speakAssistantReply } from "@/hooks/use-voice";
import type { VoiceAction } from "@/lib/voice-phrases";
import { apiFetch, buildApiUrl, jsonHeaders } from "@/lib/api";
import { getVoiceAssistantConfig, loadVoiceAssistantConfig, subscribeVoiceAssistantConfig, type VoiceAssistantConfig } from "@/lib/voice-config";
import { t } from "@/lib/i18n";
import { openLocalFolder, listLocalFiles, readLocalFile, writeLocalFile, type LocalFile, getLanguageFromFilename, getFileIcon } from "@/lib/local-fs";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
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
  tooling: Plug,
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

const VISIBLE_STEP_LABELS: Record<string, string> = {
  thinking: "Понимание задачи",
  searching: "Проверка источников",
  generating: "Подготовка ответа",
  generating_image: "Создание изображения",
  coding: "Реализация решения",
  reviewing: "Проверка результата",
  writing: "Финальная сборка ответа",
};

const VISIBLE_TOOL_LABELS: Record<string, string> = {
  create_file: "Create file",
  edit_file: "Edit file",
  delete_file: "Delete file",
  run_command: "Run command",
};

const UI_STEP_LABELS: Record<string, string> = {
  thinking: "Понимание запроса",
  searching: "Проверка источников",
  generating: "Подготовка ответа",
  generating_image: "Создание изображения",
  coding: "Реализация решения",
  reviewing: "Проверка результата",
  writing: "Финальная сборка",
};

const UI_TOOL_LABELS: Record<string, string> = {
  create_file: "Создание файла",
  edit_file: "Редактирование",
  delete_file: "Удаление файла",
  run_command: "Запуск команды",
};

const MODE_SUBTITLE: Record<"chat" | "code" | "multi-agent" | "image", string> = {
  chat: "Диалоговый режим ассистента",
  code: "Среда для инженерного выполнения",
  "multi-agent": "Согласованная работа нескольких агентов",
  image: "Пространство для генерации изображений",
};

const COMPOSER_MODE_LABEL: Record<"chat" | "code" | "multi-agent" | "image", string> = {
  chat: "Диалог с ассистентом",
  code: "Рабочая поверхность разработки",
  "multi-agent": "Скоординированный запуск агентов",
  image: "Поток генерации изображений",
};

const EMPTY_STATE_BADGE_LABEL: Record<"chat" | "code" | "multi-agent" | "image", string> = {
  chat: "Диалог готов",
  code: "Кодовый контур готов",
  "multi-agent": "Мультиагентный контур готов",
  image: "Генерация готова",
};

const CHAT_STARTERS = [
  {
    mode: "code" as const,
    label: "Починить авторизацию",
    prompt: "Проверьте поток авторизации, исправьте рискованные места в работе сессий и перечислите, что ещё нужно усилить.",
  },
  {
    mode: "multi-agent" as const,
    label: "Сравнить стек",
    prompt: "Сравните лучшие стеки для AI workspace-продукта 2026 года и объясните компромиссы перед рекомендацией.",
  },
  {
    mode: "chat" as const,
    label: "Разбить следующий спринт",
    prompt: "Разбейте следующий этап продукта на понятные шаги, выделите блокеры и предложите, что нужно выпускать первым.",
  },
];

const MODE_AGENT_RAIL: Record<"chat" | "code" | "multi-agent" | "image", {
  role: AgentRole;
  title: string;
  detail: string;
  tone: "primary" | "secondary" | "accent";
}[]> = {
  chat: [
    { role: AgentRole.orchestrator, title: "Планировщик", detail: "Собирает маршрут ответа", tone: "secondary" },
    { role: AgentRole.researcher, title: "Исследователь", detail: "Проверяет актуальный контекст", tone: "accent" },
    { role: AgentRole.coder, title: "Ассистент", detail: "Собирает итоговый ответ", tone: "primary" },
  ],
  code: [
    { role: AgentRole.coder, title: "Кодер", detail: "Меняет файлы и валидирует", tone: "primary" },
    { role: AgentRole.reviewer, title: "Ревьюер", detail: "Ловит регрессии", tone: "secondary" },
    { role: AgentRole.designer, title: "Дизайнер", detail: "Держит интерфейс в балансе", tone: "accent" },
  ],
  "multi-agent": [
    { role: AgentRole.researcher, title: "Исследование", detail: "Собирает аргументы и данные", tone: "accent" },
    { role: AgentRole.coder, title: "Исполнитель", detail: "Собирает change set", tone: "primary" },
    { role: AgentRole.reviewer, title: "QA", detail: "Проверяет крайние случаи", tone: "secondary" },
  ],
  image: [
    { role: AgentRole.designer, title: "Арт-дирекция", detail: "Выравнивает визуальный язык", tone: "secondary" },
    { role: AgentRole.orchestrator, title: "Маршрутизация", detail: "Выбирает путь генерации", tone: "accent" },
    { role: AgentRole.coder, title: "Доставка", detail: "Готовит итоговые ассеты", tone: "primary" },
  ],
};

function AgentActivityRail({
  mode,
  active = false,
  className = "",
}: {
  mode: "chat" | "code" | "multi-agent" | "image";
  active?: boolean;
  className?: string;
}) {
  const toneClass: Record<"primary" | "secondary" | "accent", string> = {
    primary: "border-primary/20 bg-primary/10 text-primary",
    secondary: "border-secondary/20 bg-secondary/10 text-secondary",
    accent: "border-accent/20 bg-accent/10 text-accent-foreground",
  };

  return (
    <div className={`grid gap-2 sm:grid-cols-3 ${className}`.trim()}>
      {MODE_AGENT_RAIL[mode].map((item) => (
        <div
          key={`${mode}-${item.title}`}
          className="rounded-[22px] border border-border/70 bg-background/70 px-3 py-3"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AgentAvatar role={item.role} className="h-9 w-9" isPulsing={active} />
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">{item.title}</div>
                <div className="text-[11px] text-muted-foreground">{item.detail}</div>
              </div>
            </div>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${toneClass[item.tone]}`}>
              {active ? "Активно" : "Готово"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

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
      <span className={status === "running" ? "font-medium" : ""}>{UI_TOOL_LABELS[tool] || tool}</span>
      {args.path && <code className="rounded border border-border/60 bg-card/70 px-1.5 py-0.5 text-[10px] font-mono">{args.path}</code>}
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

function normalizeChatMode(mode: string | undefined): "chat" | "code" | "multi-agent" | "image" {
  switch ((mode || "").toLowerCase()) {
    case "chat":
      return "chat";
    case "image":
      return "image";
    case "multi-agent":
    case "multiagent":
      return "multi-agent";
    default:
      return "code";
  }
}

function splitGitHubRepoFullName(fullName: string): { owner: string; repo: string } | null {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) {
    return null;
  }

  return { owner, repo };
}

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
    <div ref={containerRef} className="relative flex items-center gap-0 rounded-2xl border border-border/70 bg-card/70 p-[4px]">
      <div
        className="absolute top-[3px] h-[calc(100%-6px)] rounded-lg transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
          background: "linear-gradient(135deg, rgba(46,160,67,0.86), rgba(138,194,52,0.78), rgba(192,132,252,0.7))",
          backdropFilter: "blur(12px)",
          boxShadow: "0 0 18px rgba(46,160,67,0.16), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.12)",
          border: "1px solid rgba(255,255,255,0.16)",
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
            className={`relative z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-colors duration-300 ${
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

function VoiceCommandDock({
  voiceAssistant,
  voiceConfig,
}: {
  voiceAssistant: {
    isActive: boolean;
    isDictating: boolean;
    isProcessing: boolean;
    lastTranscript: string;
    toggle: () => void;
  };
  voiceConfig: VoiceAssistantConfig;
}) {
  const statusTone = !voiceConfig.voiceEnabled
    ? "border-border/70 bg-card/70 text-muted-foreground"
    : voiceAssistant.isDictating
      ? "border-[#F97316]/30 bg-[#F97316]/10 text-[#F97316]"
      : voiceAssistant.isActive
        ? "border-primary/30 bg-primary/10 text-primary"
        : "border-secondary/25 bg-secondary/10 text-secondary";

  const statusLabel = !voiceConfig.voiceEnabled
    ? "Голос отключён"
    : voiceAssistant.isDictating
      ? "Идёт диктовка"
      : voiceAssistant.isProcessing
        ? "Обрабатываю команду"
        : voiceAssistant.isActive
          ? "Слушаю"
          : "Голосовой режим в ожидании";

  const caption = !voiceConfig.voiceEnabled
    ? "Enable the global voice profile in admin settings."
    : voiceAssistant.lastTranscript
      ? voiceAssistant.lastTranscript
      : "Command the workspace hands-free in Russian.";

  return (
    <div className="mx-auto flex w-full max-w-[360px] items-center gap-2 rounded-[24px] border border-border/70 bg-card/80 px-2.5 py-2 shadow-[0_12px_32px_rgba(0,0,0,0.12)] max-md:max-w-none">
      <button
        onClick={voiceAssistant.toggle}
        className={`relative inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border transition-all ${
          voiceAssistant.isDictating
            ? "border-[#F97316]/35 bg-[#F97316]/12 text-[#F97316]"
            : voiceAssistant.isActive
              ? "border-primary/30 bg-primary/12 text-primary"
              : "border-secondary/25 bg-secondary/10 text-secondary"
        }`}
        title={statusLabel}
      >
        {voiceAssistant.isActive ? <Mic size={18} /> : <MicOff size={18} />}
        {voiceConfig.voiceEnabled && (
          <span
            className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ${
              voiceAssistant.isDictating ? "bg-[#F97316]" : voiceAssistant.isActive ? "bg-[#2EA043]" : "bg-[#C084FC]"
            } ${voiceAssistant.isActive ? "animate-pulse" : ""}`}
          />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusTone}`}>
            <Waves size={11} />
            {statusLabel}
          </div>
          {voiceConfig.voiceEnabled && (
            <span className="text-[10px] font-medium text-muted-foreground">{voiceConfig.preset.replace(/_/g, " ")}</span>
          )}
        </div>
        <div className="truncate text-[11px] leading-5 text-muted-foreground">{caption}</div>
      </div>
    </div>
  );
}

function VoiceCommandDockV2({
  voiceAssistant,
  voiceConfig,
}: {
  voiceAssistant: {
    isActive: boolean;
    isDictating: boolean;
    isProcessing: boolean;
    lastTranscript: string;
    toggle: () => void;
  };
  voiceConfig: VoiceAssistantConfig;
}) {
  const statusTone = !voiceConfig.voiceEnabled
    ? "border-border/70 bg-card/70 text-muted-foreground"
    : voiceAssistant.isDictating
      ? "border-[#F97316]/30 bg-[#F97316]/10 text-[#F97316]"
      : voiceAssistant.isActive
        ? "border-primary/30 bg-primary/10 text-primary"
        : "border-secondary/25 bg-secondary/10 text-secondary";

  const statusLabel = !voiceConfig.voiceEnabled
    ? "Голос выключен"
    : voiceAssistant.isDictating
      ? "Идёт диктовка"
      : voiceAssistant.isProcessing
        ? "Обрабатываю команду"
        : voiceAssistant.isActive
          ? "Слушаю"
          : "Голосовой режим в ожидании";

  const caption = !voiceConfig.voiceEnabled
    ? "Включите общий голосовой профиль в настройках администратора."
    : voiceAssistant.lastTranscript
      ? voiceAssistant.lastTranscript
      : "Управляйте рабочим пространством голосом на русском.";

  return (
    <div className="mx-auto flex w-full max-w-[360px] items-center gap-2 rounded-[24px] border border-border/70 bg-card/80 px-2.5 py-2 shadow-[0_12px_32px_rgba(0,0,0,0.12)] max-md:max-w-none">
      <button
        onClick={voiceAssistant.toggle}
        className={`relative inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border transition-all ${
          voiceAssistant.isDictating
            ? "border-[#F97316]/35 bg-[#F97316]/12 text-[#F97316]"
            : voiceAssistant.isActive
              ? "border-primary/30 bg-primary/12 text-primary"
              : "border-secondary/25 bg-secondary/10 text-secondary"
        }`}
        title={statusLabel}
      >
        {voiceAssistant.isActive ? <Mic size={18} /> : <MicOff size={18} />}
        {voiceConfig.voiceEnabled && (
          <span
            className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ${
              voiceAssistant.isDictating ? "bg-[#F97316]" : voiceAssistant.isActive ? "bg-[#2c8f46]" : "bg-[#C084FC]"
            } ${voiceAssistant.isActive ? "animate-pulse" : ""}`}
          />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusTone}`}>
            <Waves size={11} />
            {statusLabel}
          </div>
          {voiceConfig.voiceEnabled && (
            <span className="text-[10px] font-medium text-muted-foreground">{voiceConfig.preset.replace(/_/g, " ")}</span>
          )}
        </div>
        <div className="truncate text-[11px] leading-5 text-muted-foreground">{caption}</div>
      </div>
    </div>
  );
}

function StreamingIndicator({ state, mode }: { state: StreamingState; mode: "chat" | "code" | "multi-agent" | "image" }) {
  return (
    <div className="flex justify-start gap-3">
      <div className="mt-1 flex-shrink-0">
        <AgentAvatar role={AgentRole.coder} isPulsing className="h-9 w-9" />
      </div>
      <div className="flex w-full max-w-[88%] flex-col items-start">
        <div className="mb-1 flex w-full items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              BELKA CODER
            </span>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              В работе
            </span>
          </div>
          {state.thinkingStartMs > 0 && (
            <span className="text-[10px] font-mono text-muted-foreground/60">
              {((Date.now() - state.thinkingStartMs) / 1000).toFixed(1)}s
            </span>
          )}
        </div>

        <AgentActivityRail mode={mode} active className="mb-2 w-full" />

        {state.steps.length > 0 && (
          <div className="glass-panel mb-2 w-full rounded-[24px] rounded-tl-[10px] border border-border/70 px-3 py-3">
            <div className="space-y-2">
              {state.steps.map((step, i) => {
                const Icon = STEP_ICONS[step.step] || Brain;
                const isActive = !step.done;
                const label = UI_STEP_LABELS[step.step] || step.text;
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
                    <div
                      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl border ${
                        isActive
                          ? "border-primary/20 bg-primary/10 text-primary"
                          : "border-border/70 bg-card/70 text-[#8AC234]"
                      }`}
                    >
                      {isActive ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
                    </div>
                    <span className={isActive ? "font-medium" : ""}>{label}</span>
                    {isActive ? (
                      <StepTimer startedAt={step.startedAt} isActive={true} />
                    ) : duration !== undefined ? (
                      <span className="ml-auto tabular-nums text-[10px] font-mono text-muted-foreground/40">{(duration / 1000).toFixed(1)}s</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {state.toolCalls.length > 0 && (
          <div className="glass-panel mb-2 w-full rounded-[24px] rounded-tl-[10px] border border-border/70 px-3 py-3">
            {state.toolCalls.map((tc, i) => (
              <ToolCallBlockInline key={i} tool={tc.tool} args={tc.args} status={tc.status} result={tc.result} error={tc.error} />
            ))}
          </div>
        )}

        {state.sources.length > 0 && (
          <div className="glass-panel mb-2 w-full rounded-[24px] rounded-tl-[10px] border border-border/70 px-3 py-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Globe size={12} className="text-accent" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">Источники</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {state.sources.map((src, i) => (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex max-w-[220px] items-center gap-1 rounded-xl border border-accent/20 bg-accent/10 px-2.5 py-1.5 text-[11px] text-foreground/85 transition-colors hover:border-primary/25 hover:bg-primary/10 hover:text-foreground truncate"
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
          <div className="glass-panel mb-2 w-full rounded-[24px] rounded-tl-[10px] border border-border/70 px-3 py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <ImageIcon size={12} className="text-secondary" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-secondary">Сгенерированное изображение</span>
            </div>
            <div className="relative group/img rounded-xl overflow-hidden">
              <img src={state.imageUrl} alt={state.imagePrompt || "Сгенерированное изображение"} className="w-full max-w-md rounded-xl" loading="eager" />
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
            <div className="flex justify-start gap-3">
              <div className="mt-1 flex-shrink-0">
                <AgentAvatar role={AgentRole.reviewer} isPulsing className="h-9 w-9" />
              </div>
              <div className="flex max-w-full w-full flex-col items-start">
                <span className="mb-1 ml-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {state.agentName}
                </span>
                {state.agentContent && <StreamingContent content={state.agentContent} />}
              </div>
            </div>
          </div>
        )}

        {state.error && (
          <div className="glass-panel rounded-[24px] rounded-tl-[10px] border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
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
    <div className="w-full space-y-1">
      {parts.map((part, idx) =>
        part.type === "code" ? (
          <CodeBlock key={idx} code={part.content} language={part.lang || "text"} filename={part.filename} />
        ) : (
          <div key={idx} className="glass-panel rounded-[24px] rounded-tl-[10px] border border-border/70 px-3 py-3">
            <div className="whitespace-pre-wrap text-sm leading-7 text-foreground">{part.content}</div>
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
  const [voiceConfig, setVoiceConfig] = useState<VoiceAssistantConfig>(() => getVoiceAssistantConfig());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mcpOpen, setMcpOpen] = useState(false);
  const [githubOpen, setGithubOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileAttachmentsEnabled = false;

  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [location, navigate] = useLocation();
  const handleSubmitRef = useRef<(text: string) => void>(() => {});
  const { theme, setTheme: setThemeValue } = useTheme();
  const { logout, user, isAdmin } = useAuth();

  const [filesPanelOpen, setFilesPanelOpen] = useState(false);
  const [fileSource, setFileSource] = useState<"local" | "github" | null>(null);
  const [localFiles, setLocalFiles] = useState<FileItem[]>([]);
  const [githubFiles, setGithubFiles] = useState<FileItem[]>([]);
  const [githubFilesLoading, setGithubFilesLoading] = useState(false);
  const [localDirHandle, setLocalDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [openedFileContent, setOpenedFileContent] = useState<string | null>(null);
  const [openedFileSha, setOpenedFileSha] = useState<string | null>(null);
  const [fileIsModified, setFileIsModified] = useState(false);
  const [pendingDiffs, setPendingDiffs] = useState<{ path: string; oldContent: string | null; newContent: string | null }[]>([]);
  const [changedPaths, setChangedPaths] = useState<Set<string>>(new Set());
  const [githubRepo, setGithubRepo] = useState<{ fullName: string; branch: string } | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [previewStatusOpen, setPreviewStatusOpen] = useState(false);
  const [workspacePickerOpen, setWorkspacePickerOpen] = useState(false);
  const [workspacePath, setWorkspacePath] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("belka-workspace-path");
  });

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

  const handleVoiceAction = useCallback((action: {
    type: string;
    path?: string;
    mode?: "chat" | "code" | "multi-agent" | "image";
    text?: string;
    theme?: "dark" | "light";
    name?: string;
    bio?: string;
    query?: string;
    message?: string;
    modal?: "profile" | "settings" | "pricing" | "mcp" | "github" | "docs";
  }) => {
    if (action.type === "webSearch") {
      const prompt = `Find live information on the web: ${action.query}`;
      setInput(prompt);
      setTimeout(() => handleSubmitRef.current(prompt), 100);
      return;
    }

    if (action.type === "createFile") {
      setInput("Create a new file in the current project.");
      return;
    }

    switch (action.type) {
      case 'navigate':
        if (action.path === '__sidebar_open') setSidebarCollapsed(false);
        else if (action.path === '__sidebar_close') setSidebarCollapsed(true);
        else if (action.path) navigate(action.path);
        break;
      case 'setMode':
        if (action.mode) setMode(action.mode);
        break;
      case 'newChat': navigate('/chat'); break;
      case 'writePrompt':
        setInput(prev => prev ? `${prev} ${action.text || ""}`.trim() : (action.text || ""));
        break;
      case 'sendChat':
        setInput(prev => {
          if (prev.trim()) setTimeout(() => handleSubmitRef.current(prev), 0);
          return '';
        });
        break;
      case 'logout':
        logout();
        navigate('/auth');
        break;
      case 'toggleSidebar': setSidebarCollapsed(prev => !prev); break;
      case 'clearInput': setInput(''); break;
      case 'toggleTheme': setThemeValue(theme === 'dark' ? 'light' : 'dark'); break;
      case 'setTheme':
        if (action.theme) setThemeValue(action.theme);
        break;
      case 'changeName':
        if (user?.id && action.name) {
          localStorage.setItem(`belka-display-name-${user.id}`, action.name);
          playVoice('settings_saved');
        }
        break;
      case 'changeBio':
        if (user?.id && action.bio) {
          localStorage.setItem(`belka-bio-${user.id}`, action.bio);
          playVoice('settings_saved');
        }
        break;
      case 'micOff': break;
      case 'sendToAgent':
        if (action.text) {
          setInput(action.text);
          setTimeout(() => handleSubmitRef.current(action.text!), 100);
        }
        break;
      case 'webSearch':
        setInput(`Найди информацию в интернете: ${action.query}`);
        setTimeout(() => handleSubmitRef.current(`Найди информацию в интернете: ${action.query}`), 100);
        break;
      case 'openLocalFolder': handleOpenLocalFolder(); break;
      case 'connectGitHub':
        if (isAdmin) setGithubOpen(true);
        break;
      case 'openFilesPanel': setFilesPanelOpen(true); break;
      case 'closeFilesPanel': setFilesPanelOpen(false); break;
      case 'pushToGitHub':
        if (!isAdmin) break;
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
        else if (action.modal === 'mcp' && isAdmin) setMcpOpen(true);
        else if (action.modal === 'github' && isAdmin) setGithubOpen(true);
        else if (action.modal === 'docs') setDocsOpen(true);
        break;
      case 'openTerminal':
        if (isAdmin) setTerminalOpen(true);
        break;
      case 'openPreview':
        if (isAdmin) setPreviewStatusOpen(true);
        break;
      case 'clarify': playVoice('start_work'); break;
      case 'runPreview': {
        if (isAdmin) setPreviewOpen(true);
        break;
      }
    }
  }, [navigate, theme, setThemeValue, githubRepo, selectedFilePath, openedFileContent, logout, isAdmin, user?.id]);

  const loadGitHubFiles = useCallback(async (
    repoConfig: { fullName: string; branch: string },
    nestedPath = "",
    depth = 0,
  ): Promise<FileItem[]> => {
    const repoParts = splitGitHubRepoFullName(repoConfig.fullName);
    if (!repoParts) {
      return [];
    }

    const apiBase = buildApiUrl();
    const suffix = nestedPath
      ? `?path=${encodeURIComponent(nestedPath)}&branch=${encodeURIComponent(repoConfig.branch)}`
      : `?branch=${encodeURIComponent(repoConfig.branch)}`;

    const response = await apiFetch(`${apiBase}/github/repos/${repoParts.owner}/${repoParts.repo}/contents${suffix}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Не удалось загрузить содержимое репозитория");
    }

    const files = Array.isArray(payload.files) ? payload.files : [];
    const items = await Promise.all(files.map(async (file: any) => {
      const item: FileItem = {
        name: file.name,
        path: file.path,
        type: file.type,
        size: file.size,
        sha: file.sha,
      };

      if (file.type === "directory" && depth < 2) {
        item.children = await loadGitHubFiles(repoConfig, file.path, depth + 1);
      }

      return item;
    }));

    return items;
  }, []);

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
    setGithubFiles([]);
    setGithubRepo(null);
    setChangedPaths(new Set());
    setFileSource("local");
    setSelectedFilePath(null);
    setOpenedFileContent(null);
    setOpenedFileSha(null);
    setFilesPanelOpen(true);
    playVoice('analyzing');
  }, []);

  const handleOpenFile = useCallback(async (file: FileItem) => {
    if (file.type !== 'file') return;
    setSelectedFilePath(file.path);
    setOpenedFileSha(file.sha || null);

    try {
      if (fileSource === "github" && githubRepo) {
        const repoParts = splitGitHubRepoFullName(githubRepo.fullName);
        if (!repoParts) return;

        const apiBase = buildApiUrl();
        const response = await apiFetch(
          `${apiBase}/github/repos/${repoParts.owner}/${repoParts.repo}/file?path=${encodeURIComponent(file.path)}&branch=${encodeURIComponent(githubRepo.branch)}`,
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Не удалось открыть файл из GitHub");
        }

        setOpenedFileContent(data.content || "");
        setOpenedFileSha(data.sha || file.sha || null);
      } else {
        if (!localDirHandle) return;
        const content = await readLocalFile(file.path, localDirHandle);
        setOpenedFileContent(content || "");
      }

      setFileIsModified(false);
    } catch {
      setOpenedFileContent("");
      setOpenedFileSha(null);
    }
  }, [fileSource, githubRepo, localDirHandle]);

  const handleSaveFile = useCallback(async (path: string, content: string) => {
    if (fileSource === "github" && githubRepo) {
      const repoParts = splitGitHubRepoFullName(githubRepo.fullName);
      if (!repoParts) return;

      const apiBase = buildApiUrl();
      const response = await apiFetch(`${apiBase}/github/repos/${repoParts.owner}/${repoParts.repo}/file`, {
        method: "PUT",
        headers: jsonHeaders(),
        body: JSON.stringify({
          path,
          content,
          sha: openedFileSha || undefined,
          branch: githubRepo.branch,
          message: `Update ${path} via BELKA AI`,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        playVoice("start_work");
        return;
      }

      setOpenedFileSha(data.sha || openedFileSha);
      setChangedPaths(prev => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
      setFileIsModified(false);
      playVoice("save");
      return;
    }

    if (!localDirHandle) return;
    await writeLocalFile(path, content, localDirHandle);
    setFileIsModified(false);
    playVoice('save');
  }, [fileSource, githubRepo, localDirHandle, openedFileSha]);

  const handlePushToGitHub = useCallback(async (message: string) => {
    if (!githubRepo || !localDirHandle) return;
    const repoParts = splitGitHubRepoFullName(githubRepo.fullName);
    if (!repoParts) return;

    const API = buildApiUrl();
    const filesToPush = Array.from(changedPaths);
    if (filesToPush.length === 0) { playVoice('start_work'); return; }
    const files: { path: string; content: string }[] = [];
    for (const fp of filesToPush) {
      const c = await readLocalFile(fp, localDirHandle);
      if (c !== null) files.push({ path: fp, content: c });
    }
    const res = await apiFetch(`${API}/github/repos/${repoParts.owner}/${repoParts.repo}/push`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ branch: githubRepo.branch, message, files }),
    });
    const data = await res.json();
    if (data.success) { setChangedPaths(new Set()); playVoice('save'); }
    else playVoice('start_work');
  }, [githubRepo, localDirHandle, changedPaths]);

  const voiceModal = useVoiceModal();
  const voiceAssistant = useVoiceAssistant(handleVoiceAction);
  const lastSpokenReplyRef = useRef("");
  const createConvMutation = useCreateConversation();

  useEffect(() => {
    const unsubscribe = subscribeVoiceAssistantConfig(setVoiceConfig);
    void loadVoiceAssistantConfig();
    return unsubscribe;
  }, []);

  const { data: conversation } = useGetConversation(conversationId || "");
  const { data: messagesData, refetch: refetchMessages } = useGetMessages(conversationId || "");

  useEffect(() => {
    if (conversation?.mode) {
      setMode(normalizeChatMode(conversation.mode));
    }
  }, [conversation?.id, conversation?.mode]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messagesData?.messages, streaming.content, streaming.steps]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const applyViewportState = () => {
      const isMobile = mq.matches;
      setIsMobileViewport(isMobile);
      if (isMobile) {
        setSidebarCollapsed(true);
      } else {
        setMobileSidebarOpen(false);
      }
    };

    applyViewportState();
    mq.addEventListener("change", applyViewportState);

    return () => {
      mq.removeEventListener("change", applyViewportState);
    };
  }, []);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location, conversationId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (workspacePath) {
      window.localStorage.setItem("belka-workspace-path", workspacePath);
    } else {
      window.localStorage.removeItem("belka-workspace-path");
    }
  }, [workspacePath]);

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
      lastSpokenReplyRef.current = "";

      const API = buildApiUrl();

      const response = await apiFetch(`${API}/conversations/${activeId}/messages`, {
        method: "POST",
        headers: jsonHeaders(),
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
          const voiceConfig = getVoiceAssistantConfig();
          if (voiceConfig.autoSpeakSteps) {
            if (data.step === "searching") playVoice("researching");
            else if (data.step === "thinking") playVoice("analyzing");
            else if (data.step === "generating" || data.step === "coding") playVoice("writing");
            else if (data.step === "reviewing") playVoice("checking");
          }
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

  useEffect(() => {
    if (streaming.isStreaming || streaming.error || !streaming.content.trim()) return;
    if (!voiceAssistant.isActive || mode !== "chat") return;

    const config = getVoiceAssistantConfig();
    if (!config.voiceEnabled || !config.autoSpeakReplies) return;

    const speakable = streaming.content
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!speakable || speakable.length > config.replyMaxChars) return;
    if (lastSpokenReplyRef.current === speakable) return;

    lastSpokenReplyRef.current = speakable;
    void speakAssistantReply(speakable);
  }, [mode, streaming.content, streaming.error, streaming.isStreaming, voiceAssistant.isActive]);

  const messages = messagesData?.messages || [];

  useEffect(() => {
    if (previewOpen && messages.length) {
      const html = buildPreviewFromMessages(messages);
      if (html) setPreviewHtml(html);
    }
  }, [previewOpen, messages]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {isMobileViewport ? (
        mobileSidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/55 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Close navigation"
            />
            <div className="absolute inset-y-0 left-0 w-[288px] max-w-[84vw] shadow-2xl">
              <ChatSidebar
                collapsed={false}
                onToggle={() => setMobileSidebarOpen(false)}
                activeConvId={conversationId}
                isPending={streaming.isStreaming}
              />
            </div>
          </div>
        )
      ) : (
        <ChatSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          activeConvId={conversationId}
          isPending={streaming.isStreaming}
        />
      )}

      <main className="flex-1 flex flex-col relative min-w-0">
        <header className="grid min-h-[72px] items-center gap-3 border-b border-border/50 bg-background/80 px-4 py-3 backdrop-blur-md z-10 flex-shrink-0 md:grid-cols-[minmax(0,1fr)_minmax(260px,360px)_minmax(0,1fr)]">
          <div className="min-w-0 max-md:order-1">
            <div className="flex min-w-0 items-center gap-2">
              {isMobileViewport && (
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(true)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-card/70 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/25 md:hidden"
                  aria-label="Open navigation"
                >
                  <PanelLeft size={15} />
                </button>
              )}
              <span className="truncate text-sm font-medium text-foreground">
                {conversation?.title || t("newWorkspace")}
              </span>
              <span className="flex-shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-mono text-primary">
                {mode === "multi-agent" ? t("multiAgent") : mode === "image" ? t("image") : mode === "chat" ? t("chat") : t("code")}
              </span>
            </div>
            <div className="hidden mt-1 text-[11px] text-muted-foreground">
              {mode === "multi-agent" ? "Согласованная работа нескольких агентов" : mode === "image" ? "Рабочее пространство для генерации изображений" : mode === "chat" ? "Диалоговый режим ассистента" : "Среда для инженерного выполнения"}
            </div>
          </div>

          <div className="mt-1 text-[11px] text-muted-foreground max-md:order-2 max-md:col-span-full">
            {MODE_SUBTITLE[mode]}
          </div>

          <div className="max-md:order-3 max-md:col-span-full">
            <VoiceCommandDockV2 voiceAssistant={voiceAssistant} voiceConfig={voiceConfig} />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-1.5 max-md:order-2 max-md:justify-start">
            {isAdmin && (
              <>
            <button onClick={() => setMcpOpen(true)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors" title="MCP серверы">
              <Plug size={14} />
            </button>
            <button onClick={() => setTerminalOpen(prev => !prev)} className={`p-1.5 rounded-lg transition-colors ${terminalOpen ? "bg-emerald-500/20 text-emerald-400" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`} title="Терминал">
              <TerminalSquare size={14} />
            </button>
            <button onClick={() => setPreviewStatusOpen(prev => !prev)} className={`p-1.5 rounded-lg transition-colors ${previewStatusOpen ? "bg-accent/20 text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`} title="Сервер превью">
              <Server size={14} />
            </button>
            <button onClick={() => setWorkspacePickerOpen(true)} className={`p-1.5 rounded-lg transition-colors ${workspacePath ? "bg-secondary/20 text-secondary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`} title="Папка проекта">
              <FolderOpen size={14} />
            </button>
            <div className="h-4 w-px bg-border/50 mx-0.5" />
            <button onClick={() => setGithubOpen(true)} title="GitHub"
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors border ${githubRepo ? 'text-green-400 border-green-400/30 bg-green-400/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent hover:border-border/50'}`}>
              <Github size={14} />
              <span className="hidden sm:inline">{githubRepo ? githubRepo.fullName.split('/')[1] : 'GitHub'}</span>
            </button>
              </>
            )}
            {filesPanelOpen ? (
              <button onClick={() => setFilesPanelOpen(false)} title="Close files panel"
                className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg text-primary bg-primary/10 border border-primary/20 transition-colors">
                <PanelRightClose size={14} />
              </button>
            ) : ((fileSource === "github" ? githubFiles.length : localFiles.length) > 0) && (
              <button onClick={() => setFilesPanelOpen(true)} title="Open files panel"
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
          <div className="flex-1 overflow-y-auto pb-40 px-4 md:px-6 xl:px-12 w-full">
            {messages.length === 0 && !streaming.isStreaming ? (
              <div className="mx-auto flex h-full w-full max-w-[980px] items-center justify-center py-8">
                <div className="section-shell w-full p-6 sm:p-8">
                  <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                    <div>
                      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        BELKA workspace
                      </div>
                      <ShinyText as="h2" className="mb-3 text-2xl font-display font-bold sm:text-3xl">
                        Работайте спокойно, без шумного агентного интерфейса
                      </ShinyText>
                      <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                        Используйте чат для быстрых ответов, code mode для исполнения, а multi-agent mode для задач, где исследование, проверка и доставка идут параллельно.
                      </p>
                      <AgentActivityRail mode={mode} className="mt-5" />
                      <div className="mt-5 flex flex-wrap gap-2">
                        {CHAT_STARTERS.map((starter) => (
                          <button
                            key={starter.label}
                            type="button"
                            onClick={() => {
                              setMode(starter.mode);
                              setInput(starter.prompt);
                            }}
                            className="rounded-2xl border border-border/70 bg-card/70 px-4 py-3 text-left transition-colors hover:border-primary/25 hover:bg-primary/10"
                          >
                            <div className="text-sm font-semibold text-foreground">{starter.label}</div>
                            <div className="mt-1 max-w-xs text-xs leading-6 text-muted-foreground">{starter.prompt}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="brand-shell rounded-[30px] p-[1px]">
                      <div className="rounded-[29px] border border-border/70 bg-card/80 p-5">
                        <div className="mb-4 flex items-center justify-between">
                          <div>
                            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Линейка агентов</div>
                            <div className="mt-1 text-base font-semibold text-foreground">Видимая работа и читаемый прогресс</div>
                          </div>
                          <span className="rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-[11px] font-medium text-secondary">
                            {EMPTY_STATE_BADGE_LABEL[mode]}
                          </span>
                        </div>

                        <div className="space-y-3">
                          {[
                            { role: AgentRole.coder, title: "Кодер", note: "Вносит изменения и валидирует результат." },
                            { role: AgentRole.reviewer, title: "Ревьюер", note: "Проверяет регрессии, крайние случаи и качество выдачи." },
                            { role: AgentRole.designer, title: "Дизайнер", note: "Держит интерфейс ровным, аккуратным и премиальным." },
                          ].map((item) => (
                            <div key={item.title} className="flex items-center gap-3 rounded-[22px] border border-border/70 bg-background/70 p-3">
                              <AgentAvatar role={item.role} className="h-10 w-10" isPulsing />
                              <div>
                                <div className="text-sm font-semibold text-foreground">{item.title}</div>
                                <div className="text-xs leading-5 text-muted-foreground">{item.note}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-[920px] space-y-5 pt-5">
                {messages.map((msg: any, i: number) => (
                  <MessageBubble key={msg.id || i} msg={msg} isLast={i === messages.length - 1} isStreaming={streaming.isStreaming && i === messages.length - 1 && msg.role !== "user"} onImagePreview={setImagePreviewUrl} />
                ))}

                {streaming.isStreaming && <StreamingIndicator state={streaming} mode={mode} />}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {filesPanelOpen && (
            <div className={`${isMobileViewport ? "absolute inset-0 z-30 w-full" : "w-80 border-l"} border-border/50 flex flex-col bg-background/95 backdrop-blur-md flex-shrink-0`}>
              <div className="h-10 border-b border-border/50 flex items-center justify-between px-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">
                    {fileSource === 'github' ? githubRepo?.fullName : 'Local workspace'}
                  </span>
                  {changedPaths.size > 0 && (
                    <span className="text-[10px] bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 px-1.5 py-0.5 rounded-full">
                      {changedPaths.size} changed
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {fileSource === "local" && githubRepo && changedPaths.size > 0 && (
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
                      className="text-muted-foreground hover:text-foreground text-xs">← Back</button>
                    <span className="text-[10px] text-muted-foreground truncate flex-1">{selectedFilePath}</span>
                    {fileIsModified && (
                      <button onClick={() => handleSaveFile(selectedFilePath, openedFileContent)}
                        className="text-[10px] px-2 py-0.5 bg-primary/20 text-primary rounded border border-primary/30">Save</button>
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
                  files={fileSource === "github" ? githubFiles : localFiles}
                  onSelectFile={(path) => {
                    const findFile = (items: FileItem[], p: string): FileItem | null => {
                      for (const f of items) {
                        if (f.path === p) return f;
                        if (f.children) { const r = findFile(f.children, p); if (r) return r; }
                      }
                      return null;
                    };
                    const sourceFiles = fileSource === "github" ? githubFiles : localFiles;
                    const f = findFile(sourceFiles, path);
                    if (f) handleOpenFile(f);
                  }}
                  changedPaths={changedPaths}
                  source={fileSource}
                  githubRepo={githubRepo?.fullName}
                  githubBranch={githubRepo?.branch}
                  isLoading={githubFilesLoading}
                  onRefresh={() => {
                    if (fileSource === "github" && githubRepo) {
                      setGithubFilesLoading(true);
                      void loadGitHubFiles(githubRepo)
                        .then(setGithubFiles)
                        .finally(() => setGithubFilesLoading(false));
                    } else if (localDirHandle) {
                      void listLocalFiles(localDirHandle).then((files) => {
                        const toFileItem = (f: LocalFile, depth = 0): FileItem => ({
                          name: f.name, path: f.path, type: f.type, size: f.size,
                          language: f.type === 'file' ? getLanguageFromFilename(f.name) : undefined,
                          icon: f.type === 'file' ? getFileIcon(f.name) : undefined,
                          children: f.children ? f.children.map(c => toFileItem(c, depth + 1)) : undefined,
                        });
                        setLocalFiles(files.map(f => toFileItem(f)));
                      });
                    }
                  }}
                  onOpenLocalFolder={handleOpenLocalFolder}
                  onConnectGitHub={() => {
                    if (isAdmin) setGithubOpen(true);
                  }}
                />
              )}
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent px-4 pb-4 pt-10 md:px-6 xl:px-12">
          <div className="mx-auto max-w-[920px]">
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
            <div className="composer-shell rounded-[30px] border border-border/70 p-2 shadow-[0_26px_50px_rgba(0,0,0,0.16)] transition-all duration-300 focus-within:border-primary/35">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-2 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="hidden rounded-full border border-border/70 bg-card/70 px-3 py-1 text-[11px] font-medium text-foreground/85">
                    {mode === "multi-agent" ? "Скоординированный запуск агентов" : mode === "image" ? "Поток генерации изображений" : mode === "chat" ? "Диалог с ассистентом" : "Рабочая поверхность разработки"}
                  </span>
                  <span className="rounded-full border border-border/70 bg-card/70 px-3 py-1 text-[11px] font-medium text-foreground/85">
                    {COMPOSER_MODE_LABEL[mode]}
                  </span>
                  {streaming.isStreaming ? (
                    <span className="hidden rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                      BELKA работает
                    </span>
                  ) : voiceAssistant.isActive ? (
                    <span className="hidden rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-[11px] font-medium text-secondary">
                      Голосовой режим активен
                    </span>
                  ) : (
                    <span className="hidden rounded-full border border-border/70 bg-card/70 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                      Загрузка файлов появится после подключения рабочего upload-маршрута
                    </span>
                  )}
                </div>
                <span className={`rounded-full border px-3 py-1 text-[11px] font-medium ${
                  streaming.isStreaming
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : voiceAssistant.isActive
                      ? "border-secondary/20 bg-secondary/10 text-secondary"
                      : "border-border/70 bg-card/70 text-muted-foreground"
                }`}>
                  {streaming.isStreaming
                    ? "BELKA в работе"
                    : voiceAssistant.isActive
                      ? "Голосовой режим активен"
                      : "Загрузка файлов появится после подключения рабочего upload-маршрута"}
                </span>
                <div className="hidden text-[11px] text-muted-foreground">
                  Shift+Enter для новой строки
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground">Shift+Enter для новой строки</div>
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
                className="w-full resize-none border-none bg-transparent px-3 py-2 text-sm leading-7 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 min-h-[68px] max-h-[180px]"
                style={{ outline: "none", boxShadow: "none", WebkitAppearance: "none" }}
                rows={2}
                disabled={streaming.isStreaming}
              />

              <div className="flex flex-wrap items-center justify-between gap-3 px-1.5 pb-1 pt-1">
                <div className="flex items-center gap-1">
                  <input ref={fileInputRef} type="file" className="hidden" disabled={!fileAttachmentsEnabled} onChange={(e) => {
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
                  <button
                    onClick={() => {
                      if (fileAttachmentsEnabled) fileInputRef.current?.click();
                    }}
                    disabled={!fileAttachmentsEnabled}
                    className={`p-1.5 rounded-lg transition-colors ${fileAttachmentsEnabled ? "text-muted-foreground hover:text-foreground hover:bg-muted" : "text-muted-foreground/40 cursor-not-allowed"}`}
                    title={fileAttachmentsEnabled ? "Прикрепить файл" : "Загрузка файлов пока недоступна"}
                  >
                    <Paperclip size={16} />
                  </button>
                  <ModeSwitcher mode={mode} setMode={setMode} />
                </div>

                <div className="flex items-center gap-2">
                  {voiceAssistant.isDictating && (
                    <div className="flex items-center gap-1 rounded-full border border-[#F97316]/25 bg-[#F97316]/10 px-3 py-1 text-[11px] font-medium text-[#F97316]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#F97316] animate-pulse" />
                      Идёт диктовка
                    </div>
                  )}
                  <button
                    onClick={() => handleSubmit(input)}
                    disabled={!input.trim() || streaming.isStreaming}
                    className="inline-flex items-center gap-2 rounded-2xl belka-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send size={16} className={streaming.isStreaming ? "animate-pulse" : ""} />
                    Отправить
                  </button>
                </div>

              </div>
            </div>
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
      <DocsModal open={docsOpen} onClose={() => setDocsOpen(false)} />

      {imagePreviewUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setImagePreviewUrl(null)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setImagePreviewUrl(null)} className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-black/80 text-white flex items-center justify-center shadow-lg hover:bg-black z-10 border border-white/20">
              <X size={16} />
            </button>
            <img src={imagePreviewUrl} alt="Предпросмотр" className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain" />
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
          setLocalDirHandle(null);
          setLocalFiles([]);
          setChangedPaths(new Set());
          setGithubFilesLoading(true);
          void loadGitHubFiles(repo)
            .then(setGithubFiles)
            .finally(() => setGithubFilesLoading(false));
          setSelectedFilePath(null);
          setOpenedFileContent(null);
          setOpenedFileSha(null);
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

      <TerminalPanel isOpen={terminalOpen} onClose={() => setTerminalOpen(false)} />

      {previewOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold text-foreground">Превью</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPreviewStatusOpen(prev => !prev)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Статус сервера">
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
          <div className="glass-panel mb-1 w-full rounded-[24px] rounded-tl-[10px] border border-border/70 px-3 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Globe size={12} className="text-accent" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">Источники</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sources.map((src: any, i: number) => (
                <a key={i} href={src.url} target="_blank" rel="noopener noreferrer"
                  className="flex max-w-[220px] items-center gap-1 rounded-xl border border-accent/20 bg-accent/10 px-2.5 py-1.5 text-[11px] text-foreground/85 transition-colors hover:border-primary/25 hover:bg-primary/10 hover:text-foreground truncate"
                  title={src.title}>
                  <ExternalLink size={10} className="flex-shrink-0" />
                  <span className="truncate">{src.title || new URL(src.url).hostname}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {imageUrl && !isUser && (
          <div className="glass-panel mb-1 w-full rounded-[24px] rounded-tl-[10px] border border-border/70 px-3 py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <ImageIcon size={12} className="text-secondary" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-secondary">Изображение</span>
            </div>
            <div className="relative group/img rounded-xl overflow-hidden">
              <img
                src={imageUrl}
                alt="Сгенерированное изображение"
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
