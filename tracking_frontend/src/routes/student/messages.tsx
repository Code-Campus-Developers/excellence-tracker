import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { Send, MessageCircle, Loader2, UserCircle2, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/PerfBadge";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/authStore";
import { StudentShell } from "@/components/StudentShell";

export const Route = createFileRoute("/student/messages")({
  head: () => ({ meta: [{ title: "Messages | CodeCampus" }] }),
  component: StudentMessages,
});

interface Instructor { id: string; name: string; email: string; track: string | null; profilePicture: string | null; }
interface Message { id: string; content: string; isRead: boolean; createdAt: string; senderId: string; receiverId: string; sender: { name: string; profilePicture: string | null }; }

function StudentMessages() {
  const { user } = useAuth();
  const [instructor, setInstructor] = useState<Instructor | null | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.get<Instructor | null>("/api/messages/instructor").then(setInstructor).catch(() => setInstructor(null));
  }, []);

  const fetchThread = useCallback(async (id: string) => {
    try { setMessages((await api.get<Message[]>(`/api/messages/thread/${id}`)) ?? []); }
    catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (!instructor?.id) return;
    setLoadingThread(true);
    fetchThread(instructor.id).finally(() => setLoadingThread(false));
    pollRef.current = setInterval(() => fetchThread(instructor.id!), 15_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [instructor?.id, fetchThread]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !instructor) return;
    setSending(true);
    try {
      const msg = await api.post<Message>("/api/messages", { receiverId: instructor.id, content: text.trim() });
      setMessages((prev) => [...prev, msg]);
      setText("");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to send"); }
    finally { setSending(false); }
  };

  if (instructor === undefined) {
    return <StudentShell title="Messages"><div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></StudentShell>;
  }

  return (
    <StudentShell title="Messages">
      <div className="max-w-2xl flex flex-col gap-4">
        {!instructor ? (
          <Card><CardContent className="p-12 text-center"><UserCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><p className="font-semibold">No instructor assigned yet</p><p className="text-sm text-muted-foreground mt-1">An instructor for your track hasn't been set up yet.</p></CardContent></Card>
        ) : (
          <>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                {instructor.profilePicture ? <img src={instructor.profilePicture} alt={instructor.name} className="h-10 w-10 rounded-full object-cover shrink-0" /> : <Avatar name={instructor.name} color="#16a34a" size={40} />}
                <div>
                  <p className="font-semibold text-sm">{instructor.name}</p>
                  <p className="text-xs text-muted-foreground">{instructor.track} Track Instructor</p>
                </div>
                <div className="ml-auto"><span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Your instructor</span></div>
              </CardContent>
            </Card>

            <div className="flex flex-col min-h-0">
              <div className="overflow-y-auto space-y-3 py-2 min-h-[300px] max-h-[55vh]">
                {loadingThread ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><MessageCircle className="h-10 w-10 mb-2 opacity-30" /><p className="text-sm">No messages yet. Say hi!</p></div>
                ) : messages.map((m) => {
                  const isMe = m.senderId === user?.id;
                  return (
                    <div key={m.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                      {!isMe && (instructor.profilePicture ? <img src={instructor.profilePicture} alt={instructor.name} className="h-7 w-7 rounded-full object-cover shrink-0 mt-1" /> : <Avatar name={instructor.name} color="#16a34a" size={28} />)}
                      <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                        <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${isMe ? "bg-brand text-brand-foreground rounded-tr-sm" : "bg-background border rounded-tl-sm"}`}>{m.content}</div>
                        <span className="text-[10px] text-muted-foreground px-1">{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={handleSend} className="flex gap-2 mt-3">
                <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" className="flex-1" autoComplete="off" />
                <Button type="submit" className="bg-brand text-brand-foreground hover:bg-brand/90 shrink-0" disabled={sending || !text.trim()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </StudentShell>
  );
}
