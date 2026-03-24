import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Plus, PanelLeftClose, PanelLeft, Loader2, X, Trash2, Archive, ChevronDown, ChevronRight, ArchiveRestore } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { UserMenu } from "./UserMenu";

interface ChatSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  activeConvId?: string;
  isPending?: boolean;
}

function formatChatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  } else if (days === 1) {
    return "Вчера";
  } else if (days < 7) {
    return `${days} дн. назад`;
  } else {
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  }
}

export function ChatSidebar({ collapsed, onToggle, activeConvId, isPending }: ChatSidebarProps) {
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [conversations, setConversations] = useState<any[]>([]);
  const [archivedConversations, setArchivedConversations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recentOpen, setRecentOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [chatListOpen, setChatListOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const recentSectionRef = useRef<HTMLDivElement>(null);
  const recentBtnRef = useRef<HTMLButtonElement>(null);
  const chatListRef = useRef<HTMLDivElement>(null);

  const BASE = import.meta.env.BASE_URL || "/";
  const API = `${BASE}api`.replace(/\/\/+/g, "/");

  const initialLoadDone = useRef(false);

  const fetchConversations = async () => {
    try {
      if (!initialLoadDone.current) setIsLoading(true);
      const [activeRes, archivedRes] = await Promise.all([
        fetch(`${API}/conversations`),
        fetch(`${API}/conversations?archived=true`),
      ]);
      const activeData = await activeRes.json();
      const archivedData = await archivedRes.json();
      setConversations(activeData.conversations || []);
      setArchivedConversations(archivedData.conversations || []);
      initialLoadDone.current = true;
    } catch {
      if (!initialLoadDone.current) {
        setConversations([]);
        setArchivedConversations([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node) && btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setChatListOpen(false);
      }
      if (recentOpen && recentSectionRef.current && !recentSectionRef.current.contains(e.target as Node) && recentBtnRef.current && !recentBtnRef.current.contains(e.target as Node)) {
        setRecentOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [recentOpen]);

  const currentActive = activeConvId || location.replace(/.*\/chat\//, "");

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API}/conversations/${id}`, { method: "DELETE" });
      setConversations(prev => prev.filter(c => c.id !== id));
      setDeleteConfirm(null);
      queryClient.invalidateQueries({ queryKey: ["listConversations"] });
      if (currentActive === id) navigate("/chat");
    } catch {}
  };

  const handleArchive = async (id: string) => {
    try {
      await fetch(`${API}/conversations/${id}/archive`, { method: "PATCH" });
      setDeleteConfirm(null);
      fetchConversations();
      queryClient.invalidateQueries({ queryKey: ["listConversations"] });
      if (currentActive === id) navigate("/chat");
    } catch {}
  };

  const handleUnarchive = async (id: string) => {
    try {
      await fetch(`${API}/conversations/${id}/unarchive`, { method: "PATCH" });
      fetchConversations();
      queryClient.invalidateQueries({ queryKey: ["listConversations"] });
    } catch {}
  };

  const VISIBLE_CHATS = 5;
  const hasMore = conversations.length > VISIBLE_CHATS;

  return (
    <div
      className={cn(
        "border-r border-border/50 bg-sidebar flex flex-col h-screen flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
        collapsed ? "w-[56px]" : "w-64"
      )}
    >
      <div className={cn(
        "flex items-center transition-all duration-300 ease-in-out",
        collapsed ? "justify-center p-3" : "justify-between px-4 p-3"
      )}>
        <div className={cn(
          "flex items-center gap-2 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap",
          collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
        )}>
          <Link href="/" className="flex items-center gap-2">
            <BelkaLogo size={28} />
            <span className="font-display font-bold text-lg tracking-tight text-foreground">BELKA</span>
          </Link>
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <div className="px-2 mb-2">
        <Link href="/chat">
          <div className="flex items-center rounded-xl belka-gradient text-white hover:opacity-90 transition-all duration-300 ease-in-out font-medium shadow-lg shadow-primary/20 cursor-pointer overflow-hidden p-2.5">
            <Plus size={16} className="flex-shrink-0" />
            <div
              className="overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap"
              style={{ width: collapsed ? 0 : 120, opacity: collapsed ? 0 : 1, marginLeft: collapsed ? 0 : 8 }}
            >
              <span className="text-sm">{t("newChat")}</span>
            </div>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5 min-h-0">
        {collapsed ? (
          <div className="relative">
            <button
              ref={btnRef}
              onClick={() => setChatListOpen(!chatListOpen)}
              className="w-full flex justify-center p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ChevronDown size={16} />
            </button>

            {chatListOpen && (
              <div
                ref={popupRef}
                className="fixed z-[100] bg-card border border-border rounded-xl shadow-2xl w-64 max-h-80 overflow-y-auto"
                style={{ left: 56, top: btnRef.current ? btnRef.current.getBoundingClientRect().top : 120 }}
              >
                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("recentChats")}</span>
                  <button onClick={() => setChatListOpen(false)} className="p-0.5 text-muted-foreground hover:text-foreground">
                    <X size={12} />
                  </button>
                </div>
                <div className="py-1">
                  {isLoading ? (
                    [1, 2, 3].map(i => (
                      <div key={i} className="mx-3 my-1 rounded-lg animate-pulse bg-muted h-8" />
                    ))
                  ) : conversations.length === 0 ? (
                    <div className="px-3 py-4 text-xs text-muted-foreground text-center">{t("newChat")}</div>
                  ) : conversations.map((conv) => {
                    const isActive = location === `/chat/${conv.id}`;
                    return (
                      <Link key={conv.id} href={`/chat/${conv.id}`}>
                        <div
                          onClick={() => setChatListOpen(false)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors group/item",
                            isActive ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <span className="truncate flex-1">{conv.title}</span>
                          <span className="text-[9px] text-muted-foreground/50 flex-shrink-0">{formatChatDate(conv.updatedAt)}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {archivedConversations.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setArchiveOpen(!archiveOpen)}
                  className="w-full flex justify-center p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mt-1"
                  title="Архив"
                >
                  <Archive size={16} />
                </button>
                {archiveOpen && (
                  <div className="fixed z-[100] bg-card border border-border rounded-xl shadow-2xl w-64 max-h-60 overflow-y-auto" style={{ left: 56, top: 200 }}>
                    <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Архив</span>
                      <button onClick={() => setArchiveOpen(false)} className="p-0.5 text-muted-foreground hover:text-foreground"><X size={12} /></button>
                    </div>
                    <div className="py-1">
                      {archivedConversations.map((conv) => (
                        <Link key={conv.id} href={`/chat/${conv.id}`}>
                          <div onClick={() => setArchiveOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                            <span className="truncate flex-1">{conv.title}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <button
              ref={recentBtnRef}
              onClick={() => setRecentOpen(!recentOpen)}
              className="flex items-center gap-1 px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 mt-2 w-full hover:text-foreground transition-colors"
            >
              <ChevronRight size={10} className={cn("transition-transform duration-300", recentOpen && "rotate-90")} />
              <span>{t("recentChats")}</span>
              <span className="ml-auto text-[9px] text-muted-foreground/50">{conversations.length}</span>
            </button>

            {isLoading ? (
              <div className="space-y-1.5 px-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-lg animate-pulse bg-muted h-8" />
                ))}
              </div>
            ) : (
              <div
                ref={recentSectionRef}
                className="overflow-hidden transition-[max-height] duration-400 ease-[cubic-bezier(0.4,0,0.2,1)]"
                style={{
                  maxHeight: recentOpen
                    ? `${conversations.length * 52 + 16}px`
                    : `${Math.min(conversations.length, VISIBLE_CHATS) * 52 + (hasMore ? 32 : 0)}px`,
                }}
              >
                <div ref={chatListRef}>
                  {(recentOpen ? conversations : conversations.slice(0, VISIBLE_CHATS)).map((conv) => {
                    const isActive = location === `/chat/${conv.id}`;
                    const isWorking = isPending && String(conv.id) === currentActive;
                    return (
                      <div key={conv.id} className="group/item relative">
                        <Link href={`/chat/${conv.id}`}>
                          <div className={cn(
                            "flex items-center gap-2 rounded-lg cursor-pointer transition-all px-2.5 py-2 pr-8",
                            isActive
                              ? "bg-primary/10 text-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}>
                            {isWorking && (
                              <Loader2 size={12} className="animate-spin text-primary flex-shrink-0" />
                            )}
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="truncate text-sm">{conv.title}</span>
                              <span className="text-[9px] text-muted-foreground/50">{formatChatDate(conv.updatedAt)}</span>
                            </div>
                          </div>
                        </Link>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteConfirm(conv.id); }}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground/0 group-hover/item:text-muted-foreground hover:!text-red-400 hover:!bg-red-400/10 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                  {hasMore && !recentOpen && (
                    <button
                      onClick={() => setRecentOpen(true)}
                      className="w-full text-center text-[10px] text-muted-foreground hover:text-foreground py-1.5 transition-colors"
                    >
                      Показать ещё {conversations.length - VISIBLE_CHATS}
                    </button>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={() => setArchiveOpen(!archiveOpen)}
              className="flex items-center gap-1.5 px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-1.5 w-full hover:text-foreground transition-colors"
            >
              <Archive size={11} />
              {archiveOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              <span>Архив</span>
              {archivedConversations.length > 0 && (
                <span className="ml-auto text-[9px] bg-muted px-1.5 py-0.5 rounded-full">{archivedConversations.length}</span>
              )}
            </button>

            {archiveOpen && (
              archivedConversations.length === 0 ? (
                <div className="px-3 py-2 text-[10px] text-muted-foreground/50 text-center">Нет архивных чатов</div>
              ) : archivedConversations.map((conv) => (
                <div key={conv.id} className="group/arch relative">
                  <Link href={`/chat/${conv.id}`}>
                    <div className="flex items-center gap-2 rounded-lg cursor-pointer transition-all px-2.5 py-2 pr-16 text-muted-foreground/60 hover:bg-muted hover:text-muted-foreground">
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="truncate text-xs">{conv.title}</span>
                        <span className="text-[9px] text-muted-foreground/40">{formatChatDate(conv.updatedAt)}</span>
                      </div>
                    </div>
                  </Link>
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 group-hover/arch:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleUnarchive(conv.id); }}
                      className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                      title="Восстановить"
                    >
                      <ArchiveRestore size={12} />
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(conv.id); }}
                      className="p-1 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all"
                      title="Удалить навсегда"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      <div className={cn("border-t border-border/50 p-2 flex-shrink-0", collapsed && "px-1")}>
        <UserMenu compact={collapsed} />
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-80 max-w-[90vw]" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-foreground mb-2">Удалить чат?</h3>
            <p className="text-xs text-muted-foreground mb-4">Вы точно хотите удалить этот чат? Это действие нельзя отменить.</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-medium hover:bg-red-500/20 transition-colors"
              >
                Да, удалить
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-3 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
              >
                Нет
              </button>
              <button
                onClick={() => handleArchive(deleteConfirm)}
                className="flex-1 px-3 py-2 rounded-xl belka-gradient text-white text-xs font-medium hover:opacity-90 transition-all"
              >
                В архив
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BelkaLogo({ size = 32 }: { size?: number }) {
  const BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return (
    <img
      src={`${BASE}/belka-logo.png`}
      alt="BELKA AI"
      width={size}
      height={size}
      className="rounded-lg object-cover"
      style={{ width: size, height: size }}
    />
  );
}

export { BelkaLogo };
