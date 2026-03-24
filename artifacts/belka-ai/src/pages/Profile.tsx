import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, User, Camera, Save, Mail, Crown } from "lucide-react";
import { t } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

export default function ProfilePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [bio, setBio] = useState(user?.bio || "");
  const [displayName, setDisplayName] = useState(user?.username || "");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const initials = (user?.username || "U").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => navigate("/chat")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft size={16} />
          <span className="text-sm font-medium">{t("backToApp")}</span>
        </button>

        <div className="flex items-center gap-3 mb-8">
          <User size={24} className="text-primary" />
          <h1 className="text-3xl font-display font-bold text-foreground">{t("profile")}</h1>
        </div>

        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-2xl p-6">
            <div className="flex flex-col items-center mb-6">
              <div className="relative group mb-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary/20">
                  {initials}
                </div>
                <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={14} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-foreground">{user?.username || "User"}</span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 capitalize flex items-center gap-1">
                  <Crown size={10} />
                  {user?.plan || "free"}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">{user?.email}</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-panel rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">{t("profileInfo")}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("profileDisplayName")}</label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("email")}</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={user?.email || ""}
                    disabled
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-muted/50 text-muted-foreground cursor-not-allowed"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("profileBio")}</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder={t("profileBioPlaceholder")}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors resize-none"
                />
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">{t("profileStats")}</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-foreground">0</div>
                <div className="text-xs text-muted-foreground mt-1">{t("conversations")}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">0</div>
                <div className="text-xs text-muted-foreground mt-1">{t("profileMessages")}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">0</div>
                <div className="text-xs text-muted-foreground mt-1">{t("profileProjects")}</div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <button
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <Save size={18} />
              {saved ? t("profileSaved") : t("save")}
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
