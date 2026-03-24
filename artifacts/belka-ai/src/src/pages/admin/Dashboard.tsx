import { useGetAdminStats } from "@workspace/api-client-react";
import { Users, MessageSquare, Zap, Network } from "lucide-react";
import { AdminLayout } from "./Layout";
import { ShinyText } from "@/components/ui-custom/ShinyText";
import { t } from "@/lib/i18n";

export default function AdminDashboard() {
  const { data, isLoading } = useGetAdminStats();

  const stats = [
    { label: t("totalUsers"), value: data?.totalUsers || "1,248", icon: Users, color: "text-blue-400" },
    { label: t("conversations"), value: data?.totalConversations || "8,439", icon: MessageSquare, color: "text-purple-400" },
    { label: t("activeAgents"), value: data?.activeAgents || "12", icon: Network, color: "text-green-400" },
    { label: t("tokensToday"), value: data?.tokensUsedToday ? (data.tokensUsedToday / 1000000).toFixed(1) + 'M' : "4.2M", icon: Zap, color: "text-yellow-400" },
  ];

  return (
    <AdminLayout>
      <div className="mb-8">
        <ShinyText as="h1" className="text-3xl sm:text-4xl font-display font-bold mb-2">{t("platformOverview")}</ShinyText>
        <p className="text-muted-foreground">{t("monitorMetrics")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="glass-panel p-6 rounded-2xl flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-muted border border-border">
                <stat.icon size={20} className={stat.color} />
              </div>
              <span className="text-muted-foreground text-sm font-medium">{stat.label}</span>
            </div>
            <div className="text-3xl font-display font-bold text-foreground">
              {isLoading ? "-" : stat.value}
            </div>
          </div>
        ))}
      </div>

      <div className="glass-panel p-8 rounded-2xl border border-border min-h-[400px] flex items-center justify-center">
        <p className="text-muted-foreground flex items-center gap-2">
          <Zap size={18} className="text-primary" />
          Analytics
        </p>
      </div>
    </AdminLayout>
  );
}
