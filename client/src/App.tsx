import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const socket = io(import.meta.env.VITE_BACKEND_URL);

type ChatMessage = {
  id: string;
  content: string | null;
  username: string | null;
  createdAt: Date | string | null;
};

function App() {
  const [username, setUsername] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAll, setHasAll] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);
  const prevCount = useRef(0);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("connected", socket.id);
    });

    socket.on("user:username", ({ username }) => setUsername(username));

    socket.on("messages:recent", ({ messages }) => {
      const ordered = [...messages].reverse();
      setMessages(ordered);
      if (ordered.length) {
        const oldest = ordered[0];
        setCursor(oldest?.id ? parseInt(oldest.id) : null);
        setHasAll(ordered.length < 20);
      }
    });

    socket.on("message:new", (data: ChatMessage) => {
      setMessages((prev) => [...prev, { ...data, createdAt: data.createdAt ?? new Date().toISOString() }]);
    });

    return () => {
      socket.off("connect");
      socket.off("user:username");
      socket.off("messages:recent");
      socket.off("message:new");
    };
  }, []);

  useEffect(() => {
    if (!messages.length) return;
    if (!initialScrollDone.current) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "auto" });
      initialScrollDone.current = true;
      prevCount.current = messages.length;
      return;
    }
    if (messages.length > prevCount.current) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }
    prevCount.current = messages.length;
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    socket.emit("message:send", { content: message.trim(), username }, (ok: boolean) => {
      if (ok) setMessage("");
    });
  };

  const handleLoadMore = () => {
    if (isLoading || hasAll || !cursor) return;
    const container = listRef.current;
    const prevHeight = container?.scrollHeight ?? 0;
    const prevTop = container?.scrollTop ?? 0;

    setIsLoading(true);
    socket.emit("messages:load-more", { cursor }, (res: { success: boolean; messages: ChatMessage[] }) => {
      if (res.success && res.messages.length) {
        setMessages((prev) => [...res.messages, ...prev]);
        setCursor(Math.min(...res.messages.map((m) => parseInt(m.id))));
        if (res.messages.length < 20) setHasAll(true);
        requestAnimationFrame(() => {
          if (container) container.scrollTop = prevTop + (container.scrollHeight - prevHeight);
        });
      } else {
        setHasAll(true);
      }
      setIsLoading(false);
    });
  };

  const onScroll = () => {
    const container = listRef.current;
    if (container && container.scrollTop < 40) handleLoadMore();
  };

  const renderMessage = (msg: ChatMessage) => (
    <div key={msg.id} className="px-3 py-2 rounded-lg border border-border bg-card/30">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-semibold text-primary">{msg.username ?? "Anon"}</span>
        <span className="text-xs">
          {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ""}
        </span>
      </div>
      <div className="mt-1 text-sm text-foreground whitespace-pre-wrap wrap-break-word">
        {msg.content ?? ""}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl shadow-lg">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center justify-between text-lg">
            <span>Global Room Chat</span>
            <span className="text-sm text-muted-foreground">Hello <strong>{username + " !!" || "..."}</strong></span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex flex-col h-[70vh]">
          <div
            ref={listRef}
            onScroll={onScroll}
            className="flex-1 overflow-y-auto"
          >
            <div className="flex flex-col gap-2 p-4">
              {isLoading && <div className="text-center text-xs text-muted-foreground">Loading older messages…</div>}
              {messages.map(renderMessage)}
              <div ref={endRef} />
            </div>
          </div>
          <div className="border-t p-3 flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message…"
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <Button onClick={handleSend}>Send</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;