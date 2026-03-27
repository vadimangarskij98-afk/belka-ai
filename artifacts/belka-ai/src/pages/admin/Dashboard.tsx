import { useState, useEffect } from "react";
import { Users, MessageSquare, Zap, Network, Gift, TrendingUp } from "lucide-react";
import { AdminLayout } from "./Layout";
import { ShinyText } from "@/components/ui-custom/ShinyText";
import { apiFetch, buildApiUrl } from "@/lib/api";
import { t } from "@/lib/i18n";

const API = buildApiUrl();

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [statsResponse, analyticsResponse] = await Promise.all([
          apiFetch(`${API}/admin/stats`),
          apiFetch(`${API}/admin/analytics`),
        ]);

        if (!statsResponse.ok || !analyticsResponse.ok) {
          throw new Error("Не удалось загрузить админ-метрики");
        }

        const [statsData, analyticsData] = await Promise.all([
          statsResponse.json(),
          analyticsResponse.json(),
        ]);

        setStats(statsData);
        setAnalytics(analyticsData.analytics || []);
      } catch (err) {
        setStats(null);
        setAnalytics([]);
        setError(err instanceof Error ? err.message : "Не удалось загрузить админ-метрики");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const statCards = [
    { label: t("totalUsers"), value: stats?.totalUsers || 0, icon: Users, color: "text-primary" },
    { label: t("conversations"), value: stats?.totalConversations || 0, icon: MessageSquare, color: "text-secondary" },
    { label: t("activeAgents"), value: stats?.activeAgents || 0, icon: Network, color: "text-primary" },
    { label: t("tokensToday"), value: stats?.tokensUsedToday || 0, icon: Zap, color: "text-[#F97316]" },
  ];

  const maxRequests = Math.max(...analytics.map((a) => a.requests), 1);

  return (
    <AdminLayout>
      <div className="mb-8">
        <ShinyText as="h1" className="mb-2 text-3xl font-display font-bold sm:text-4xl">
          {t("platformOverview")}
        </ShinyText>
        <p className="text-muted-foreground">{t("monitorMetrics")}</p>
        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <div key={i} className="glass-panel flex flex-col rounded-2xl p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg border border-border bg-muted p-2">
                <stat.icon size={20} className={stat.color} />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
            </div>
            <div className="text-3xl font-display font-bold text-foreground">{loading ? "-" : stat.value}</div>
          </div>
        ))}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass-panel rounded-2xl border border-border p-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" />
            <h3 className="font-semibold text-foreground">Запросы за 7 дней</h3>
          </div>
          <div className="flex h-40 items-end gap-1">
            {analytics.map((day, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="relative w-full overflow-hidden rounded-t-sm bg-primary/20"
                  style={{ height: `${Math.max(4, (day.requests / maxRequests) * 100)}%` }}
                >
                  <div className="absolute inset-0 rounded-t-sm bg-primary/60" />
                </div>
                <span className="text-[9px] text-muted-foreground">{day.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-border p-6">
          <div className="mb-4 flex items-center gap-2">
            <Gift size={18} className="text-secondary" />
            <h3 className="font-semibold text-foreground">Сводка</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3">
              <span className="text-sm text-muted-foreground">Промокодов</span>
              <span className="text-sm font-bold text-foreground">{stats?.totalPromoCodes || 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3">
              <span className="text-sm text-muted-foreground">Рефералов</span>
              <span className="text-sm font-bold text-foreground">{stats?.totalReferrals || 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3">
              <span className="text-sm text-muted-foreground">Сообщений всего</span>
              <span className="text-sm font-bold text-foreground">{stats?.totalMessages || 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3">
              <span className="text-sm text-muted-foreground">API вызовов сегодня</span>
              <span className="text-sm font-bold text-foreground">{stats?.apiCallsToday || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
