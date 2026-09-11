import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { Send, MessageCircle, Loader2, Users, Plus, Shield, Megaphone, CheckSquare, Square, Check, CheckCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar } from "@/components/PerfBadge";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/authStore";
import { TRACKS } from "@/lib/tracking";
import { getMessagingSocket } from "@/lib/messaging-socket";
import { formatChatTimestamp, formatLastSeen } from "@/lib/date-time";

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
  id: string; content: string; isRead: boolean; deliveredAt: string | null; readAt: string | null; createdAt: string;
  senderId: string; receiverId: string; supportStudentId?: string | null;
  sender: { name: string; role: string; profilePicture: string | null };
  reads: { readAt: string; user: { id: string; name: string; role: string } }[];
}

interface Contact { id: string; name: string; role: string; track: string | null; profilePicture: string | null; }

interface Broadcast { id: string; content: string; track: string; createdAt: string; instructor: { name: string; profilePicture: string | null }; }
interface TrackStudent { id: string; name: string; userId: string; studentCode: string; }

function InstructorMessages() {
  const { user } = useAuth();

  const [inbox, setInbox] = useState<ThreadSummary[]>([]);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [text, setText] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showContacts, setShowContacts] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const threadCacheRef = useRef(new Map<string, Message[]>());
  const threadRequestRef = useRef(0);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherOnline, setOtherOnline] = useState(false);
  const [otherLastSeen, setOtherLastSeen] = useState<string | null>(null);

  // Broadcast state
  const [activeTab, setActiveTab] = useState<"chats" | "broadcast">("chats");
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [broadcastText, setBroadcastText] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastTrack, setBroadcastTrack] = useState<string>("");
  const [trackStudents, setTrackStudents] = useState<TrackStudent[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [loadingStudents, setLoadingStudents] = useState(false);

  const fetchInbox = useCallback(async () => {
    try {
      const data = await api.get<ThreadSummary[]>("/api/messages/inbox");
      setInbox(data ?? []);
    } catch { /* silent */ }
  }, []);

  const fetchThread = useCallback(async (userId: string) => {
    const requestId = ++threadRequestRef.current;
    try {
      const data = await api.get<Message[]>(`/api/messages/thread/${userId}`);
      const nextMessages = data ?? [];
      threadCacheRef.current.set(userId, nextMessages);
      if (requestId === threadRequestRef.current) setMessages(nextMessages);
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void api.post(`/api/messages/thread/${userId}/read`, {}).then(() => fetchInbox()).catch(() => {});
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load conversation");
    }
  }, [fetchInbox]);

  // initial inbox load
  useEffect(() => {
    fetchInbox().finally(() => setInboxLoading(false));
    const inboxPoll = setInterval(fetchInbox, 60_000);
    api.get<Contact[]>("/api/messages/contacts").then(setContacts).catch(() => {});
    api.get<Broadcast[]>("/api/messages/broadcasts").then(setBroadcasts).catch(() => {});
    // For instructor: pre-load their track's students
    if (user?.role === "MENTOR" && user.track) {
      setBroadcastTrack(user.track);
    }
    return () => clearInterval(inboxPoll);
  }, [fetchInbox, user?.role, user?.track]);

  // Load students when broadcast track changes
  useEffect(() => {
    if (!broadcastTrack) { setTrackStudents([]); setSelectedUserIds(new Set()); return; }
    setLoadingStudents(true);
    api.get<TrackStudent[]>(`/api/messages/track-students?track=${encodeURIComponent(broadcastTrack)}`)
      .then((students) => {
        setTrackStudents(students);
        setSelectedUserIds(new Set(students.map((s) => s.userId))); // all selected by default
      })
      .catch(() => {})
      .finally(() => setLoadingStudents(false));
  }, [broadcastTrack]);

  // poll active thread
  useEffect(() => {
    if (!activeId) return;
    const cached = threadCacheRef.current.get(activeId);
    setMessages(cached ?? []);
    setThreadLoading(!cached);
    fetchThread(activeId).finally(() => setThreadLoading(false));
    pollRef.current = setInterval(() => fetchThread(activeId), 60_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeId, fetchThread]);

  useEffect(() => {
    const socket = getMessagingSocket();
    if (!socket) return;
    const refresh = () => fetchInbox();
    const onNewMessage = (message: Message) => {
      fetchInbox();
      if (message.senderId === activeId || message.receiverId === activeId) {
        setMessages((previous) => previous.some((item) => item.id === message.id) ? previous : [...previous, message]);
        if (message.senderId === activeId && document.visibilityState === "visible") {
          api.post(`/api/messages/thread/${activeId}/read`, {}).catch(() => {});
        }
      }
    };
    const onRead = ({ messageIds, readAt, reader }: { messageIds: string[]; readAt: string; reader?: { id: string; name: string; role: string } }) => {
      const ids = new Set(messageIds);
      setMessages((previous) => previous.map((message) => {
        if (!ids.has(message.id)) return message;
        const reads = reader && !message.reads.some((receipt) => receipt.user.id === reader.id)
          ? [...message.reads, { readAt, user: reader }]
          : message.reads;
        return { ...message, isRead: true, deliveredAt: message.deliveredAt ?? readAt, readAt: message.readAt ?? readAt, reads };
      }));
    };
    const onDelivered = ({ messageIds, deliveredAt }: { messageIds: string[]; deliveredAt: string }) => {
      const ids = new Set(messageIds);
      setMessages((previous) => previous.map((message) => ids.has(message.id) ? { ...message, deliveredAt } : message));
    };
    const onTyping = ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      if (userId === activeId) setOtherTyping(isTyping);
    };
    const onPresence = ({ userId, online, lastSeenAt }: { userId: string; online: boolean; lastSeenAt?: string | null }) => {
      if (userId === activeId) {
        setOtherOnline(online);
        if (lastSeenAt) setOtherLastSeen(lastSeenAt);
      }
    };
    socket.on("message:new", onNewMessage);
    socket.on("messages:read", onRead);
    socket.on("messages:delivered", onDelivered);
    socket.on("messages:unread-changed", refresh);
    socket.on("typing", onTyping);
    socket.on("presence:changed", onPresence);
    if (activeId) {
      setOtherTyping(false);
      socket.emit("presence:details", activeId, (status: { online: boolean; lastSeenAt: string | null }) => {
        setOtherOnline(status.online);
        setOtherLastSeen(status.lastSeenAt);
      });
    }
    return () => {
      socket.off("message:new", onNewMessage);
      socket.off("messages:read", onRead);
      socket.off("messages:delivered", onDelivered);
      socket.off("messages:unread-changed", refresh);
      socket.off("typing", onTyping);
      socket.off("presence:changed", onPresence);
    };
  }, [activeId, fetchInbox]);

  useEffect(() => {
    const markVisibleMessagesRead = () => {
      if (activeId && document.visibilityState === "visible") {
        api.post(`/api/messages/thread/${activeId}/read`, {}).then(fetchInbox).catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", markVisibleMessagesRead);
    return () => document.removeEventListener("visibilitychange", markVisibleMessagesRead);
  }, [activeId, fetchInbox]);

  // scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openThread = (userId: string) => {
    if (userId === activeId) return;
    const cached = threadCacheRef.current.get(userId);
    setMessages(cached ?? []);
    setThreadLoading(!cached);
    setActiveId(userId);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !activeId) return;
    const receiverId = activeId;
    const content = text.trim();
    const pendingId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const pendingMessage: Message = {
      id: pendingId,
      content,
      isRead: false,
      deliveredAt: null,
      readAt: null,
      createdAt: new Date().toISOString(),
      senderId: user?.id ?? "",
      receiverId,
      sender: { name: user?.name ?? "You", role: user?.role ?? "MENTOR", profilePicture: user?.profilePicture ?? null },
      reads: [],
    };

    setText("");
    setMessages((previous) => [...previous, pendingMessage]);
    getMessagingSocket()?.emit("typing", { receiverId, isTyping: false });
    try {
      const msg = await api.post<Message>("/api/messages", {
        receiverId,
        content,
      });
      setMessages((previous) => {
        const withoutPending = previous.filter((message) => message.id !== pendingId);
        return withoutPending.some((message) => message.id === msg.id) ? withoutPending : [...withoutPending, msg];
      });
      void fetchInbox();
    } catch (err) {
      setMessages((previous) => previous.filter((message) => message.id !== pendingId));
      setText((current) => current || content);
      toast.error(err instanceof Error ? err.message : "Failed to send");
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;
    if (!broadcastTrack) { toast.error("Select a course first"); return; }
    if (selectedUserIds.size === 0) { toast.error("Select at least one student"); return; }
    setSendingBroadcast(true);
    try {
      const allSelected = selectedUserIds.size === trackStudents.length;
      const b = await api.post<Broadcast>("/api/messages/broadcast", {
        content: broadcastText.trim(),
        track: broadcastTrack,
        targetUserIds: allSelected ? [] : Array.from(selectedUserIds),
      });
      setBroadcasts((prev) => [b, ...prev]);
      setBroadcastText("");
      toast.success(`Broadcast sent to ${selectedUserIds.size} student(s)!`);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to send broadcast"); }
    finally { setSendingBroadcast(false); }
  };

  const activePerson = inbox.find((t) => t.otherId === activeId)?.other
    ?? contacts.find((contact) => contact.id === activeId)
    ?? (activeId ? { id: activeId, name: "Contact", profilePicture: null } : null);

  const handleTyping = (value: string) => {
    setText(value);
    if (!activeId) return;
    const socket = getMessagingSocket();
    socket?.emit("typing", { receiverId: activeId, isTyping: true });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => socket?.emit("typing", { receiverId: activeId, isTyping: false }), 1200);
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold mb-4">Messages</h1>

      {/* Tab toggle */}
      <div className="flex rounded-lg overflow-hidden border w-fit mb-4">
        <button onClick={() => setActiveTab("chats")} className={`px-4 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors ${activeTab === "chats" ? "bg-brand text-brand-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>
          <MessageCircle className="h-3.5 w-3.5" /> Chats
        </button>
        <button onClick={() => setActiveTab("broadcast")} className={`px-4 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors ${activeTab === "broadcast" ? "bg-brand text-brand-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>
          <Megaphone className="h-3.5 w-3.5" /> Broadcast
        </button>
      </div>

      {activeTab === "broadcast" ? (
        <div className="max-w-2xl space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2"><Megaphone className="h-4 w-4 text-brand" /> Send Broadcast</p>

              {/* Track selector — admin sees dropdown, instructor sees their track */}
              {user?.role === "ADMIN" ? (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Select Course</label>
                  <Select value={broadcastTrack} onValueChange={setBroadcastTrack}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Pick a course…" /></SelectTrigger>
                    <SelectContent>{TRACKS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Course: <span className="font-medium text-foreground">{broadcastTrack || user?.track || "—"}</span></p>
              )}

              {/* Student checklist */}
              {broadcastTrack && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-muted-foreground">Select Students</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setSelectedUserIds(new Set(trackStudents.map((s) => s.userId)))} className="text-[10px] text-brand hover:underline flex items-center gap-0.5"><CheckSquare className="h-3 w-3" /> All</button>
                      <button type="button" onClick={() => setSelectedUserIds(new Set())} className="text-[10px] text-muted-foreground hover:underline flex items-center gap-0.5"><Square className="h-3 w-3" /> None</button>
                    </div>
                  </div>
                  {loadingStudents ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                  ) : trackStudents.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">No students on this course.</p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto border rounded-md divide-y">
                      {trackStudents.map((s) => {
                        const checked = selectedUserIds.has(s.userId);
                        return (
                          <label key={s.userId} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-muted/50 select-none">
                            <input type="checkbox" checked={checked} onChange={() => {
                              setSelectedUserIds((prev) => {
                                const next = new Set(prev);
                                checked ? next.delete(s.userId) : next.add(s.userId);
                                return next;
                              });
                            }} className="h-4 w-4 rounded accent-brand" />
                            <span className="text-sm flex-1">{s.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{s.studentCode}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleBroadcast} className="flex gap-2">
                <Input value={broadcastText} onChange={(e) => setBroadcastText(e.target.value)} placeholder="Type your message…" className="flex-1" />
                <Button type="submit" disabled={sendingBroadcast || !broadcastText.trim() || selectedUserIds.size === 0} className="bg-brand text-brand-foreground hover:bg-brand/90 gap-1.5 shrink-0">
                  {sendingBroadcast ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send {selectedUserIds.size > 0 ? `(${selectedUserIds.size})` : ""}
                </Button>
              </form>
            </CardContent>
          </Card>
          <div className="space-y-2">
            {broadcasts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No broadcasts sent yet.</p>
            ) : broadcasts.map((b) => (
              <Card key={b.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={b.instructor.name} color="#16a34a" size={32} photo={b.instructor.profilePicture} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold">{b.instructor.name}</span>
                        <span className="text-[10px] bg-brand-soft text-brand px-1.5 py-0.5 rounded-full">Broadcast</span>
                        <span className="text-xs text-muted-foreground ml-auto">{formatChatTimestamp(b.createdAt)}</span>
                      </div>
                      <p className="text-sm">{b.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-220px)]">
        {/* ── Inbox sidebar ── */}
        <Card className="overflow-hidden flex flex-col">
          <div className="shrink-0 min-h-0 flex flex-col">
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
            <div className="border-b bg-muted/30 px-3 py-2 max-h-[50vh] md:max-h-[calc(100vh-330px)] overflow-y-auto overscroll-contain">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Start conversation</p>
              {contacts.map((c) => (
                <button key={c.id} onClick={() => { void openThread(c.id); setShowContacts(false); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-background text-left">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-[10px] text-muted-foreground capitalize ml-auto">{c.role === "ADMIN" ? "Admin" : c.role === "MENTOR" ? "Instructor" : "Student"}</span>
                </button>
              ))}
            </div>
          )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
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
                      {formatChatTimestamp(t.latest.createdAt)}
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
                <div>
                  <span className="font-semibold text-sm block">{activePerson?.name}</span>
                  <span className={`text-[10px] ${otherTyping ? "text-brand" : "text-muted-foreground"}`}>
                    {otherTyping ? "typing…" : otherOnline ? "online" : formatLastSeen(otherLastSeen)}
                  </span>
                </div>
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
                        {!isMe && (
                          m.sender.profilePicture ? (
                            <img src={m.sender.profilePicture} alt={m.sender.name}
                              className="h-7 w-7 rounded-full object-cover shrink-0 mt-1" />
                          ) : (
                            <Avatar name={m.sender.name} color="#16a34a" size={28} />
                          )
                        )}
                        <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
                          {!isMe && (
                            <span className="text-[10px] font-medium text-muted-foreground px-1">
                              {m.sender.name}{m.sender.role === "ADMIN" ? " · Admin" : m.sender.role === "MENTOR" ? " · Instructor" : ""}
                            </span>
                          )}
                          <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                            isMe
                              ? "bg-brand text-brand-foreground rounded-tr-sm"
                              : "bg-muted border rounded-tl-sm"
                          }`}>
                            {m.content}
                          </div>
                          <span className="text-[10px] text-muted-foreground px-1 inline-flex items-center gap-1">
                            {formatChatTimestamp(m.createdAt)}
                            {isMe && ((m.reads?.length ?? 0) > 0 || m.readAt
                              ? <CheckCheck className="h-3 w-3 text-brand" aria-label="Seen" />
                              : m.deliveredAt
                                ? <CheckCheck className="h-3 w-3" aria-label="Delivered" />
                                : <Check className="h-3 w-3" aria-label="Sent" />)}
                          </span>
                          {isMe && m.reads?.length > 0 && (
                            <span className="text-[9px] text-muted-foreground px-1">
                              Seen by {m.reads.map((receipt) => receipt.user.name).join(", ")}
                            </span>
                          )}
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
                  onChange={(e) => handleTyping(e.target.value)}
                  placeholder="Type a message…"
                  className="flex-1"
                  autoComplete="off"
                />
                <Button
                  type="submit"
                  className="bg-brand text-brand-foreground hover:bg-brand/90 shrink-0"
                  disabled={!text.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
      )} {/* end chats tab */}
    </AppShell>
  );
}
