import { AdminLayout } from "./Layout";
import { useListUsers } from "@workspace/api-client-react";
import { t } from "@/lib/i18n";

export default function AdminUsers() {
  const { data, isLoading } = useListUsers();

  const users: Array<{ id: string; email: string; username: string; role: string; plan: string; createdAt: string }> = data?.users || [
    { id: "1", email: "alex@example.com", username: "alex_dev", role: "admin", plan: "enterprise", createdAt: "2024-01-15" },
    { id: "2", email: "sarah@startup.io", username: "sarah_codes", role: "user", plan: "pro", createdAt: "2024-02-02" },
    { id: "3", email: "john@hobby.dev", username: "johnny", role: "user", plan: "free", createdAt: "2024-03-10" },
  ];

  const getPlanColor = (plan: string) => {
    switch(plan) {
      case 'enterprise': return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case 'pro': return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      default: return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20";
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">{t("users")}</h1>
        <p className="text-muted-foreground">{t("manageUsers")}</p>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-4 text-sm font-medium text-muted-foreground">{t("username")}</th>
                <th className="p-4 text-sm font-medium text-muted-foreground">{t("role")}</th>
                <th className="p-4 text-sm font-medium text-muted-foreground">{t("plan")}</th>
                <th className="p-4 text-sm font-medium text-muted-foreground">{t("joined")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-foreground">{user.username}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground capitalize">{user.role}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getPlanColor(user.plan)} capitalize`}>
                      {user.plan}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{user.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
