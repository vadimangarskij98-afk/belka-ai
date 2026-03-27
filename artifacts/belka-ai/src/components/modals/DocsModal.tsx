import { useState } from "react";
import { X, BookOpen, Zap, Network, Mic, Github, Code2, HelpCircle, Keyboard, Layers, ShieldCheck, ChevronDown, ChevronRight, Search } from "lucide-react";
import { t, getLang } from "@/lib/i18n";

interface DocSection {
  icon: typeof BookOpen;
  color: string;
  titleKey: string;
  textKey: string;
}

const sections: DocSection[] = [
  { icon: BookOpen, color: "text-primary", titleKey: "docIntro", textKey: "docIntroText" },
  { icon: Zap, color: "text-green-400", titleKey: "docGettingStarted", textKey: "docGettingStartedText" },
  { icon: Layers, color: "text-yellow-400", titleKey: "docModes", textKey: "docModesText" },
  { icon: Network, color: "text-secondary", titleKey: "docAgents", textKey: "docAgentsText" },
  { icon: Mic, color: "text-orange-400", titleKey: "docVoice", textKey: "docVoiceText" },
  { icon: Github, color: "text-foreground", titleKey: "docGithub", textKey: "docGithubText" },
  { icon: Keyboard, color: "text-accent", titleKey: "docKeyboard", textKey: "docKeyboardText" },
  { icon: ShieldCheck, color: "text-emerald-400", titleKey: "docSecurity", textKey: "docSecurityText" },
];

const faqKeys = [
  { q: "docFAQ1Q", a: "docFAQ1A" },
  { q: "docFAQ2Q", a: "docFAQ2A" },
  { q: "docFAQ3Q", a: "docFAQ3A" },
  { q: "docFAQ4Q", a: "docFAQ4A" },
  { q: "docFAQ5Q", a: "docFAQ5A" },
  { q: "docFAQ6Q", a: "docFAQ6A" },
];

export function DocsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"docs" | "faq">("docs");
  const [searchQuery, setSearchQuery] = useState("");

  if (!open) return null;

  const isRu = getLang() === "ru";

  const filteredSections = searchQuery
    ? sections.filter(s => {
        const title = t(s.titleKey as any).toLowerCase();
        const text = t(s.textKey as any).toLowerCase();
        return title.includes(searchQuery.toLowerCase()) || text.includes(searchQuery.toLowerCase());
      })
    : sections;

  const filteredFaq = searchQuery
    ? faqKeys.filter(f => {
        const q = t(f.q as any).toLowerCase();
        const a = t(f.a as any).toLowerCase();
        return q.includes(searchQuery.toLowerCase()) || a.includes(searchQuery.toLowerCase());
      })
    : faqKeys;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Code2 size={20} className="text-primary" />
            <h2 className="text-lg font-semibold text-foreground">{t("documentation")}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pt-3 pb-2 border-b border-border space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isRu ? "Поиск в документации..." : "Search documentation..."}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors"
            />
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("docs")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === "docs" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            >
              {isRu ? "Разделы" : "Sections"}
            </button>
            <button
              onClick={() => setActiveTab("faq")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === "faq" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            >
              {t("docFAQ")}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {activeTab === "docs" && (
            <>
              {filteredSections.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-8">
                  {isRu ? "Ничего не найдено" : "No results found"}
                </div>
              )}
              {filteredSections.map((section) => (
                <div key={section.titleKey} className="rounded-xl border border-border bg-muted/20 p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-1.5 rounded-lg bg-muted border border-border">
                      <section.icon size={16} className={section.color} />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">{t(section.titleKey as any)}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-10">{t(section.textKey as any)}</p>
                </div>
              ))}
            </>
          )}

          {activeTab === "faq" && (
            <>
              {filteredFaq.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-8">
                  {isRu ? "Ничего не найдено" : "No results found"}
                </div>
              )}
              {filteredFaq.map((faq, idx) => (
                <div key={idx} className="rounded-xl border border-border overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                  >
                    <HelpCircle size={16} className="text-primary flex-shrink-0" />
                    <span className="text-sm font-medium text-foreground flex-1">{t(faq.q as any)}</span>
                    {expandedFaq === idx ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                  </button>
                  {expandedFaq === idx && (
                    <div className="px-4 pb-3 pl-11">
                      <p className="text-sm text-muted-foreground leading-relaxed">{t(faq.a as any)}</p>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
