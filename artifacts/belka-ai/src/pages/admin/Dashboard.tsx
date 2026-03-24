import { useState, useEffect } from "react";
import { Users, MessageSquare, Zap, Network, Gift, TrendingUp } from "lucide-react";
import { AdminLayout } from "./Layout";
import { ShinyText } from "@/components/ui-custom/ShinyText";
import { t } from "@/lib/i18n";

const BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
const API = `${BASE}/api`.replace(/\/\/+/g, "/");
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("belka-token");
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/admin/stats`, { headers: getAuthHeaders() }).then(r => r.json()),
      fetch(`${API}/admin/analytics`, { headers: getAuthHeaders() }).then(r => r.json()),
    ]).then(([statsData, analyticsData]) => {
      setStats(statsData);
      setAnalytics(analyticsData.analytics || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: t("totalUsers"), value: stats?.totalUsers || 0, icon: Users, color: "text-blue-400" },
    { label: t("conversations"), value: stats?.totalConversations || 0, icon: MessageSquare, color: "text-purple-400" },
    { label: t("activeAgents"), value: stats?.activeAgents || 0, icon: Network, color: "text-green-400" },
    { label: t("tokensToday"), value: stats?.tokensUsedToday || 0, icon: Zap, color: "text-yellow-400" },
  ];

  const maxRequests = Math.max(...analytics.map(a => a.requests), 1);

  return (
    <AdminLayout>
      <div className="mb-8">
        <ShinyText as="h1" className="text-3xl sm:text-4xl font-display font-bold mb-2">{t("platformOverview")}</ShinyText>
        <p className="text-muted-foreground">{t("monitorMetrics")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {statCards.map((stat, i) => (
          <div key={i} className="glass-panel p-6 rounded-2xl flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-muted border border-border">
                <stat.icon size={20} className={stat.color} />
              </div>
              <span className="text-muted-foreground text-sm font-medium">{stat.label}</span>
            </div>
            <div className="text-3xl font-display font-bold text-foreground">
              {loading ? "-" : stat.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="glass-panel p-6 rounded-2xl border border-border">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-primary" />
            <h3 className="font-semibold text-foreground">Запросов за 7 дней</h3>
          </div>
          <div className="flex items-end gap-1 h-40">
            {analytics.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-primary/20 rounded-t-sm relative overflow-hidden"
                  style={{ height: `${Math.max(4, (day.requests / maxRequests) * 100)}%` }}
                >
                  <div className="absolute inset-0 bg-primary/60 rounded-t-sm" />
                </div>
                <span className="text-[9px] text-muted-foreground">{day.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Gift size={18} className="text-secondary" />
            <h3 className="font-semibold text-foreground">Сводка</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-xl bg-muted/30">
              <span className="text-sm text-muted-foreground">Промокодов</span>
              <span className="text-sm font-bold text-foreground">{stats?.totalPromoCodes || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-muted/30">
              <span className="text-sm text-muted-foreground">Рефералов</span>
              <span className="text-sm font-bold text-foreground">{stats?.totalReferrals || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-muted/30">
              <span className="text-sm text-muted-foreground">Сообщений всего</span>
              <span className="text-sm font-bold text-foreground">{stats?.totalMessages || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-muted/30">
              <span className="text-sm text-muted-foreground">API вызовов сегодня</span>
              <span className="text-sm font-bold text-foreground">{stats?.apiCallsToday || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
