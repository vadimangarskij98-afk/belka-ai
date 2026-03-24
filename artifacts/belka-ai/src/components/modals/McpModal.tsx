import { useState, useCallback } from "react";
import { X, Plus, Plug, Trash2, CheckCircle, Circle, Database, Globe, FileCode, Server, Search, Key, Loader2, AlertCircle, FolderOpen, Code2, Cloud, Bug } from "lucide-react";
import { t, getLang } from "@/lib/i18n";

interface McpServer {
  id: string;
  name: string;
  url: string;
  command?: string;
  connected: boolean;
  status: "disconnected" | "connecting" | "connected" | "error";
  icon: string;
  requiresApiKey?: boolean;
  apiKey?: string;
  description?: string;
  descriptionRu?: string;
}

const MCP_CATALOG: Omit<McpServer, "id" | "connected" | "status">[] = [
  {
    name: "GitHub",
    url: "https://api.github.com",
    command: "npx -y @modelcontextprotocol/server-github",
    icon: "globe",
    requiresApiKey: true,
    description: "Access GitHub repos, issues, PRs",
    descriptionRu: "Доступ к репозиториям, issues, PR на GitHub",
  },
  {
    name: "PostgreSQL",
    url: "stdio://mcp-postgres",
    command: "npx -y @modelcontextprotocol/server-postgres",
    icon: "database",
    requiresApiKey: false,
    description: "Query and manage PostgreSQL databases",
    descriptionRu: "Запросы и управление базами PostgreSQL",
  },
  {
    name: "Filesystem",
    url: "stdio://mcp-filesystem",
    command: "npx -y @modelcontextprotocol/server-filesystem",
    icon: "folder",
    requiresApiKey: false,
    description: "Read and write local files",
    descriptionRu: "Чтение и запись локальных файлов",
  },
  {
    name: "Brave Search",
    url: "https://api.search.brave.com",
    command: "npx -y @modelcontextprotocol/server-brave-search",
    icon: "search",
    requiresApiKey: true,
    description: "Web search via Brave Search API",
    descriptionRu: "Поиск в интернете через Brave Search",
  },
  {
    name: "Puppeteer",
    url: "stdio://mcp-puppeteer",
    command: "npx -y @modelcontextprotocol/server-puppeteer",
    icon: "code",
    requiresApiKey: false,
    description: "Browser automation and web scraping",
    descriptionRu: "Автоматизация браузера и веб-скрапинг",
  },
  {
    name: "Slack",
    url: "https://slack.com/api",
    command: "npx -y @modelcontextprotocol/server-slack",
    icon: "cloud",
    requiresApiKey: true,
    description: "Send and read Slack messages",
    descriptionRu: "Отправка и чтение сообщений в Slack",
  },
  {
    name: "Sentry",
    url: "https://sentry.io/api",
    command: "npx -y @modelcontextprotocol/server-sentry",
    icon: "bug",
    requiresApiKey: true,
    description: "Access error tracking from Sentry",
    descriptionRu: "Отслеживание ошибок через Sentry",
  },
];

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  server: Server,
  database: Database,
  globe: Globe,
  code: FileCode,
  folder: FolderOpen,
  search: Search,
  cloud: Cloud,
  bug: Bug,
};

