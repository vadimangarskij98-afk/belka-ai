import { useState, useEffect } from "react";
import { X, User, Camera, Save, Mail, Crown, Pencil, ArrowLeft, Calendar, Gift, Copy, Check } from "lucide-react";
import { apiFetch, buildApiUrl, jsonHeaders } from "@/lib/api";
import { t, getLang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

const API = buildApiUrl();

const AVATAR_STYLES = [
  "bottts",
  "bottts-neutral",
  "thumbs",
  "shapes",
  "icons",
];

function getRandomAvatar(seed: string): string {
  const style = AVATAR_STYLES[Math.abs(hashCode(seed)) % AVATAR_STYLES.length];
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=0a0a23,1a1a3e,0d1b2a,1b2838&backgroundType=gradientLinear`;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}

function getOrCreateAvatar(userId: string, username: string): string {
  const stored = localStorage.getItem(`belka-avatar-${userId}`);
  if (stored) return stored;
  const legacy = localStorage.getItem("belka-avatar");
  if (legacy) {
    localStorage.setItem(`belka-avatar-${userId}`, legacy);
    localStorage.removeItem("belka-avatar");
    return legacy;
  }
  const avatar = getRandomAvatar(username + Date.now());
  localStorage.setItem(`belka-avatar-${userId}`, avatar);
  return avatar;
}

export function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(() => localStorage.getItem(`belka-bio-${user?.id}`) || "");
  const [displayName, setDisplayName] = useState(() => localStorage.getItem(`belka-display-name-${user?.id}`) || user?.username || "");
  const [saved, setSaved] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referralStats, setReferralStats] = useState<{ totalReferred: number; bonusRequests: number }>({ totalReferred: 0, bonusRequests: 0 });
  const [copied, setCopied] = useState(false);
  const [refCodeInput, setRefCodeInput] = useState("");
  const [refApplyMsg, setRefApplyMsg] = useState("");

  useEffect(() => {
    if (open && user) {
      setAvatarUrl(getOrCreateAvatar(user.id, user.username));
      setDisplayName(localStorage.getItem(`belka-display-name-${user.id}`) || user.username);
      setBio(localStorage.getItem(`belka-bio-${user.id}`) || "");
      setEditing(false);
      setRefApplyMsg("");
      setRefCodeInput("");
      apiFetch(`${API}/referrals/my-code`)
        .then(r => r.json()).then(d => { if (d.referralCode) setReferralCode(d.referralCode); }).catch(() => {});
      apiFetch(`${API}/referrals/stats`)
        .then(r => r.json()).then(d => { setReferralStats({ totalReferred: d.totalReferred || 0, bonusRequests: d.bonusRequests || 0 }); }).catch(() => {});
    }
  }, [open, user]);

  if (!open || !user) return null;

  const isRu = getLang() === "ru";
  const plan = user.plan || localStorage.getItem("belka-plan") || "free";
  const planLabel = plan === "pro" ? (isRu ? "Профессиональный" : "Pro") : plan === "enterprise" ? (isRu ? "Корпоративный" : "Enterprise") : (isRu ? "Бесплатный" : "Free");

  const handleSave = () => {
    localStorage.setItem(`belka-bio-${user.id}`, bio);
    localStorage.setItem(`belka-display-name-${user.id}`, displayName);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setEditing(false);
    }, 1500);
  };

  const handleNewAvatar = () => {
    const newAvatar = getRandomAvatar(user.username + Date.now());
    localStorage.setItem(`belka-avatar-${user.id}`, newAvatar);
    setAvatarUrl(newAvatar);
  };

  const memberDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString(isRu ? "ru-RU" : "en-US", { year: "numeric", month: "long", day: "numeric" }) : "";

  if (editing) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-lg font-semibold text-foreground">{t("profileEdit")}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-5">
            <div className="flex flex-col items-center">
              <div className="relative group mb-3">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/30 shadow-lg shadow-primary/20">
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                </div>
                <button onClick={handleNewAvatar} className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary/80 transition-colors">
                  <Camera size={12} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("profileDisplayName")}</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:border-primary transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("email")}</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={user.email}
                    disabled
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-muted/50 text-sm text-muted-foreground cursor-not-allowed"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("profileBio")}</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder={t("profileBioPlaceholder")}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors resize-none"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <Save size={16} />
              {saved ? t("profileSaved") : t("save")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{t("profile")}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/30 shadow-lg shadow-primary/20 mb-3">
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-semibold text-foreground">{localStorage.getItem(`belka-display-name-${user.id}`) || user.username}</span>
            <span className="text-xs text-muted-foreground mb-2">{user.email}</span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 capitalize flex items-center gap-1.5">
              <Crown size={11} />
              {planLabel}
            </span>
          </div>

          {bio && (
            <div className="px-4 py-3 rounded-xl bg-muted/30 border border-border">
              <p className="text-sm text-muted-foreground italic">"{bio}"</p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-muted/20 border border-border/50">
              <Mail size={14} className="text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("email")}</div>
                <div className="text-sm text-foreground truncate">{user.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-muted/20 border border-border/50">
              <Calendar size={14} className="text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("profileMember")}</div>
                <div className="text-sm text-foreground">{memberDate}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-muted/20 border border-border/50">
              <Crown size={14} className="text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("plan")}</div>
                <div className="text-sm text-foreground capitalize">{planLabel}</div>
              </div>
            </div>
          </div>

          {referralCode && (
            <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Gift size={16} className="text-primary" />
                <span className="text-sm font-semibold text-foreground">{t("referralTitle")}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t("referralDesc")}</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={referralCode}
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground font-mono"
                />
                <button
                  onClick={() => { navigator.clipboard.writeText(referralCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="p-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="text-muted-foreground">{t("referralTotal")}: <span className="font-bold text-foreground">{referralStats.totalReferred}</span></span>
                <span className="text-muted-foreground">{t("referralBonus")}: <span className="font-bold text-primary">{referralStats.bonusRequests}</span></span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  value={refCodeInput}
                  onChange={e => setRefCodeInput(e.target.value)}
                  placeholder={t("referralApply")}
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground"
                />
                <button
                  onClick={async () => {
                    if (!refCodeInput.trim()) return;
                    try {
                      const res = await apiFetch(`${API}/referrals/apply`, { method: "POST", headers: jsonHeaders(), body: JSON.stringify({ code: refCodeInput.trim() }) });
                      const data = await res.json();
                      setRefApplyMsg(res.ok ? t("referralApplied") : data.error || t("referralInvalid"));
                    } catch { setRefApplyMsg(t("referralInvalid")); }
                  }}
                  className="px-3 py-2 rounded-lg bg-secondary text-white text-sm font-medium hover:bg-secondary/90 transition-colors"
                >
                  {t("referralApplyBtn")}
                </button>
              </div>
              {refApplyMsg && <p className={`text-xs ${refApplyMsg === t("referralApplied") ? "text-green-400" : "text-red-400"}`}>{refApplyMsg}</p>}
            </div>
          )}

          <button
            onClick={() => setEditing(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            <Pencil size={16} />
            {t("profileEdit")}
          </button>
        </div>
      </div>
    </div>
  );
}
