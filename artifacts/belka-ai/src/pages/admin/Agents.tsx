import { useState, useEffect, useCallback } from "react";
import { Bot, Loader2, Plus, RefreshCw, Save, ShieldAlert, ToggleLeft, ToggleRight, Trash2, X } from "lucide-react";
import { AdminLayout } from "./Layout";
import { AgentAvatar } from "@/components/ui-custom/AgentAvatar";
import { apiFetch, buildApiUrl, jsonHeaders } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/lib/i18n";

const API = buildApiUrl();

interface AgentData {
  id: string;
  name: string;
  description: string;
  role: string;
  systemPrompt?: string;
  capabilities?: string[];
  isActive: boolean;
  memoryEnabled?: boolean;
  modelId?: string;
}

export default function AdminAgents() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editAgent, setEditAgent] = useState<AgentData | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [capsAgent, setCapsAgent] = useState<AgentData | null>(null);
  const [capsList, setCapsList] = useState<string[]>([]);
  const [newCap, setNewCap] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch(`${API}/agents`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Could not load agents");
      }

      const data = await res.json();
      setAgents(data.agents || []);
    } catch (fetchError) {
      setAgents([]);
      setError(fetchError instanceof Error ? fetchError.message : "Could not load agents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAgents();
  }, [fetchAgents]);

  const savePrompt = async () => {
    if (!editAgent) return;

    setSaving(true);

    try {
      const res = await apiFetch(`${API}/agents/${editAgent.id}`, {
        method: "PUT",
        headers: jsonHeaders(),
        body: JSON.stringify({ systemPrompt: editPrompt }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Save failed");
      }

      setAgents((prev) => prev.map((agent) => (
        agent.id === editAgent.id ? { ...agent, systemPrompt: editPrompt } : agent
      )));
      setEditAgent(null);
      toast({
        title: "Prompt saved",
        description: `${editAgent.name} now uses the updated system prompt.`,
      });
    } catch (saveError) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: saveError instanceof Error ? saveError.message : "Could not save the prompt.",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveCaps = async () => {
    if (!capsAgent) return;

    setSaving(true);

    try {
      const res = await apiFetch(`${API}/agents/${capsAgent.id}`, {
        method: "PUT",
        headers: jsonHeaders(),
        body: JSON.stringify({ capabilities: capsList }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Save failed");
      }

      setAgents((prev) => prev.map((agent) => (
        agent.id === capsAgent.id ? { ...agent, capabilities: capsList } : agent
      )));
      setCapsAgent(null);
      toast({
        title: "Capabilities saved",
        description: `${capsAgent.name} was updated.`,
      });
    } catch (saveError) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: saveError instanceof Error ? saveError.message : "Could not save capabilities.",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (agent: AgentData) => {
    const nextState = !agent.isActive;

    try {
      const res = await apiFetch(`${API}/agents/${agent.id}`, {
        method: "PUT",
        headers: jsonHeaders(),
        body: JSON.stringify({ isActive: nextState }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Update failed");
      }

      setAgents((prev) => prev.map((item) => (
        item.id === agent.id ? { ...item, isActive: nextState } : item
      )));
      toast({
        title: nextState ? "Agent enabled" : "Agent disabled",
        description: agent.name,
      });
    } catch (toggleError) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: toggleError instanceof Error ? toggleError.message : "Could not update the agent.",
      });
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">{t("agents")}</h1>
          <p className="text-muted-foreground">{t("configureAgents")}</p>
        </div>
        <button
          onClick={() => void fetchAgents()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="glass-panel flex flex-col items-center justify-center gap-3 rounded-2xl border border-border px-6 py-16 text-center">
          <ShieldAlert className="h-8 w-8 text-destructive" />
          <div>
            <p className="font-semibold text-foreground">Could not load agents</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <button
            onClick={() => void fetchAgents()}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      ) : agents.length === 0 ? (
        <div className="glass-panel flex flex-col items-center justify-center gap-3 rounded-2xl border border-border px-6 py-16 text-center">
          <Bot className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-semibold text-foreground">No agents configured</p>
            <p className="text-sm text-muted-foreground">Seed or create agents to manage prompts and capabilities here.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {agents.map((agent) => (
            <div key={agent.id} className="glass-panel rounded-2xl p-6 transition-all hover:border-primary/20">
              <div className="mb-4 flex items-start gap-4">
                <AgentAvatar role={agent.role} className="w-12 h-12" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold tracking-tight text-foreground">{agent.name}</h3>
                    <button
                      onClick={() => void toggleActive(agent)}
                      className="ml-auto flex-shrink-0"
                      title={agent.isActive ? "Active" : "Inactive"}
                    >
                      {agent.isActive ? (
                        <ToggleRight size={22} className="text-green-500" />
                      ) : (
                        <ToggleLeft size={22} className="text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm font-medium uppercase tracking-wider text-primary/80">{agent.role}</p>
                </div>
              </div>

              <p className="mb-2 text-sm leading-relaxed text-muted-foreground">
                {agent.description || "No description provided for this agent yet."}
              </p>

              {agent.capabilities && agent.capabilities.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1">
                  {agent.capabilities.map((capability, index) => (
                    <span
                      key={`${agent.id}-${index}`}
                      className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary"
                    >
                      {capability}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditAgent(agent);
                    setEditPrompt(agent.systemPrompt || "");
                  }}
                  className="flex-1 rounded-lg bg-muted py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
                >
                  {t("editPrompt")}
                </button>
                <button
                  onClick={() => {
                    setCapsAgent(agent);
                    setCapsList(agent.capabilities || []);
                    setNewCap("");
                  }}
                  className="flex-1 rounded-lg bg-muted py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
                >
                  {t("capabilities")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editAgent && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setEditAgent(null)}>
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">{t("editPrompt")}</h2>
                <p className="text-sm text-muted-foreground">{editAgent.name}</p>
              </div>
              <button onClick={() => setEditAgent(null)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <textarea
                value={editPrompt}
                onChange={(event) => setEditPrompt(event.target.value)}
                rows={16}
                className="w-full resize-none rounded-xl border border-border bg-muted/50 p-4 font-mono text-sm leading-relaxed text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Enter the system prompt for this agent..."
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <button onClick={() => setEditAgent(null)} className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80">
                {t("cancel")}
              </button>
              <button onClick={savePrompt} disabled={saving} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {capsAgent && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setCapsAgent(null)}>
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">{t("capabilities")}</h2>
                <p className="text-sm text-muted-foreground">{capsAgent.name}</p>
              </div>
              <button onClick={() => setCapsAgent(null)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="mb-4 space-y-2">
                {capsList.map((capability, index) => (
                  <div key={`${capability}-${index}`} className="group flex items-center gap-2">
                    <span className="flex-1 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground">{capability}</span>
                    <button
                      onClick={() => setCapsList((prev) => prev.filter((_, currentIndex) => currentIndex !== index))}
                      className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-colors group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {capsList.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">No capabilities yet. Add the first one.</p>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  value={newCap}
                  onChange={(event) => setNewCap(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && newCap.trim()) {
                      setCapsList((prev) => [...prev, newCap.trim()]);
                      setNewCap("");
                    }
                  }}
                  placeholder="New capability..."
                  className="flex-1 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  onClick={() => {
                    if (newCap.trim()) {
                      setCapsList((prev) => [...prev, newCap.trim()]);
                      setNewCap("");
                    }
                  }}
                  className="rounded-lg bg-primary p-2 text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <button onClick={() => setCapsAgent(null)} className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80">
                {t("cancel")}
              </button>
              <button onClick={saveCaps} disabled={saving} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
