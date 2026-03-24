import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Sun, Moon, Globe, CreditCard, LogOut, Settings as SettingsIcon, Bell } from "lucide-react";
import { t, getLang, setLang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";

export default function SettingsPage() {
  const { theme: currentTheme, setTheme } = useTheme();
  const [currentLang, setCurrentLang] = useState(getLang);
  const [, forceUpdate] = useState(0);
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [showCard, setShowCard] = useState(false);
  const [cardData, setCardData] = useState({ number: "", expiry: "", cvv: "", holder: "" });
  const [notifications, setNotifications] = useState(true);

  const handleThemeChange = (theme: "dark" | "light") => {
    setTheme(theme);
  };

  const handleLangChange = (lang: "ru" | "en") => {
    setLang(lang);
    setCurrentLang(lang);
    forceUpdate(n => n + 1);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => navigate("/chat")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft size={16} />
          <span className="text-sm font-medium">{t("backToApp")}</span>
        </button>

        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon size={24} className="text-primary" />
          <h1 className="text-3xl font-display font-bold text-foreground">{t("settings")}</h1>
        </div>

        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Sun size={20} className="text-primary" />
              <h2 className="text-lg font-semibold text-foreground">{t("theme")}</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleThemeChange("light")}
                className={`flex items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all ${currentTheme === "light" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
              >
                <Sun size={20} />
                <span className="font-medium">{t("lightTheme")}</span>
              </button>
              <button
                onClick={() => handleThemeChange("dark")}
                className={`flex items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all ${currentTheme === "dark" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
              >
                <Moon size={20} />
                <span className="font-medium">{t("darkTheme")}</span>
              </button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Globe size={20} className="text-primary" />
              <h2 className="text-lg font-semibold text-foreground">{t("language")}</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleLangChange("ru")}
                className={`py-3 rounded-xl border-2 font-medium transition-all ${currentLang === "ru" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
              >
                RU
              </button>
              <button
                onClick={() => handleLangChange("en")}
                className={`py-3 rounded-xl border-2 font-medium transition-all ${currentLang === "en" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
              >
                EN
              </button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Bell size={20} className="text-primary" />
              <h2 className="text-lg font-semibold text-foreground">{t("settingsNotifications")}</h2>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("settingsEnableNotifications")}</span>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`w-11 h-6 rounded-full transition-all relative ${notifications ? "bg-primary" : "bg-muted"}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${notifications ? "left-6" : "left-1"}`} />
              </button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-panel rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <CreditCard size={20} className="text-primary" />
                <h2 className="text-lg font-semibold text-foreground">{t("paymentCard")}</h2>
              </div>
              {!showCard && (
                <button onClick={() => setShowCard(true)} className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
                  {t("addCard")}
                </button>
              )}
            </div>

            {showCard ? (
              <div className="space-y-4">
                <div className="w-full aspect-[1.586/1] max-w-sm mx-auto rounded-2xl bg-gradient-to-br from-primary via-secondary to-primary p-6 flex flex-col justify-between text-white shadow-2xl shadow-primary/30 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent" />
                  <div className="relative z-10">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium opacity-80">BELKA AI</span>
                      <svg width="40" height="28" viewBox="0 0 40 28" fill="none"><circle cx="14" cy="14" r="14" fill="#EB001B" fillOpacity="0.8"/><circle cx="26" cy="14" r="14" fill="#F79E1B" fillOpacity="0.8"/></svg>
                    </div>
                    <div className="w-10 h-7 rounded bg-yellow-300/30 border border-yellow-200/40 mt-4" />
                  </div>
                  <div className="relative z-10">
                    <div className="text-lg font-mono tracking-[0.2em] mb-3">
                      {cardData.number || ".... .... .... ...."}
                    </div>
                    <div className="flex justify-between text-xs opacity-80">
                      <span>{cardData.holder || t("cardHolder")}</span>
                      <span>{cardData.expiry || t("cardExpiry")}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 mt-4">
                  <input
                    value={cardData.number}
                    onChange={(e) => setCardData({ ...cardData, number: e.target.value.replace(/\D/g, "").replace(/(\d{4})/g, "$1 ").trim().slice(0, 19) })}
                    placeholder={t("cardNumber")}
                    maxLength={19}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors"
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      value={cardData.expiry}
                      onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                      placeholder={t("cardExpiry")}
                      maxLength={5}
                      className="px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors"
                    />
                    <input
                      value={cardData.cvv}
                      onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                      placeholder={t("cardCvv")}
                      maxLength={4}
                      type="password"
                      className="px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors"
                    />
                    <input
                      value={cardData.holder}
                      onChange={(e) => setCardData({ ...cardData, holder: e.target.value.toUpperCase() })}
                      placeholder={t("cardHolder")}
                      className="px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors"
                    />
                  </div>
                </div>
                <div className="flex gap-3 justify-end mt-2">
                  <button onClick={() => setShowCard(false)} className="px-4 py-2 text-muted-foreground hover:text-foreground text-sm">{t("cancel")}</button>
                  <button onClick={() => setShowCard(false)} className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 shadow-lg shadow-primary/20">{t("save")}</button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {currentLang === "ru" ? "Карта не привязана" : "No card linked"}
              </p>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-semibold text-foreground">{t("settingsCurrentPlan")}</span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 capitalize">{user?.plan || "free"}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{t("settingsUpgradeHint")}</p>
            <button onClick={() => navigate("/")} className="text-sm text-primary font-medium hover:underline">{t("settingsViewPlans")}</button>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-destructive/20 text-destructive hover:bg-destructive/10 transition-colors font-medium"
            >
              <LogOut size={18} />
              {t("logout")}
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
