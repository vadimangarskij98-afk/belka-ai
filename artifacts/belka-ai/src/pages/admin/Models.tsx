import { useState } from "react";
import { AdminLayout } from "./Layout";
import { useListModels, useAddModel, useDeleteModel, AiModelProvider } from "@workspace/api-client-react";
import { Plus, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/lib/i18n";

export default function AdminModels() {
  const { data, isLoading, refetch } = useListModels();
  const addMutation = useAddModel();
  const deleteMutation = useDeleteModel();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: "", provider: AiModelProvider.anthropic, modelId: "" });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addMutation.mutateAsync({ data: formData as any });
      toast({ title: t("modelAdded"), description: t("modelAddedDesc") });
      setIsAdding(false);
      refetch();
    } catch (error) {
      toast({ variant: "destructive", title: t("error"), description: t("errorAddModel") });
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Удалить?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast({ title: t("modelDeleted") });
      refetch();
    } catch (error) {
      toast({ variant: "destructive", title: t("error"), description: t("errorDeleteModel") });
    }
  };

  const models = data?.models || [
    { id: "1", name: "Claude 3.5 Sonnet", provider: "anthropic", modelId: "claude-3-5-sonnet-20240620", isActive: true },
    { id: "2", name: "GPT-4o", provider: "openai", modelId: "gpt-4o", isActive: true },
    { id: "3", name: "Gemini 1.5 Pro", provider: "google", modelId: "gemini-1.5-pro", isActive: true },
  ];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">{t("aiModels")}</h1>
          <p className="text-muted-foreground">{t("manageModels")}</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-primary text-white rounded-xl font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
        >
          <Plus size={18} /> {t("addModel")}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="glass-panel p-6 rounded-2xl mb-8 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("displayName")}</label>
              <input
                required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full border border-border bg-background rounded-xl px-4 py-2 text-foreground focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("provider")}</label>
              <select
                value={formData.provider} onChange={e => setFormData({...formData, provider: e.target.value as any})}
                className="w-full border border-border bg-background rounded-xl px-4 py-2 text-foreground focus:border-primary transition-colors"
              >
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
                <option value="google">Google</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("modelId")}</label>
              <input
                required value={formData.modelId} onChange={e => setFormData({...formData, modelId: e.target.value})}
                className="w-full border border-border bg-background rounded-xl px-4 py-2 text-foreground focus:border-primary transition-colors"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-muted-foreground hover:text-foreground">{t("cancel")}</button>
            <button type="submit" disabled={addMutation.isPending} className="px-6 py-2 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90">{t("saveModel")}</button>
          </div>
        </form>
      )}

      <div className="glass-panel rounded-2xl overflow-hidden border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-4 text-sm font-medium text-muted-foreground">{t("name")}</th>
                <th className="p-4 text-sm font-medium text-muted-foreground">{t("provider")}</th>
                <th className="p-4 text-sm font-medium text-muted-foreground">{t("modelId")}</th>
                <th className="p-4 text-sm font-medium text-muted-foreground">{t("status")}</th>
                <th className="p-4 text-sm font-medium text-muted-foreground text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {models.map((model) => (
                <tr key={model.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium text-foreground">{model.name}</td>
                  <td className="p-4 text-muted-foreground capitalize">{model.provider}</td>
                  <td className="p-4 font-mono text-sm text-primary/80">{model.modelId}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">{t("active")}</span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(model.id)} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
