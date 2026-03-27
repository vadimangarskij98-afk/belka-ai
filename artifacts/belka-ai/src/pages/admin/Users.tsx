import { useState } from "react";
import { useListUsers } from "@workspace/api-client-react";
import { Loader2, RefreshCw, ShieldAlert, Trash2, User as UserIcon } from "lucide-react";
import { AdminLayout } from "./Layout";
import { apiFetch, buildApiUrl, jsonHeaders } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/lib/i18n";

const API = buildApiUrl();

type AdminUser = {
  id: string;
  email: string;
  username: string;
  role: string;
  plan: string;
  createdAt: string;
};

export default function AdminUsers() {
  const { data, isLoading, error, refetch, isFetching } = useListUsers();
  const { toast } = useToast();
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const users: AdminUser[] = [...(data?.users ?? [])].sort((left, right) => {
    if (left.role !== right.role) return left.role === "admin" ? -1 : 1;
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "enterprise":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "pro":
        return "border-primary/20 bg-primary/10 text-primary dark:text-primary";
      default:
        return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20";
    }
  };

  const getRoleColor = (role: string) =>
    role === "admin"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";

  const updateUser = async (userId: string, route: "role" | "plan", payload: Record<string, string>) => {
    setPendingUserId(userId);

    try {
      const response = await apiFetch(`${API}/admin/users/${userId}/${route}`, {
        method: "PUT",
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Request failed");
      }

      await refetch();
      toast({
        title: route === "role" ? "User role updated" : "Subscription updated",
        description: route === "role" ? "The user permissions were saved." : "The user plan was saved.",
      });
    } catch (updateError) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: updateError instanceof Error ? updateError.message : "Could not update the user.",
      });
    } finally {
      setPendingUserId(null);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`Delete ${user.username}? This cannot be undone.`)) {
      return;
    }

    setPendingUserId(user.id);

    try {
      const response = await apiFetch(`${API}/admin/users/${user.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Delete failed");
      }

      await refetch();
      toast({
        title: "User deleted",
        description: `${user.username} was removed.`,
      });
    } catch (deleteError) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: deleteError instanceof Error ? deleteError.message : "Could not delete the user.",
      });
    } finally {
      setPendingUserId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">{t("users")}</h1>
          <p className="text-muted-foreground">{t("manageUsers")}</p>
        </div>
        <button
          onClick={() => void refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden border border-border">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <ShieldAlert className="h-8 w-8 text-destructive" />
            <div>
              <p className="font-semibold text-foreground">Could not load users</p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "Please try again."}
              </p>
            </div>
            <button
              onClick={() => void refetch()}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <UserIcon className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-semibold text-foreground">No users yet</p>
              <p className="text-sm text-muted-foreground">Registered users will appear here.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="p-4 text-sm font-medium text-muted-foreground">{t("username")}</th>
                  <th className="p-4 text-sm font-medium text-muted-foreground">{t("role")}</th>
                  <th className="p-4 text-sm font-medium text-muted-foreground">{t("plan")}</th>
                  <th className="p-4 text-sm font-medium text-muted-foreground">{t("joined")}</th>
                  <th className="p-4 text-right text-sm font-medium text-muted-foreground">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isPending = pendingUserId === user.id;

                  return (
                    <tr key={user.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-foreground">{user.username}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${getRoleColor(user.role)}`}>
                            {user.role}
                          </span>
                          <select
                            value={user.role}
                            disabled={isPending}
                            onChange={(event) => void updateUser(user.id, "role", { role: event.target.value })}
                            className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground"
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${getPlanColor(user.plan)}`}>
                            {user.plan}
                          </span>
                          <select
                            value={user.plan}
                            disabled={isPending}
                            onChange={(event) => void updateUser(user.id, "plan", { plan: event.target.value })}
                            className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground"
                          >
                            <option value="free">free</option>
                            <option value="pro">pro</option>
                            <option value="enterprise">enterprise</option>
                          </select>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => void handleDelete(user)}
                          disabled={isPending}
                          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
                        >
                          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
