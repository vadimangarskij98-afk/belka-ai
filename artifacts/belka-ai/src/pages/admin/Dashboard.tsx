import { useEffect, useMemo, useState } from "react";
import { Users, MessageSquare, Zap, Network, Gift, TrendingUp } from "lucide-react";
import { AdminLayout } from "./Layout";
import { ShinyText } from "@/components/ui-custom/ShinyText";
import { apiFetch, buildApiUrl } from "@/lib/api";

const API = buildApiUrl();

type StatsPayload = {
  totalUsers?: number;
  totalConversations?: number;
  activeAgents?: number;
  tokensUsedToday?: number;
  totalPromoCodes?: number;
  totalReferrals?: number;
  totalMessages?: number;
  apiCallsToday?: number;
};

type AnalyticsPoint = {
  date: string;
  requests: number;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsPoint[]>([]);
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
          throw new Error("Не удалось загрузить метрики админ-панели.");
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
        setError(err instanceof Error ? err.message : "Не удалось загрузить метрики админ-панели.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const statCards = useMemo(
    () => [
      { label: "Пользователи", value: stats?.totalUsers || 0, icon: Users, color: "text-primary" },
      { label: "Диалоги", value: stats?.totalConversations || 0, icon: MessageSquare, color: "text-secondary" },
      { label: "Активные агенты", value: stats?.activeAgents || 0, icon: Network, color: "text-primary" },
      { label: "Токены сегодня", value: stats?.tokensUsedToday || 0, icon: Zap, color: "text-[#F97316]" },
    ],
    [stats],
  );

  const maxRequests = Math.max(...analytics.map((item) => item.requests), 1);
  const hasAnalyticsData = analytics.some((item) => item.requests > 0);

  return (
    <AdminLayout>
      <div className="mb-8">
        <ShinyText as="h1" className="mb-2 text-3xl font-display font-bold sm:text-4xl">
          Обзор платформы
        </ShinyText>
        <p className="text-muted-foreground">
          Следите за ключевыми метриками, нагрузкой и состоянием продукта без лишнего шума.
        </p>
        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="glass-panel flex flex-col rounded-2xl p-6">
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

          {loading ? (
            <div className="flex h-40 items-end gap-1">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className="flex flex-1 flex-col items-center gap-1">
                  <div className="h-full w-full rounded-t-sm bg-primary/10" />
                  <span className="text-[9px] text-muted-foreground/60">--</span>
                </div>
              ))}
            </div>
          ) : hasAnalyticsData ? (
            <div className="flex h-40 items-end gap-1">
              {analytics.map((day) => (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-medium text-foreground/65">{day.requests}</span>
                  <div
                    className="relative w-full overflow-hidden rounded-t-sm border border-primary/15 bg-primary/10"
                    style={{ height: `${Math.max(24, (day.requests / maxRequests) * 100)}%` }}
                  >
                    <div className="absolute inset-0 rounded-t-sm bg-primary/70 shadow-[0_0_24px_rgba(44,143,70,0.18)]" />
                  </div>
                  <span className="text-[9px] text-muted-foreground">{day.date.slice(5)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 px-5 text-center text-sm leading-6 text-muted-foreground">
              Пока нет накопленной аналитики по запросам. Как только пользователи начнут работать с агентом, график
              заполнится автоматически.
            </div>
          )}
        </div>

        <div className="glass-panel rounded-2xl border border-border p-6">
          <div className="mb-4 flex items-center gap-2">
            <Gift size={18} className="text-secondary" />
            <h3 className="font-semibold text-foreground">Сводка</h3>
          </div>
          <div className="space-y-3">
            <SummaryRow label="Промокоды" value={stats?.totalPromoCodes || 0} />
            <SummaryRow label="Рефералы" value={stats?.totalReferrals || 0} />
            <SummaryRow label="Сообщения всего" value={stats?.totalMessages || 0} />
            <SummaryRow label="API-вызовы сегодня" value={stats?.apiCallsToday || 0} />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-bold text-foreground">{value}</span>
    </div>
  );
}
