import { useState } from "react";
import { X, Sun, Moon, Globe, CreditCard, Bell, LogOut } from "lucide-react";
import { t, getLang, setLang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const [lang, setLangState] = useState(getLang);
  const [, forceUpdate] = useState(0);
  const [notifications, setNotifications] = useState(() => localStorage.getItem("belka-notif") !== "false");
  const [, navigate] = useLocation();

  if (!open) return null;

  const handleLang = (value: "ru" | "en") => {
    setLang(value);
    setLangState(value);
    forceUpdate((count) => count + 1);
  };

  const handleNotif = (value: boolean) => {
    setNotifications(value);
    localStorage.setItem("belka-notif", String(value));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-foreground">{t("settings")}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Sun size={16} className="text-primary" />
              <span className="text-sm font-medium text-foreground">{t("theme")}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTheme("light")}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium transition-all ${theme === "light" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
              >
                <Sun size={16} /> {t("lightTheme")}
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium transition-all ${theme === "dark" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
              >
                <Moon size={16} /> {t("darkTheme")}
              </button>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <Globe size={16} className="text-primary" />
              <span className="text-sm font-medium text-foreground">{t("language")}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleLang("ru")}
                className={`rounded-xl border-2 py-2.5 text-sm font-medium transition-all ${lang === "ru" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
              >
                RU
              </button>
              <button
                onClick={() => handleLang("en")}
                className={`rounded-xl border-2 py-2.5 text-sm font-medium transition-all ${lang === "en" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
              >
                EN
              </button>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <Bell size={16} className="text-primary" />
              <span className="text-sm font-medium text-foreground">{t("settingsNotifications")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t("settingsEnableNotifications")}</span>
              <button
                onClick={() => handleNotif(!notifications)}
                className={`relative h-5 w-10 rounded-full transition-all ${notifications ? "bg-primary" : "bg-muted"}`}
              >
                <div className={`absolute top-[3px] h-3.5 w-3.5 rounded-full bg-white transition-all ${notifications ? "left-[22px]" : "left-[3px]"}`} />
              </button>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-primary" />
                <span className="text-sm font-medium text-foreground">{t("paymentCard")}</span>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
              Платёжный провайдер пока не подключён в этом окружении. Данные карты больше не хранятся в браузере, а смена платных тарифов станет доступна только после полноценной billing-интеграции.
            </div>
          </div>

          <div className="border-t border-border pt-2">
            <button
              onClick={() => {
                logout();
                navigate("/");
                onClose();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/20 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
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