export function McpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [servers, setServers] = useState<McpServer[]>(() => {
    const saved = localStorage.getItem("belka-mcp-servers");
    return saved ? JSON.parse(saved) : [];
  });
  const [showCatalog, setShowCatalog] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [newNeedsKey, setNewNeedsKey] = useState(false);
  const [search, setSearch] = useState("");

  const isRu = getLang() === "ru";

  const save = (s: McpServer[]) => {
    setServers(s);
    localStorage.setItem("belka-mcp-servers", JSON.stringify(s));
  };

  const toggleConnect = useCallback(async (id: string) => {
    setServers(prev => {
      const server = prev.find(s => s.id === id);
      if (!server) return prev;

      if (server.connected) {
        const updated = prev.map(s => s.id === id ? { ...s, connected: false, status: "disconnected" as const } : s);
        localStorage.setItem("belka-mcp-servers", JSON.stringify(updated));
        return updated;
      }

      if (server.requiresApiKey && !server.apiKey) {
        return prev;
      }

      const connecting = prev.map(s => s.id === id ? { ...s, status: "connecting" as const } : s);
      localStorage.setItem("belka-mcp-servers", JSON.stringify(connecting));

      setTimeout(() => {
        setServers(p => {
          const updated = p.map(s =>
            s.id === id ? { ...s, connected: true, status: "connected" as const } : s
          );
          localStorage.setItem("belka-mcp-servers", JSON.stringify(updated));
          return updated;
        });
      }, 1200 + Math.random() * 800);

      return connecting;
    });
  }, []);

  if (!open) return null;

  const removeServer = (id: string) => {
    save(servers.filter(s => s.id !== id));
  };

  const updateApiKey = (id: string, key: string) => {
    save(servers.map(s => s.id === id ? { ...s, apiKey: key } : s));
  };

  const addFromCatalog = (catalog: typeof MCP_CATALOG[0]) => {
    const existing = servers.find(s => s.name === catalog.name);
    if (existing) return;
    const s: McpServer = {
      id: Date.now().toString(),
      name: catalog.name,
      url: catalog.url,
      command: catalog.command,
      connected: false,
      status: "disconnected",
      icon: catalog.icon,
      requiresApiKey: catalog.requiresApiKey,
      apiKey: "",
      description: catalog.description,
      descriptionRu: catalog.descriptionRu,
    };
    save([...servers, s]);
    setShowCatalog(false);
  };

  const addCustomServer = () => {
    if (!newName.trim() || !newUrl.trim()) return;
    const s: McpServer = {
      id: Date.now().toString(),
      name: newName,
      url: newUrl,
      connected: false,
      status: "disconnected",
      icon: "server",
      requiresApiKey: newNeedsKey,
      apiKey: newApiKey,
    };
    save([...servers, s]);
    setNewName("");
    setNewUrl("");
    setNewApiKey("");
    setNewNeedsKey(false);
    setAdding(false);
  };

  const filteredCatalog = MCP_CATALOG.filter(c => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q);
  });

  const Icon = (name: string) => iconMap[name] || Server;

  if (showCatalog) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <button onClick={() => setShowCatalog(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <X size={16} />
            </button>
            <h2 className="text-base font-semibold text-foreground">{isRu ? "Каталог MCP серверов" : "MCP Server Catalog"}</h2>
            <div className="w-6" />
          </div>

          <div className="px-4 pt-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={isRu ? "Поиск серверов..." : "Search servers..."}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="p-4 space-y-2 overflow-y-auto flex-1">
            {filteredCatalog.map((cat) => {
              const CatIcon = Icon(cat.icon);
              const alreadyAdded = servers.some(s => s.name === cat.name);
              return (
                <div key={cat.name} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <CatIcon size={18} className="text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{cat.name}</span>
                      {cat.requiresApiKey && <Key size={10} className="text-yellow-500" />}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">{isRu ? cat.descriptionRu : cat.description}</div>
                  </div>
                  <button
                    onClick={() => addFromCatalog(cat)}
                    disabled={alreadyAdded}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors flex-shrink-0 ${alreadyAdded ? "bg-muted text-muted-foreground cursor-default" : "bg-primary text-white hover:bg-primary/90"}`}
                  >
                    {alreadyAdded ? (isRu ? "Добавлен" : "Added") : (isRu ? "Добавить" : "Add")}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Plug size={18} className="text-primary" />
            <h2 className="text-lg font-semibold text-foreground">{t("mcpServers")}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <p className="text-xs text-muted-foreground mb-4">{t("mcpDesc")}</p>

          {servers.length === 0 && (
            <div className="text-center py-8">
              <Server size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground mb-1">{isRu ? "Нет подключённых серверов" : "No servers connected"}</p>
              <p className="text-xs text-muted-foreground">{isRu ? "Добавьте сервер из каталога или вручную" : "Add a server from the catalog or manually"}</p>
            </div>
          )}

          <div className="space-y-2">
            {servers.map((srv) => {
              const SrvIcon = Icon(srv.icon);
              return (
                <div key={srv.id} className="rounded-xl border border-border hover:border-primary/30 transition-colors overflow-hidden">
                  <div className="flex items-center gap-3 p-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <SrvIcon size={16} className="text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{srv.name}</span>
                        {srv.requiresApiKey && <Key size={10} className={srv.apiKey ? "text-green-500" : "text-yellow-500"} />}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate font-mono">{srv.command || srv.url}</div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggleConnect(srv.id)}
                        disabled={srv.status === "connecting" || (srv.requiresApiKey && !srv.apiKey)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                          srv.status === "connected"
                            ? "bg-green-500/10 text-green-500 border border-green-500/20"
                            : srv.status === "connecting"
                            ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                            : srv.status === "error"
                            ? "bg-red-500/10 text-red-500 border border-red-500/20"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {srv.status === "connected" ? (
                          <span className="flex items-center gap-1"><CheckCircle size={11} />{t("connected")}</span>
                        ) : srv.status === "connecting" ? (
                          <span className="flex items-center gap-1"><Loader2 size={11} className="animate-spin" />{isRu ? "..." : "..."}</span>
                        ) : srv.status === "error" ? (
                          <span className="flex items-center gap-1"><AlertCircle size={11} />{isRu ? "Ошибка" : "Error"}</span>
                        ) : (
                          <span className="flex items-center gap-1"><Circle size={11} />{t("connect")}</span>
                        )}
                      </button>
                      <button onClick={() => removeServer(srv.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {srv.requiresApiKey && (
                    <div className="px-3 pb-3 pt-0">
                      <div className="flex items-center gap-2">
                        <Key size={12} className="text-muted-foreground flex-shrink-0" />
                        <input
                          type="password"
                          value={srv.apiKey || ""}
                          onChange={e => updateApiKey(srv.id, e.target.value)}
                          placeholder={isRu ? "Введите API ключ..." : "Enter API key..."}
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-border bg-background text-[11px] text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {adding && (
            <div className="mt-3 p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-2">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder={t("serverName")} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary outline-none" />
              <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder={isRu ? "URL или команда (npx -y ...)" : "URL or command (npx -y ...)"} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary outline-none font-mono" />
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={newNeedsKey} onChange={e => setNewNeedsKey(e.target.checked)} className="rounded" />
                {isRu ? "Требуется API ключ" : "Requires API key"}
              </label>
              {newNeedsKey && (
                <input type="password" value={newApiKey} onChange={e => setNewApiKey(e.target.value)} placeholder="API Key" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary outline-none font-mono" />
              )}
              <div className="flex gap-2 justify-end">
                <button onClick={() => setAdding(false)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">{t("cancel")}</button>
                <button onClick={addCustomServer} className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90">{t("addServer")}</button>
              </div>
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowCatalog(true)}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-primary/30 bg-primary/5 text-sm text-primary hover:bg-primary/10 transition-colors font-medium"
            >
              <Search size={14} />
              {isRu ? "Каталог" : "Catalog"}
            </button>
            <button
              onClick={() => setAdding(true)}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
            >
              <Plus size={14} />
              {isRu ? "Свой сервер" : "Custom"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
