import { useState, useEffect, useCallback } from "react";
import { Github, RefreshCw, Loader2, Check, X, ExternalLink, GitBranch, Lock, Globe, Star, FolderGit2, Plus, Upload } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL || "/";
const API = `${BASE}api`.replace(/\/\/+/g, "/");

function getToken() {
  return localStorage.getItem("belka-token") || "";
}
function getHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` };
}

interface GHRepo {
  id: string;
  name: string;
  fullName: string;
  description: string;
  url: string;
  cloneUrl: string;
  branch: string;
  private: boolean;
  language: string;
  stars: number;
  updatedAt: string;
}

interface GHStatus {
  connected: boolean;
  username?: string;
  avatar?: string;
}

interface GitHubModalProps {
  open: boolean;
  onClose: () => void;
  onSelectRepo?: (repo: { fullName: string; branch: string }) => void;
}

export function GitHubModal({ open, onClose, onSelectRepo }: GitHubModalProps) {
  const { theme } = useTheme();
  const [status, setStatus] = useState<GHStatus>({ connected: false });
  const [repos, setRepos] = useState<GHRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateRepo, setShowCreateRepo] = useState(false);
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoDesc, setNewRepoDesc] = useState("");
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/github/status`, { headers: getHeaders() });
      const data = await res.json();
      setStatus(data);
      if (data.connected) fetchRepos();
    } catch {}
  }, []);

  const fetchRepos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/github/repos`, { headers: getHeaders() });
      const data = await res.json();
      if (data.repos) setRepos(data.repos);
      else setError(data.error || "Ошибка загрузки репозиториев");
    } catch {
      setError("Не удалось загрузить репозитории");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) checkStatus();
  }, [open, checkStatus]);

  useEffect(() => {
    const handleCallback = async (event: MessageEvent) => {
      if (event.data?.type === "github_oauth_callback" && event.data?.code) {
        setConnectLoading(true);
        try {
          const res = await fetch(`${API}/github/auth/callback`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ code: event.data.code }),
          });
          const data = await res.json();
          if (data.success) {
            setStatus({ connected: true, username: data.username, avatar: data.avatar });
            fetchRepos();
          } else {
            setError(data.error || "Ошибка авторизации");
          }
        } catch {
          setError("Ошибка авторизации");
        }
        setConnectLoading(false);
      }
    };
    window.addEventListener("message", handleCallback);
    return () => window.removeEventListener("message", handleCallback);
  }, [fetchRepos]);

  const handleConnect = async () => {
    setConnectLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/github/auth/url`, { headers: getHeaders() });
      const data = await res.json();
      if (data.url) {
        const popup = window.open(data.url, "github_oauth", "width=600,height=700,left=100,top=100");
        const timer = setInterval(() => {
          if (popup?.closed) {
            clearInterval(timer);
            setConnectLoading(false);
            checkStatus();
          }
          try {
            const params = new URL(popup?.location.href || "").searchParams;
            const code = params.get("code");
            if (code) {
              clearInterval(timer);
              popup?.close();
              (async () => {
                const r = await fetch(`${API}/github/auth/callback`, {
                  method: "POST",
                  headers: getHeaders(),
                  body: JSON.stringify({ code }),
                });
                const d = await r.json();
                if (d.success) {
                  setStatus({ connected: true, username: d.username, avatar: d.avatar });
                  fetchRepos();
                } else {
                  setError(d.error);
                }
                setConnectLoading(false);
              })();
            }
          } catch {}
        }, 500);
      } else {
        setError(data.error || "GitHub OAuth не настроен. Установите GITHUB_CLIENT_ID и GITHUB_CLIENT_SECRET.");
        setConnectLoading(false);
      }
    } catch {
      setError("Не удалось получить URL авторизации");
      setConnectLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await fetch(`${API}/github/disconnect`, { method: "DELETE", headers: getHeaders() });
    setStatus({ connected: false });
    setRepos([]);
  };

  const handleCreateRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoName.trim()) return;
    setCreateLoading(true);
    try {
      const res = await fetch(`${API}/github/repos/create`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ name: newRepoName.trim(), description: newRepoDesc.trim(), isPrivate: newRepoPrivate }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateRepo(false);
        setNewRepoName(""); setNewRepoDesc(""); setNewRepoPrivate(false);
        fetchRepos();
      } else {
        setError(data.error);
      }
    } catch { setError("Ошибка создания репозитория"); }
    setCreateLoading(false);
  };

  const filteredRepos = repos.filter(r =>
    r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={cn("w-full max-w-xl rounded-2xl border shadow-2xl flex flex-col max-h-[85vh]",
        theme === "dark" ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
      )}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Github size={18} />
            <span className="font-semibold">GitHub</span>
            {status.connected && (
              <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20">
                <Check size={10} />
                {status.username}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {status.connected && (
              <button
                onClick={() => setShowCreateRepo(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors border border-primary/20"
              >
                <Plus size={12} />
                Новый репозиторий
              </button>
            )}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!status.connected ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 gap-5">
              {error && (
                <div className="w-full text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg p-3 text-center">
                  {error}
                </div>
              )}
              <div className="text-center">
                <Github size={40} className="text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">Подключите GitHub</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  После подключения агент сможет работать с вашими репозиториями, создавать и изменять файлы, делать коммиты.
                </p>
              </div>
              <button
                onClick={handleConnect}
                disabled={connectLoading}
                className="flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-xl font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {connectLoading ? <Loader2 size={16} className="animate-spin" /> : <Github size={16} />}
                Войти через GitHub
              </button>
              <p className="text-[10px] text-muted-foreground/60 text-center max-w-xs">
                Для GitHub OAuth нужно установить GITHUB_CLIENT_ID и GITHUB_CLIENT_SECRET в настройках среды
              </p>
            </div>
          ) : (
            <div className="p-4 flex flex-col gap-3">
              {error && (
                <div className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg p-3">
                  {error}
                </div>
              )}

              {showCreateRepo && (
                <form onSubmit={handleCreateRepo} className="bg-muted/30 border border-border/50 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Новый репозиторий</span>
                    <button type="button" onClick={() => setShowCreateRepo(false)} className="text-muted-foreground"><X size={14} /></button>
                  </div>
                  <input
                    autoFocus
                    value={newRepoName}
                    onChange={e => setNewRepoName(e.target.value)}
                    placeholder="Название репозитория"
                    className="text-sm bg-background border border-border/50 rounded-lg px-3 py-2 outline-none focus:border-primary"
                    required
                  />
                  <input
                    value={newRepoDesc}
                    onChange={e => setNewRepoDesc(e.target.value)}
                    placeholder="Описание (необязательно)"
                    className="text-sm bg-background border border-border/50 rounded-lg px-3 py-2 outline-none focus:border-primary"
                  />
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={newRepoPrivate} onChange={e => setNewRepoPrivate(e.target.checked)} />
                    <Lock size={12} />
                    Приватный
                  </label>
                  <div className="flex gap-2">
                    <button type="submit" disabled={createLoading} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">
                      {createLoading ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Создать"}
                    </button>
                    <button type="button" onClick={() => setShowCreateRepo(false)} className="px-4 py-2 bg-muted rounded-lg text-sm">
                      Отмена
                    </button>
                  </div>
                </form>
              )}

              <div className="flex items-center gap-2">
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Поиск репозиториев..."
                  className="flex-1 text-sm bg-muted/50 border border-border/50 rounded-lg px-3 py-2 outline-none focus:border-primary"
                />
                <button onClick={fetchRepos} className="text-muted-foreground hover:text-foreground p-2 rounded-lg border border-border/50">
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {filteredRepos.map(repo => (
                    <div
                      key={repo.id}
                      onClick={() => { onSelectRepo?.({ fullName: repo.fullName, branch: repo.branch }); onClose(); }}
                      className="flex items-start gap-3 p-3 rounded-xl border border-border/30 hover:border-border hover:bg-muted/30 cursor-pointer transition-all group"
                    >
                      <FolderGit2 size={16} className="text-muted-foreground mt-0.5 flex-shrink-0 group-hover:text-primary transition-colors" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium truncate">{repo.fullName}</span>
                          {repo.private ? (
                            <span className="flex items-center gap-0.5 text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground"><Lock size={8} />private</span>
                          ) : (
                            <span className="flex items-center gap-0.5 text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground"><Globe size={8} />public</span>
                          )}
                        </div>
                        {repo.description && (
                          <p className="text-xs text-muted-foreground truncate">{repo.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground/60">
                          {repo.language && <span>{repo.language}</span>}
                          <span className="flex items-center gap-0.5"><GitBranch size={9} />{repo.branch}</span>
                          {repo.stars > 0 && <span className="flex items-center gap-0.5"><Star size={9} />{repo.stars}</span>}
                        </div>
                      </div>
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-muted-foreground hover:text-foreground p-1 rounded opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  ))}
                  {filteredRepos.length === 0 && !loading && (
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                      {searchQuery ? "Ничего не найдено" : "Нет репозиториев"}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {status.connected && (
          <div className="px-5 py-3 border-t border-border/50 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              {status.avatar && (
                <img src={status.avatar} alt={status.username} className="w-5 h-5 rounded-full" />
              )}
              <span className="text-xs text-muted-foreground">{status.username}</span>
            </div>
            <button
              onClick={handleDisconnect}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Отключить
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
