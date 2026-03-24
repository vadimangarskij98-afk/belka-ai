import { useState, useEffect } from "react";
import { X, Sun, Moon, Globe, CreditCard, Bell, LogOut, CheckCircle } from "lucide-react";
import { t, getLang, setLang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const [lang, setLangState] = useState(getLang);
  const [, forceUpdate] = useState(0);
  const [notifications, setNotifications] = useState(() => localStorage.getItem("belka-notif") !== "false");
  const [showCard, setShowCard] = useState(false);
  const [cardData, setCardData] = useState(() => {
    const saved = localStorage.getItem("belka-card");
    return saved ? JSON.parse(saved) : { number: "", expiry: "", cvv: "", holder: "" };
  });
  const [cardSaved, setCardSaved] = useState(() => !!localStorage.getItem("belka-card"));
  const [, navigate] = useLocation();

  if (!open) return null;

  const handleLang = (l: "ru" | "en") => {
    setLang(l);
    setLangState(l);
    forceUpdate(n => n + 1);
  };

  const handleNotif = (v: boolean) => {
    setNotifications(v);
    localStorage.setItem("belka-notif", String(v));
  };

  const handleSaveCard = () => {
    if (cardData.number && cardData.expiry && cardData.holder) {
      const { cvv, ...safeData } = cardData;
      localStorage.setItem("belka-card", JSON.stringify(safeData));
      setCardSaved(true);
      setShowCard(false);
    }
  };

  const handleRemoveCard = () => {
    localStorage.removeItem("belka-card");
    setCardData({ number: "", expiry: "", cvv: "", holder: "" });
    setCardSaved(false);
  };

  const maskedCard = cardSaved && cardData.number
    ? ".... .... .... " + cardData.number.replace(/\s/g, "").slice(-4)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{t("settings")}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sun size={16} className="text-primary" />
              <span className="text-sm font-medium text-foreground">{t("theme")}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTheme("light")}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${theme === "light" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
              >
                <Sun size={16} /> {t("lightTheme")}
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${theme === "dark" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
              >
                <Moon size={16} /> {t("darkTheme")}
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Globe size={16} className="text-primary" />
              <span className="text-sm font-medium text-foreground">{t("language")}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleLang("ru")}
                className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${lang === "ru" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
              >
                RU
              </button>
              <button
                onClick={() => handleLang("en")}
                className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${lang === "en" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
              >
                EN
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Bell size={16} className="text-primary" />
              <span className="text-sm font-medium text-foreground">{t("settingsNotifications")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t("settingsEnableNotifications")}</span>
              <button
                onClick={() => handleNotif(!notifications)}
                className={`w-10 h-5 rounded-full transition-all relative ${notifications ? "bg-primary" : "bg-muted"}`}
              >
                <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${notifications ? "left-[22px]" : "left-[3px]"}`} />
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-primary" />
                <span className="text-sm font-medium text-foreground">{t("paymentCard")}</span>
              </div>
            </div>
            {cardSaved && !showCard ? (
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-500" />
                  <span className="text-sm font-mono text-foreground">{maskedCard}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowCard(true)} className="text-xs text-primary hover:underline">{t("editPlan")}</button>
                  <button onClick={handleRemoveCard} className="text-xs text-destructive hover:underline">{t("disconnect")}</button>
                </div>
              </div>
            ) : showCard ? (
              <div className="space-y-2">
                <input
                  value={cardData.number}
                  onChange={(e) => setCardData({ ...cardData, number: e.target.value.replace(/\D/g, "").replace(/(\d{4})/g, "$1 ").trim().slice(0, 19) })}
                  placeholder={t("cardNumber")}
                  maxLength={19}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    value={cardData.expiry}
                    onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                    placeholder={t("cardExpiry")}
                    maxLength={5}
                    className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors"
                  />
                  <input
                    value={cardData.cvv}
                    onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                    placeholder={t("cardCvv")}
                    maxLength={4}
                    type="password"
                    className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors"
                  />
                  <input
                    value={cardData.holder}
                    onChange={(e) => setCardData({ ...cardData, holder: e.target.value.toUpperCase() })}
                    placeholder={t("cardHolder")}
                    className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowCard(false)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">{t("cancel")}</button>
                  <button onClick={handleSaveCard} className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90">{t("save")}</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowCard(true)} className="w-full py-2.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
                {t("addCard")}
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-border">
            <button
              onClick={() => { logout(); navigate("/"); onClose(); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-destructive/20 text-destructive hover:bg-destructive/10 transition-colors text-sm font-medium"
            >
              <LogOut size={16} />
              {t("logout")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
