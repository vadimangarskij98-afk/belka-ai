import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "./Layout";
import { AgentRole } from "@workspace/api-client-react";
import { AgentAvatar } from "@/components/ui-custom/AgentAvatar";
import { t } from "@/lib/i18n";
import { X, Save, Loader2, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

const BASE = import.meta.env.BASE_URL || "/";
const API = `${BASE}api`.replace(/\/\/+/g, "/");

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

function getToken(): string {
  try {
    const u = JSON.parse(localStorage.getItem("belka-user") || "{}");
    return u.token || "";
  } catch { return ""; }
}

export default function AdminAgents() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editAgent, setEditAgent] = useState<AgentData | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [capsAgent, setCapsAgent] = useState<AgentData | null>(null);
  const [capsList, setCapsList] = useState<string[]>([]);
  const [newCap, setNewCap] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch(`${API}/agents`);
      const data = await res.json();
      if (data.agents?.length) {
        setAgents(data.agents);
      } else {
        setAgents([
          { id: "1", name: "BELKA CODER", role: AgentRole.coder, description: "Основной агент-программист.", isActive: true, systemPrompt: "", capabilities: ["code_generation", "debugging", "refactoring"] },
          { id: "2", name: "CODE REVIEWER", role: AgentRole.reviewer, description: "Анализ кода на безопасность и производительность.", isActive: true, systemPrompt: "", capabilities: ["code_review", "security_audit"] },
          { id: "3", name: "SYSTEM ARCHITECT", role: AgentRole.orchestrator, description: "Проектирование системной архитектуры.", isActive: true, systemPrompt: "", capabilities: ["architecture", "planning"] },
          { id: "4", name: "UI DESIGNER", role: AgentRole.designer, description: "Фокус на фронтенд эстетике.", isActive: true, systemPrompt: "", capabilities: ["ui_design", "css", "responsive"] },
        ]);
      }
    } catch {
      setAgents([
        { id: "1", name: "BELKA CODER", role: AgentRole.coder, description: "Основной агент-программист.", isActive: true, systemPrompt: "", capabilities: ["code_generation", "debugging"] },
        { id: "2", name: "CODE REVIEWER", role: AgentRole.reviewer, description: "Анализ кода.", isActive: true, systemPrompt: "", capabilities: ["code_review"] },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const savePrompt = async () => {
    if (!editAgent) return;
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API}/agents/${editAgent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify({ systemPrompt: editPrompt }),
      });
      if (res.ok) {
        setAgents(prev => prev.map(a => a.id === editAgent.id ? { ...a, systemPrompt: editPrompt } : a));
        setEditAgent(null);
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  const saveCaps = async () => {
    if (!capsAgent) return;
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API}/agents/${capsAgent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify({ capabilities: capsList }),
      });
      if (res.ok) {
        setAgents(prev => prev.map(a => a.id === capsAgent.id ? { ...a, capabilities: capsList } : a));
        setCapsAgent(null);
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  const toggleActive = async (agent: AgentData) => {
    const token = getToken();
    const newActive = !agent.isActive;
    try {
      const res = await fetch(`${API}/agents/${agent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify({ isActive: newActive }),
      });
      if (res.ok) {
        setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, isActive: newActive } : a));
      }
    } catch { /* ignore */ }
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">{t("agents")}</h1>
        <p className="text-muted-foreground">{t("configureAgents")}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {agents.map(agent => (
            <div key={agent.id} className="glass-panel p-6 rounded-2xl hover:border-primary/20 transition-all">
              <div className="flex items-start gap-4 mb-4">
                <AgentAvatar role={agent.role} className="w-12 h-12" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-foreground tracking-tight">{agent.name}</h3>
                    <button
                      onClick={() => toggleActive(agent)}
                      className="ml-auto flex-shrink-0"
                      title={agent.isActive ? "Активен" : "Неактивен"}
                    >
                      {agent.isActive ? (
                        <ToggleRight size={22} className="text-green-500" />
                      ) : (
                        <ToggleLeft size={22} className="text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm font-medium text-primary/80 uppercase tracking-wider">{agent.role}</p>
                </div>
              </div>
              <p className="text-muted-foreground text-sm mb-2 leading-relaxed">
                {agent.description}
              </p>
              {agent.capabilities && agent.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {agent.capabilities.map((cap, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium uppercase tracking-wider">
                      {cap}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditAgent(agent); setEditPrompt(agent.systemPrompt || ""); }}
                  className="flex-1 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium text-foreground transition-colors"
                >
                  {t("editPrompt")}
                </button>
                <button
                  onClick={() => { setCapsAgent(agent); setCapsList(agent.capabilities || []); setNewCap(""); }}
                  className="flex-1 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium text-foreground transition-colors"
                >
                  {t("capabilities")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editAgent && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditAgent(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground">{t("editPrompt")}</h2>
                <p className="text-sm text-muted-foreground">{editAgent.name}</p>
              </div>
              <button onClick={() => setEditAgent(null)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <textarea
                value={editPrompt}
                onChange={e => setEditPrompt(e.target.value)}
                rows={16}
                className="w-full bg-muted/50 border border-border rounded-xl p-4 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono leading-relaxed"
                placeholder="Введите системный промпт для агента..."
              />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setEditAgent(null)} className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium text-foreground transition-colors">
                {t("cancel")}
              </button>
              <button onClick={savePrompt} disabled={saving} className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {capsAgent && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setCapsAgent(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground">{t("capabilities")}</h2>
                <p className="text-sm text-muted-foreground">{capsAgent.name}</p>
              </div>
              <button onClick={() => setCapsAgent(null)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="space-y-2 mb-4">
                {capsList.map((cap, i) => (
                  <div key={i} className="flex items-center gap-2 group">
                    <span className="flex-1 px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground">{cap}</span>
                    <button onClick={() => setCapsList(prev => prev.filter((_, idx) => idx !== i))} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {capsList.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Нет навыков. Добавьте первый.</p>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={newCap}
                  onChange={e => setNewCap(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && newCap.trim()) {
                      setCapsList(prev => [...prev, newCap.trim()]);
                      setNewCap("");
                    }
                  }}
                  placeholder="Новый навык..."
                  className="flex-1 px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  onClick={() => { if (newCap.trim()) { setCapsList(prev => [...prev, newCap.trim()]); setNewCap(""); } }}
                  className="p-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setCapsAgent(null)} className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium text-foreground transition-colors">
                {t("cancel")}
              </button>
              <button onClick={saveCaps} disabled={saving} className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50">
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
