import { useState, useRef, useEffect, useCallback } from "react";
import { Settings, FileText, User, CreditCard, ChevronUp, LogOut, Zap, Shield, MessageCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { PricingModal } from "@/components/modals/PricingModal";
import { ProfileModal } from "@/components/modals/ProfileModal";
import { DocsModal } from "@/components/modals/DocsModal";
import { useLocation } from "wouter";

const REQUEST_LIMITS: Record<string, number> = {
  free: 50,
  pro: 2000,
  enterprise: 10000,
};

function getRequestsUsed(): number {
  try {
    const data = localStorage.getItem("belka-requests-used");
    if (!data) return 0;
    const parsed = JSON.parse(data);
    const today = new Date().toISOString().slice(0, 10);
    if (parsed.date !== today) return 0;
    return parsed.count || 0;
  } catch {
    return 0;
  }
}

const BASE = import.meta.env.BASE_URL || "/";
const apiBase = `${BASE}api`.replace(/\/+/g, "/");

function formatRequests(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

export function UserMenu({ compact }: { compact?: boolean }) {
  const { user, logout, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ bottom: 0, left: 0 });
  const [, navigate] = useLocation();

  const plan = user?.plan || localStorage.getItem("belka-plan") || "free";
  const [apiRequestData, setApiRequestData] = useState<{ used: number; limit: number } | null>(null);
  const [barAnimated, setBarAnimated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("belka-token");
    if (!token) return;
    fetch(`${apiBase}/auth/token-usage`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setApiRequestData({ used: data.tokensUsed, limit: data.tokenLimit }); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setBarAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const requestsUsed = apiRequestData?.used ?? getRequestsUsed();
  const requestLimit = apiRequestData?.limit ?? (REQUEST_LIMITS[plan] || REQUEST_LIMITS.free);
  const requestsRemaining = Math.max(0, requestLimit - requestsUsed);
  const remainingPercent = requestLimit > 0 ? (requestsRemaining / requestLimit) * 100 : 100;

  const updatePos = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ bottom: window.innerHeight - rect.top + 4, left: rect.left });
    }
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initial = user?.username?.charAt(0)?.toUpperCase() || "U";

  const handleOpen = () => {
    updatePos();
    setOpen(!open);
  };

  const barColor = remainingPercent > 50 ? 'bg-green-500' : remainingPercent > 20 ? 'bg-yellow-500' : 'bg-red-500';
  const barGlow = remainingPercent > 50 ? 'shadow-green-500/30' : remainingPercent > 20 ? 'shadow-yellow-500/30' : 'shadow-red-500/30';

  return (
    <>
      <div className="relative">
        <button
          ref={btnRef}
          onClick={handleOpen}
          className="flex items-center gap-2 w-full px-2 py-2 rounded-lg hover:bg-muted transition-colors"
        >
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 relative border border-primary/30">
            {(() => { const av = localStorage.getItem(`belka-avatar-${user?.id}`) || localStorage.getItem("belka-avatar"); return av && av.length > 5 ? av : null; })() ? (
              <img src={(localStorage.getItem(`belka-avatar-${user?.id}`) || localStorage.getItem("belka-avatar"))!} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">
                {initial}
              </div>
            )}
            {isAdmin && (
              <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-yellow-500 flex items-center justify-center">
                <Shield size={7} className="text-white" />
              </div>
            )}
          </div>
          {!compact && (
            <>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-medium text-foreground truncate">{user?.username || "User"}</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Zap size={9} className={plan === "pro" ? "text-primary" : plan === "enterprise" ? "text-secondary" : "text-muted-foreground"} />
                  <span className="capitalize">{plan}</span>
                </div>
              </div>
              <ChevronUp size={14} className={`text-muted-foreground transition-transform ${open ? "" : "rotate-180"}`} />
            </>
          )}
        </button>

        {open && (
          <div ref={menuRef} className="fixed bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-[100] min-w-[220px]" style={{ bottom: menuPos.bottom, left: menuPos.left }}>
            <div className="px-3 py-2 border-b border-border">
              <div className="text-sm font-medium text-foreground truncate">{user?.username || "User"}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium capitalize ${plan === "pro" ? "bg-primary/10 text-primary" : plan === "enterprise" ? "bg-secondary/10 text-secondary" : "bg-muted text-muted-foreground"}`}>{plan}</span>
              </div>
            </div>

            <div className="px-3 py-2 border-b border-border">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <MessageCircle size={10} />
                  <span>{t("requestsRemaining")}</span>
                </div>
                <span className={`text-[10px] font-mono font-semibold ${remainingPercent > 50 ? 'text-green-400' : remainingPercent > 20 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {formatRequests(requestsRemaining)}/{formatRequests(requestLimit)}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted/60 overflow-hidden">
                <div
                  className={`h-full rounded-full shadow-sm ${barColor} ${barGlow}`}
                  style={{
                    width: barAnimated ? `${remainingPercent}%` : '0%',
                    transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.5s ease',
                  }}
                />
              </div>
            </div>

            <div className="py-1">
              <MenuBtn icon={<User size={15} />} label={t("profile")} onClick={() => { setOpen(false); setProfileOpen(true); }} />
              <MenuBtn icon={<Settings size={15} />} label={t("settings")} onClick={() => { setOpen(false); setSettingsOpen(true); }} />
              <MenuBtn icon={<CreditCard size={15} />} label={t("subscriptions")} onClick={() => { setOpen(false); setPricingOpen(true); }} />
              <MenuBtn icon={<FileText size={15} />} label={t("documentation")} onClick={() => { setOpen(false); setDocsOpen(true); }} />
              {isAdmin && (
                <MenuBtn icon={<Shield size={15} />} label={t("adminPanel")} onClick={() => { setOpen(false); navigate("/admin"); }} highlight />
              )}
            </div>
            <div className="border-t border-border py-1">
              <MenuBtn icon={<LogOut size={15} />} label={t("logout")} onClick={() => { logout(); navigate("/"); }} danger />
            </div>
          </div>
        )}
      </div>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} />
      <DocsModal open={docsOpen} onClose={() => setDocsOpen(false)} />
    </>
  );
}

function MenuBtn({ icon, label, onClick, danger, highlight }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean; highlight?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${danger ? "text-destructive hover:bg-destructive/10" : highlight ? "text-yellow-500 hover:bg-yellow-500/10" : "text-foreground hover:bg-muted"}`}
    >
      {icon}
      {label}
    </button>
  );
}
