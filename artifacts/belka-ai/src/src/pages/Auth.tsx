import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import { ShinyText } from "@/components/ui-custom/ShinyText";
import { CodeBackground } from "@/components/ui-custom/CodeBackground";
import { t } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, register, loading } = useAuth();
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, username, password);
      }
      window.location.href = import.meta.env.BASE_URL + "chat";
    } catch (err: any) {
      setError(err.message || "Error");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <CodeBackground />

      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-100px] right-[-100px] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: "6s" }} />
        <div className="absolute bottom-[-100px] left-[-100px] w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: "10s" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4 shadow-lg shadow-primary/20"
          >
            B
          </motion.div>
          <ShinyText as="h1" className="text-3xl font-display font-bold">BELKA AI</ShinyText>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-panel rounded-2xl p-8 backdrop-blur-xl border border-border/50"
        >
          <div className="flex mb-6 rounded-xl overflow-hidden border border-border">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-3 text-sm font-semibold transition-all ${mode === "login" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t("login")}
            </button>
            <button
              onClick={() => setMode("register")}
              className={`flex-1 py-3 text-sm font-semibold transition-all ${mode === "register" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t("register")}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button className="flex items-center justify-center gap-2 py-3 rounded-xl border border-border hover:bg-muted transition-colors text-sm font-medium text-foreground">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t("google")}
            </button>
            <button className="flex items-center justify-center gap-2 py-3 rounded-xl border border-border hover:bg-muted transition-colors text-sm font-medium text-foreground">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              {t("telegram")}
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">{t("orContinueWith")}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("email")}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-background/80 backdrop-blur-sm text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors"
              />
            </div>

            {mode === "register" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t("username")}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-background/80 backdrop-blur-sm text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors"
                />
              </motion.div>
            )}

            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("password")}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-background/80 backdrop-blur-sm text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
            >
              {mode === "login" ? t("login") : t("register")}
              <ArrowRight size={16} />
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === "login" ? t("noAccount") : t("hasAccount")}{" "}
            <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="text-primary font-medium hover:underline">
              {mode === "login" ? t("register") : t("login")}
            </button>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
