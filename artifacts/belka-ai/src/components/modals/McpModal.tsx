import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Brain,
  CheckCircle,
  Cloud,
  Code2,
  Database,
  FolderOpen,
  Globe,
  Key,
  Loader2,
  Plus,
  Plug,
  Search,
  Server,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";

interface McpCatalogEntry {
  key: string;
  name: string;
  description: string;
  icon: string;
  command: string;
  args: string[];
  requiresApiKey?: boolean;
  apiKeyEnvName?: string;
  requiresWorkspacePath?: boolean;
}

interface McpToolSummary {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

interface McpServerSnapshot {
  id: string;
  name: string;
  command: string;
  args: string[];
  cwd?: string;
  icon?: string;
  description?: string;
  catalogKey?: string;
  connected: boolean;
  status: "disconnected" | "connecting" | "connected" | "error";
  requiresApiKey?: boolean;
  apiKeyEnvName?: string;
  tools: McpToolSummary[];
  lastError?: string;
  connectedAt?: string;
  stderrPreview?: string[];
}

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  server: Server,
  database: Database,
  globe: Globe,
  code: Code2,
  folder: FolderOpen,
  search: Search,
  cloud: Cloud,
  brain: Brain,
};

function getAuthHeaders() {
  const token = window.localStorage.getItem("belka-token") || "";
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function getWorkspacePath(): string {
  return window.localStorage.getItem("belka-workspace-path") || "";
}

function parseArgs(value: string): string[] {
  return value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

async function readJsonSafe(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

export function McpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const auth = useAuth();
  const [catalog, setCatalog] = useState<McpCatalogEntry[]>([]);
  const [servers, setServers] = useState<McpServerSnapshot[]>([]);
  const [allowCustom, setAllowCustom] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [search, setSearch] = useState("");
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [newCommand, setNewCommand] = useState("");
  const [newArgs, setNewArgs] = useState("");
  const [newCwd, setNewCwd] = useState("");
  const [newApiKeyEnvName, setNewApiKeyEnvName] = useState("");
  const [newApiKey, setNewApiKey] = useState("");

  const apiBase = useMemo(() => `${(import.meta.env.BASE_URL || "/")}api`.replace(/\/\/+/g, "/"), []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [catalogRes, serversRes] = await Promise.all([
        fetch(`${apiBase}/mcp/catalog`, { headers: getAuthHeaders() }),
        fetch(`${apiBase}/mcp/servers`, { headers: getAuthHeaders() }),
      ]);

      const [catalogData, serversData] = await Promise.all([
        readJsonSafe(catalogRes),
        readJsonSafe(serversRes),
      ]);

      if (!catalogRes.ok) throw new Error(catalogData.error || "Не удалось загрузить каталог MCP");
      if (!serversRes.ok) throw new Error(serversData.error || "Не удалось загрузить статусы MCP");

      setCatalog(catalogData.servers || []);
      setAllowCustom(Boolean(catalogData.allowCustom) || auth.isAdmin);
      setServers(serversData.servers || []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Не удалось загрузить MCP");
    } finally {
      setLoading(false);
    }
  }, [apiBase, auth.isAdmin]);

  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open, refresh]);

  const upsertServer = useCallback((server: McpServerSnapshot) => {
    setServers((prev) => {
      const idx = prev.findIndex((item) => item.id === server.id);
      if (idx === -1) return [server, ...prev];
      const next = [...prev];
      next[idx] = server;
      return next;
    });
  }, []);

  const connectServer = useCallback(async (payload: {
    id?: string;
    name?: string;
    command?: string;
    args?: string[];
    cwd?: string;
    icon?: string;
    description?: string;
    catalogKey?: string;
    requiresApiKey?: boolean;
    apiKeyEnvName?: string;
    apiKey?: string;
    workspacePath?: string;
  }) => {
    setBusyId(payload.id || (payload.catalogKey ? `catalog:${payload.catalogKey}` : ""));
    setError("");

    try {
      const response = await fetch(`${apiBase}/mcp/servers/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      const data = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(data.error || "Не удалось подключить MCP сервер");
      }

      upsertServer(data.server);
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Ошибка подключения MCP");
    } finally {
      setBusyId("");
    }
  }, [apiBase, upsertServer]);

  const disconnectServer = useCallback(async (serverId: string) => {
    setBusyId(serverId);
    setError("");

    try {
      const response = await fetch(`${apiBase}/mcp/servers/${encodeURIComponent(serverId)}/disconnect`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(data.error || "Не удалось отключить MCP сервер");
      }
      upsertServer(data.server);
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : "Ошибка отключения MCP");
    } finally {
      setBusyId("");
    }
  }, [apiBase, upsertServer]);

  const handleCatalogConnect = useCallback(async (entry: McpCatalogEntry) => {
    const apiKey = apiKeys[entry.key] || "";

    if (entry.requiresApiKey && !apiKey.trim()) {
      setError(`Для ${entry.name} нужен ключ ${entry.apiKeyEnvName}.`);
      return;
    }

    if (entry.requiresWorkspacePath) {
      const workspacePath = getWorkspacePath();
      if (!workspacePath) {
        setError("Сначала выберите рабочую папку проекта, затем подключайте Filesystem MCP.");
        return;
      }
    }

    await connectServer({
      catalogKey: entry.key,
      apiKey,
      workspacePath: entry.requiresWorkspacePath ? getWorkspacePath() : undefined,
    });
  }, [apiKeys, connectServer]);

  const handleCustomConnect = useCallback(async () => {
    if (!newName.trim() || !newCommand.trim()) {
      setError("Для custom MCP нужны хотя бы имя и команда запуска.");
      return;
    }

    if (!allowCustom) {
      setError("Custom MCP доступен только администратору");
      return;
    }

    const id = `custom:${Date.now()}`;
    await connectServer({
      id,
      name: newName.trim(),
      command: newCommand.trim(),
      args: parseArgs(newArgs),
      cwd: newCwd.trim() || undefined,
      icon: "server",
      description: "Custom MCP server",
      apiKeyEnvName: newApiKeyEnvName.trim() || undefined,
      apiKey: newApiKey.trim() || undefined,
    });

    setAdding(false);
    setNewName("");
    setNewCommand("");
    setNewArgs("");
    setNewCwd("");
    setNewApiKeyEnvName("");
    setNewApiKey("");
  }, [allowCustom, connectServer, newArgs, newApiKey, newApiKeyEnvName, newCommand, newCwd, newName]);

  const filteredCatalog = catalog.filter((entry) => {
    const query = search.toLowerCase();
    return entry.name.toLowerCase().includes(query) || entry.description.toLowerCase().includes(query);
  });

  const catalogConnectedKeys = new Set(servers.filter((server) => server.connected && server.catalogKey).map((server) => server.catalogKey));

  if (!open) return null;

  if (showCatalog) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <button onClick={() => setShowCatalog(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <X size={16} />
            </button>
            <h2 className="text-base font-semibold text-foreground">Каталог MCP серверов</h2>
            <div className="w-6" />
          </div>

          <div className="px-4 pt-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по MCP серверам..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="p-4 space-y-3 overflow-y-auto flex-1">
            {filteredCatalog.map((entry) => {
              const Icon = iconMap[entry.icon] || Server;
              const apiKeyValue = apiKeys[entry.key] || "";
              const isConnected = catalogConnectedKeys.has(entry.key);
              const isBusy = busyId === `catalog:${entry.key}`;

              return (
                <div key={entry.key} className="rounded-2xl border border-border bg-background/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className="text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-medium text-foreground">{entry.name}</div>
                        {entry.requiresApiKey && <Key size={12} className="text-amber-500" />}
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">{entry.description}</div>
                      <div className="text-[11px] text-muted-foreground font-mono break-all">{[entry.command, ...entry.args].join(" ")}</div>

                      {entry.requiresWorkspacePath && (
                        <div className="mt-2 text-[11px] text-sky-400">
                          Нужна рабочая папка. Сейчас: {getWorkspacePath() || "не выбрана"}
                        </div>
                      )}

                      {entry.requiresApiKey && (
                        <input
                          type="password"
                          value={apiKeyValue}
                          onChange={(e) => setApiKeys((prev) => ({ ...prev, [entry.key]: e.target.value }))}
                          placeholder={entry.apiKeyEnvName || "API key"}
                          className="mt-3 w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors"
                        />
                      )}
                    </div>
                    <button
                      onClick={() => void handleCatalogConnect(entry)}
                      disabled={isConnected || isBusy}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        isConnected
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : "bg-primary text-white hover:bg-primary/90"
                      } disabled:opacity-60`}
                    >
                      {isBusy ? <Loader2 size={14} className="animate-spin" /> : isConnected ? "Подключен" : "Подключить"}
                    </button>
                  </div>
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
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
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
          <p className="text-xs text-muted-foreground mb-4">
            Здесь больше нет fake-подключений: модалка ходит в backend MCP runtime и показывает живые статусы серверов.
          </p>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowCatalog(true)}
              className="px-3 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Plus size={14} />
              Каталог MCP
            </button>
            <button
              onClick={() => {
                if (!allowCustom) {
                  setError("Custom MCP доступен только администратору");
                  return;
                }
                setAdding((prev) => !prev);
              }}
              disabled={!allowCustom}
              className="px-3 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:border-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding ? "Скрыть custom" : "Добавить custom"}
            </button>
            <button
              onClick={() => void refresh()}
              className="px-3 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : "Обновить"}
            </button>
          </div>

          {allowCustom && adding && (
            <div className="rounded-2xl border border-border bg-background/70 p-4 mb-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Имя сервера"
                  className="px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground"
                />
                <input
                  value={newCommand}
                  onChange={(e) => setNewCommand(e.target.value)}
                  placeholder="npx"
                  className="px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground"
                />
                <input
                  value={newArgs}
                  onChange={(e) => setNewArgs(e.target.value)}
                  placeholder="-y package-name --flag"
                  className="px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground md:col-span-2"
                />
                <input
                  value={newCwd}
                  onChange={(e) => setNewCwd(e.target.value)}
                  placeholder="Рабочая директория (опционально)"
                  className="px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground md:col-span-2"
                />
                <input
                  value={newApiKeyEnvName}
                  onChange={(e) => setNewApiKeyEnvName(e.target.value)}
                  placeholder="Имя env для API key (опционально)"
                  className="px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground"
                />
                <input
                  type="password"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="API key (опционально)"
                  className="px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => void handleCustomConnect()}
                  className="px-3 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Подключить custom MCP
                </button>
              </div>
            </div>
          )}

          {servers.length === 0 && !loading && (
            <div className="text-center py-8">
              <Server size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground mb-1">Живые MCP серверы пока не подключены</p>
              <p className="text-xs text-muted-foreground">Добавьте сервер из каталога или подключите custom команду.</p>
            </div>
          )}

          <div className="space-y-3">
            {servers.map((server) => {
              const Icon = iconMap[server.icon || "server"] || Server;
              const isBusy = busyId === server.id;

              return (
                <div key={server.id} className="rounded-2xl border border-border bg-background/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className="text-foreground" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-foreground">{server.name}</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
                          server.status === "connected"
                            ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/10"
                            : server.status === "connecting"
                            ? "border-amber-500/30 text-amber-500 bg-amber-500/10"
                            : server.status === "error"
                            ? "border-red-500/30 text-red-400 bg-red-500/10"
                            : "border-border text-muted-foreground"
                        }`}>
                          {server.status}
                        </span>
                      </div>

                      <div className="text-sm text-muted-foreground mb-1">{server.description || "MCP server"}</div>
                      <div className="text-[11px] text-muted-foreground font-mono break-all">{[server.command, ...server.args].join(" ")}</div>

                      {server.connectedAt && (
                        <div className="mt-2 text-[11px] text-muted-foreground">
                          Подключен: {new Date(server.connectedAt).toLocaleString()}
                        </div>
                      )}

                      {server.tools.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {server.tools.slice(0, 8).map((tool) => (
                            <span key={`${server.id}-${tool.name}`} className="px-2 py-1 rounded-lg text-[11px] bg-primary/10 text-primary border border-primary/20">
                              {tool.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {server.lastError && (
                        <div className="mt-3 text-[12px] text-red-300">{server.lastError}</div>
                      )}

                      {server.stderrPreview && server.stderrPreview.length > 0 && (
                        <div className="mt-2 rounded-xl bg-black/30 border border-border/70 p-3 text-[11px] font-mono text-muted-foreground whitespace-pre-wrap">
                          {server.stderrPreview.join("\n")}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {server.connected ? (
                        <button
                          onClick={() => void disconnectServer(server.id)}
                          disabled={isBusy}
                          className="px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-sm font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-60"
                        >
                          {isBusy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                        </button>
                      ) : (
                        <button
                          onClick={() => void connectServer({
                            id: server.id,
                            name: server.name,
                            command: server.command,
                            args: server.args,
                            cwd: server.cwd,
                            icon: server.icon,
                            description: server.description,
                            catalogKey: server.catalogKey,
                            requiresApiKey: server.requiresApiKey,
                            apiKeyEnvName: server.apiKeyEnvName,
                            apiKey: server.catalogKey ? apiKeys[server.catalogKey] : undefined,
                          })}
                          disabled={isBusy}
                          className="px-3 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                        >
                          {isBusy ? <Loader2 size={14} className="animate-spin" /> : "Подкл."}
                        </button>
                      )}

                      <button
                        onClick={() => setServers((prev) => prev.filter((item) => item.id !== server.id))}
                        className="p-2 rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Убрать из списка"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
