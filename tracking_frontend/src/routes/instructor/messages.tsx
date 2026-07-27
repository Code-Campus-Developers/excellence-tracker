import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { Send, MessageCircle, Loader2, Users, Plus, Shield } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/PerfBadge";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/authStore";

export const Route = createFileRoute("/instructor/messages")({
  head: () => ({ meta: [{ title: "Messages | CodeCampus" }] }),
  component: InstructorMessages,
});

// ─── Types ───────────────────────────────────────────────────────────────────

interface ThreadSummary {
  otherId: string;
  other: { id: string; name: string; profilePicture: string | null };
  latest: { content: string; createdAt: string; senderId: string };
  unread: number;
}

interface Message {
  id: string; content: string; isRead: boolean; createdAt: string;
  senderId: string; receiverId: string;
  sender: { name: string; profilePicture: string | null };
}

interface Contact { id: string; name: string; role: string; track: string | null; profilePicture: string | null; }

function InstructorMessages() {
  const { user } = useAuth();

  const [inbox, setInbox] = useState<ThreadSummary[]>([]);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showContacts, setShowContacts] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchInbox = useCallback(async () => {
    try {
      const data = await api.get<ThreadSummary[]>("/api/messages/inbox");
      setInbox(data ?? []);
    } catch { /* silent */ }
  }, []);

  const fetchThread = useCallback(async (userId: string) => {
    try {
      const data = await api.get<Message[]>(`/api/messages/thread/${userId}`);
      setMessages(data ?? []);
      // refresh inbox to clear unread badges
      await fetchInbox();
    } catch { /* silent */ }
  }, [fetchInbox]);

  // initial inbox load
  useEffect(() => {
    fetchInbox().finally(() => setInboxLoading(false));
    const inboxPoll = setInterval(fetchInbox, 20_000);
    // Load contacts (admins) for "New Message" button
    api.get<Contact[]>("/api/messages/contacts").then(setContacts).catch(() => {});
    return () => clearInterval(inboxPoll);
  }, [fetchInbox]);

  // poll active thread
  useEffect(() => {
    if (!activeId) return;
    fetchThread(activeId);
    pollRef.current = setInterval(() => fetchThread(activeId), 15_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeId, fetchThread]);

  // scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openThread = async (userId: string) => {
    setActiveId(userId);
    setThreadLoading(true);
    setMessages([]);
    await fetchThread(userId);
    setThreadLoading(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !activeId) return;
    setSending(true);
    try {
      const msg = await api.post<Message>("/api/messages", {
        receiverId: activeId,
        content: text.trim(),
      });
      setMessages((prev) => [...prev, msg]);
      setText("");
      await fetchInbox();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const activePerson = inbox.find((t) => t.otherId === activeId)?.other
    ?? (activeId ? { id: activeId, name: "Student", profilePicture: null } : null);

  return (
    <AppShell>
      <h1 className="text-2xl font-bold mb-6">Messages</h1>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-180px)]">
        {/* ── Inbox sidebar ── */}
        <Card className="overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Conversations</p>
            {contacts.length > 0 && (
              <button onClick={() => setShowContacts((p) => !p)}
                className="h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center" title="Message admin">
                <Plus className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          {showContacts && contacts.length > 0 && (
            <div className="border-b bg-muted/30 px-3 py-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Start conversation</p>
              {contacts.map((c) => (
                <button key={c.id} onClick={() => { setActiveId(c.id); setShowContacts(false); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-background text-left">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-[10px] text-muted-foreground capitalize ml-auto">{c.role === "ADMIN" ? "Admin" : "Instructor"}</span>
                </button>
              ))}
            </div>
          )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {inboxLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : inbox.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground px-4 text-center">
                <Users className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No messages yet</p>
              </div>
            ) : (
              inbox.map((t) => (
                <button
                  key={t.otherId}
                  onClick={() => openThread(t.otherId)}
                  className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-0 text-left ${
                    activeId === t.otherId ? "bg-brand-soft" : ""
                  }`}
                >
                  {t.other.profilePicture ? (
                    <img src={t.other.profilePicture} alt={t.other.name}
                      className="h-9 w-9 rounded-full object-cover shrink-0 mt-0.5" />
                  ) : (
                    <Avatar name={t.other.name} color="#16a34a" size={36} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-sm font-medium truncate ${t.unread > 0 ? "font-bold" : ""}`}>
                        {t.other.name}
                      </span>
                      {t.unread > 0 && (
                        <Badge className="bg-brand text-brand-foreground text-[10px] h-4 px-1.5 shrink-0">
                          {t.unread}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {t.latest.senderId === user?.id ? "You: " : ""}{t.latest.content}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(t.latest.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* ── Thread pane ── */}
        <Card className="overflow-hidden flex flex-col">
          {!activeId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm">Select a conversation</p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="px-4 py-3 border-b flex items-center gap-3 shrink-0">
                {activePerson?.profilePicture ? (
                  <img src={activePerson.profilePicture} alt={activePerson.name}
                    className="h-8 w-8 rounded-full object-cover" />
                ) : activePerson ? (
                  <Avatar name={activePerson.name} color="#16a34a" size={32} />
                ) : null}
                <span className="font-semibold text-sm">{activePerson?.name}</span>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {threadLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <MessageCircle className="h-8 w-8 mb-2 opacity-30" />
                    <p className="text-sm">No messages in this thread yet.</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.senderId === user?.id;
                    return (
                      <div key={m.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                        {!isMe && activePerson && (
                          activePerson.profilePicture ? (
                            <img src={activePerson.profilePicture} alt={activePerson.name}
                              className="h-7 w-7 rounded-full object-cover shrink-0 mt-1" />
                          ) : (
                            <Avatar name={activePerson.name} color="#16a34a" size={28} />
                          )
                        )}
                        <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
                          <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                            isMe
                              ? "bg-brand text-brand-foreground rounded-tr-sm"
                              : "bg-muted border rounded-tl-sm"
                          }`}>
                            {m.content}
                          </div>
                          <span className="text-[10px] text-muted-foreground px-1">
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSend} className="flex gap-2 p-4 border-t shrink-0">
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type a message…"
                  className="flex-1"
                  autoComplete="off"
                />
                <Button
                  type="submit"
                  className="bg-brand text-brand-foreground hover:bg-brand/90 shrink-0"
                  disabled={sending || !text.trim()}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
