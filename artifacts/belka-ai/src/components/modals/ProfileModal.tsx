import { useState } from "react";
import { X, User, Camera, Save, Mail, Crown } from "lucide-react";
import { t } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

export function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [bio, setBio] = useState(() => localStorage.getItem("belka-bio") || "");
  const [displayName, setDisplayName] = useState(user?.username || "");
  const [saved, setSaved] = useState(false);

  if (!open) return null;

  const initials = (user?.username || "U").slice(0, 2).toUpperCase();

  const handleSave = () => {
    localStorage.setItem("belka-bio", bio);
    localStorage.setItem("belka-display-name", displayName);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

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
            <div className="relative group mb-3">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-primary/20">
                {initials}
              </div>
              <button className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={12} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-foreground">{user?.username || "User"}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 capitalize flex items-center gap-1">
                <Crown size={9} />
                {user?.plan || "free"}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{user?.email}</span>
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
                  value={user?.email || ""}
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
