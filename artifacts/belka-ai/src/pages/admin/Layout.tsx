import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Box, Users, CreditCard, Network, ArrowLeft, Mic, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

const navItems = [
  { href: "/admin", icon: LayoutDashboard, labelKey: "dashboard" as const },
  { href: "/admin/models", icon: Box, labelKey: "aiModels" as const },
  { href: "/admin/agents", icon: Network, labelKey: "agents" as const },
  { href: "/admin/users", icon: Users, labelKey: "users" as const },
  { href: "/admin/subscriptions", icon: CreditCard, labelKey: "subscriptions" as const },
  { href: "/admin/referrals", icon: Gift, labelKey: "referralSettings" as const },
  { href: "/admin/voice", icon: Mic, labelKey: "voiceAssistant" as const },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background flex">
      <div className="w-64 border-r border-border/50 bg-sidebar h-screen sticky top-0 flex flex-col hidden md:flex">
        <div className="p-6">
          <Link href="/chat" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 group transition-colors">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">{t("backToApp")}</span>
          </Link>
          <div className="font-display font-bold text-xl text-foreground mb-6">
            {t("adminPanel")}
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all font-medium text-sm",
                    isActive
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}>
                    <item.icon size={18} />
                    {t(item.labelKey)}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="md:hidden mb-4">
            <Link href="/chat" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={16} />
              <span className="text-sm font-medium">{t("backToApp")}</span>
            </Link>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
