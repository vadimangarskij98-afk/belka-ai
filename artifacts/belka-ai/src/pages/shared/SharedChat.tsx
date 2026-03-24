import { useState, useEffect, useMemo } from "react";
import { useParams } from "wouter";
import { Loader2, Globe, ExternalLink } from "lucide-react";
import { AgentAvatar } from "@/components/ui-custom/AgentAvatar";
import { CodeBlock } from "@/components/ui-custom/CodeBlock";
import { ImageDisplay } from "@/components/ui-custom/ImageDisplay";
import { ShinyText } from "@/components/ui-custom/ShinyText";
import { AgentRole } from "@workspace/api-client-react";

function parseContent(text: string) {
  const parts: { type: "text" | "code"; content: string; lang?: string }[] = [];
  const codeRegex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  while ((match = codeRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const t = text.slice(lastIndex, match.index).trim();
      if (t) parts.push({ type: "text", content: t });
    }
    parts.push({ type: "code", content: match[2].trim(), lang: match[1] || "text" });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    const t = text.slice(lastIndex).trim();
    if (t) parts.push({ type: "text", content: t });
  }
  return parts.length ? parts : [{ type: "text" as const, content: text }];
}

export default function SharedChat() {
  const params = useParams();
  const token = params.token;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!token) return;
    const BASE = import.meta.env.BASE_URL || "/";
    const API = `${BASE}api`.replace(/\/\/+/g, "/");

    fetch(`${API}/shared/${token}`)
      .then(res => {
        if (!res.ok) throw new Error("Link expired or not found");
        return res.json();
      })
      .then(data => {
        setConversation(data.conversation);
        setMessages(data.messages);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });

    const interval = setInterval(() => {
      const lastMsg = messages[messages.length - 1];
      const since = lastMsg?.createdAt || new Date(0).toISOString();
      fetch(`${API}/shared/${token}/poll?since=${since}`)
        .then(res => res.json())
        .then(data => {
          if (data.messages?.length > 0) {
            setMessages(prev => {
              const ids = new Set(prev.map(m => m.id));
              const newMsgs = data.messages.filter((m: any) => !ids.has(m.id));
              return [...prev, ...newMsgs];
            });
          }
        })
        .catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Ссылка недоступна</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="h-12 border-b border-border/50 flex items-center px-6 bg-background/80 backdrop-blur-md">
        <AgentAvatar role={AgentRole.coder} className="w-7 h-7 mr-2" />
        <span className="text-sm font-medium text-foreground">{conversation?.title || "Shared Chat"}</span>
        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20">Shared</span>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {messages.map((msg: any, i: number) => {
          const parts = parseContent(msg.content || "");
          const sources = msg.metadata?.sources || [];
          const imageUrl = msg.metadata?.image || null;

          return (
            <div key={msg.id || i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role !== 'user' && (
                <AgentAvatar role={msg.agentName === 'CODE REVIEWER' ? AgentRole.reviewer : AgentRole.coder} className="w-7 h-7 mt-0.5" />
              )}
              <div className={`max-w-[80%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.role !== 'user' && msg.agentName && (
                  <span className="text-[10px] font-semibold text-muted-foreground mb-0.5 ml-0.5 tracking-wider uppercase">{msg.agentName}</span>
                )}
                {sources.length > 0 && (
                  <div className="glass-panel px-3 py-2 rounded-2xl rounded-tl-sm mb-1 w-full">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Globe size={12} className="text-blue-400" />
                      <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Источники</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {sources.map((src: any, j: number) => (
                        <a key={j} href={src.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 hover:bg-blue-500/20 transition-colors max-w-[200px] truncate">
                          <ExternalLink size={10} />
                          <span className="truncate">{src.title || "Link"}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {imageUrl && <ImageDisplay url={imageUrl} />}
                {msg.role === 'user' ? (
                  <div className="px-3 py-2 rounded-2xl rounded-tr-sm bg-primary text-primary-foreground text-sm leading-relaxed shadow-lg shadow-primary/10">{msg.content}</div>
                ) : (
                  <div className="space-y-1 w-full">
                    {parts.map((part, idx) =>
                      part.type === "code" ? (
                        <CodeBlock key={idx} code={part.content} language={part.lang || "text"} />
                      ) : (
                        <div key={idx} className="glass-panel px-3 py-2 rounded-2xl rounded-tl-sm">
                          <ShinyText className="text-sm leading-relaxed whitespace-pre-wrap">{part.content}</ShinyText>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
