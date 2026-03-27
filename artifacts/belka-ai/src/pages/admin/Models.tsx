import { useMemo, useState } from "react";
import { useAddModel, useDeleteModel, useListModels, AiModelProvider } from "@workspace/api-client-react";
import { BrainCircuit, Edit, Loader2, Plus, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import { AdminLayout } from "./Layout";
import { apiFetch, buildApiUrl, jsonHeaders } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/lib/i18n";

const API = buildApiUrl();

type ModelForm = {
  name: string;
  provider: AiModelProvider;
  modelId: string;
  apiKey: string;
  contextWindow: string;
  costPerToken: string;
};

const emptyForm: ModelForm = {
  name: "",
  provider: AiModelProvider.anthropic,
  modelId: "",
  apiKey: "",
  contextWindow: "",
  costPerToken: "",
};

export default function AdminModels() {
  const { data, isLoading, error, isFetching, refetch } = useListModels();
  const addMutation = useAddModel();
  const deleteMutation = useDeleteModel();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ModelForm>(emptyForm);

  const models = useMemo(() => data?.models ?? [], [data?.models]);

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setIsFormOpen(false);
  };

  const startAdd = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setIsFormOpen(true);
  };

  const startEdit = (model: any) => {
    setEditingId(model.id);
    setFormData({
      name: model.name || "",
      provider: model.provider as AiModelProvider,
      modelId: model.modelId || "",
      apiKey: "",
      contextWindow: model.contextWindow ? String(model.contextWindow) : "",
      costPerToken: model.costPerToken !== undefined && model.costPerToken !== null ? String(model.costPerToken) : "",
    });
    setIsFormOpen(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    const payload = {
      name: formData.name.trim(),
      provider: formData.provider,
      modelId: formData.modelId.trim(),
      ...(formData.apiKey.trim() ? { apiKey: formData.apiKey.trim() } : {}),
      ...(formData.contextWindow.trim() ? { contextWindow: Number(formData.contextWindow) } : {}),
      ...(formData.costPerToken.trim() ? { costPerToken: Number(formData.costPerToken) } : {}),
    };

    try {
      if (editingId) {
        const response = await apiFetch(`${API}/admin/models/${editingId}`, {
          method: "PUT",
          headers: jsonHeaders(),
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "Could not update the model.");
        }

        toast({
          title: "Model updated",
          description: `${payload.name} was saved.`,
        });
      } else {
        await addMutation.mutateAsync({ data: payload as any });
        toast({ title: t("modelAdded"), description: t("modelAddedDesc") });
      }

      resetForm();
      void refetch();
    } catch (saveError) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: saveError instanceof Error ? saveError.message : t("errorAddModel"),
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this model?")) return;

    try {
      await deleteMutation.mutateAsync({ id });
      toast({ title: t("modelDeleted") });
      void refetch();
    } catch {
      toast({ variant: "destructive", title: t("error"), description: t("errorDeleteModel") });
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">{t("aiModels")}</h1>
          <p className="text-muted-foreground">{t("manageModels")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="rounded-xl border border-border px-4 py-2 font-medium transition-colors hover:bg-muted disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-2">
              <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
              Refresh
            </span>
          </button>
          <button
            onClick={startAdd}
            className="rounded-xl bg-primary px-4 py-2 font-medium text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
          >
            <span className="inline-flex items-center gap-2">
              <Plus size={18} /> {t("addModel")}
            </span>
          </button>
        </div>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSave} className="glass-panel mb-8 space-y-4 rounded-2xl p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">{t("displayName")}</label>
              <input
                required
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-foreground transition-colors focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">{t("provider")}</label>
              <select
                value={formData.provider}
                onChange={(event) => setFormData({ ...formData, provider: event.target.value as AiModelProvider })}
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-foreground transition-colors focus:border-primary"
              >
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
                <option value="google">Google</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">{t("modelId")}</label>
              <input
                required
                value={formData.modelId}
                onChange={(event) => setFormData({ ...formData, modelId: event.target.value })}
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-foreground transition-colors focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">API key</label>
              <input
                value={formData.apiKey}
                onChange={(event) => setFormData({ ...formData, apiKey: event.target.value })}
                placeholder={editingId ? "Leave blank to keep current key" : "sk-..."}
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-foreground transition-colors focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Context window</label>
              <input
                type="number"
                min="0"
                value={formData.contextWindow}
                onChange={(event) => setFormData({ ...formData, contextWindow: event.target.value })}
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-foreground transition-colors focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Cost per token</label>
              <input
                type="number"
                min="0"
                step="0.000001"
                value={formData.costPerToken}
                onChange={(event) => setFormData({ ...formData, costPerToken: event.target.value })}
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-foreground transition-colors focus:border-primary"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button type="button" onClick={resetForm} className="px-4 py-2 text-muted-foreground hover:text-foreground">
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={addMutation.isPending}
              className="rounded-xl bg-primary px-6 py-2 font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {editingId ? "Save changes" : t("saveModel")}
            </button>
          </div>
        </form>
      )}

      <div className="glass-panel overflow-hidden rounded-2xl border border-border">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <ShieldAlert className="h-8 w-8 text-destructive" />
            <div>
              <p className="font-semibold text-foreground">Could not load models</p>
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
        ) : models.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <BrainCircuit className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-semibold text-foreground">No models configured</p>
              <p className="text-sm text-muted-foreground">Add the first AI model to make it available in admin tools.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="p-4 text-sm font-medium text-muted-foreground">{t("name")}</th>
                  <th className="p-4 text-sm font-medium text-muted-foreground">{t("provider")}</th>
                  <th className="p-4 text-sm font-medium text-muted-foreground">{t("modelId")}</th>
                  <th className="p-4 text-sm font-medium text-muted-foreground">{t("status")}</th>
                  <th className="p-4 text-right text-sm font-medium text-muted-foreground">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {models.map((model) => (
                  <tr key={model.id} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                    <td className="p-4 font-medium text-foreground">
                      <div>{model.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {model.contextWindow ? `${model.contextWindow.toLocaleString()} context` : "Context not set"}
                      </div>
                    </td>
                    <td className="p-4 capitalize text-muted-foreground">{model.provider}</td>
                    <td className="p-4 font-mono text-sm text-primary/80">{model.modelId}</td>
                    <td className="p-4">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${model.isActive ? "border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400" : "border-border bg-muted text-muted-foreground"}`}>
                        {model.isActive ? t("active") : "inactive"}
                      </span>
                    </td>
                    <td className="space-x-2 p-4 text-right">
                      <button onClick={() => startEdit(model)} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => void handleDelete(model.id)} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
