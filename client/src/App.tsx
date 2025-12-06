import { useEffect, useState, useRef } from "react"
import { io } from "socket.io-client"

const socket = io(import.meta.env.VITE_BACKEND_URL);

function App() {

  const [message, setMessage] = useState<string>("");
   const [allMessages, setAllMessages] = useState<Array<{id: string; content: string; username: string; createdAt?: Date | string}>>([]);
  const [username, setUsername] = useState<string>("");
  const [cursor, setCursor] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAllMessages, setHasAllMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const previousMessageCountRef = useRef(0);

  // Scroll to bottom only on initial load and new messages
  useEffect(() => {
    if (isInitialLoadRef.current && allMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      isInitialLoadRef.current = false;
      previousMessageCountRef.current = allMessages.length;
    } else if (allMessages.length > previousMessageCountRef.current) {
      // Only auto-scroll when new messages arrive (count increases by small amount)
      if (allMessages.length - previousMessageCountRef.current < 5) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
      previousMessageCountRef.current = allMessages.length;
    }
  }, [allMessages]);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("connected with id:", socket.id);
    })

    socket.on("user:username", (data: {username: string}) => {
      setUsername(data.username);
    })

    socket.on("messages:recent", (data: {messages: Array<{id: string; content: string; username: string; createdAt: string}>}) => {
      setAllMessages(data.messages.reverse());
      if (data.messages.length > 0) {
        // Cursor should be the oldest message's id as number
        setCursor(parseInt(data.messages[data.messages.length - 1].id));
        // Check if we have all messages
        setHasAllMessages(data.messages.length < 20);
      }
    })

    socket.on("message:new", (data: {content: string; username: string; id: string}) => {
      setAllMessages((prev) => [...prev, {id: data.id, content: data.content, username: data.username, createdAt: new Date().toISOString()}])
    })

    return () => {
      socket.off("connect");
      socket.off("user:username");
      socket.off("messages:recent");
      socket.off("message:new");
    }
  }, [])

  function handleMessageSend() {
    socket.emit("message:send", {content: message, username: username}, (success: boolean) => {
      if (success) {
        setMessage("");
      } else {
        alert("unable to send message");
      }
    })
  }

  function handleLoadMore() {
    if (isLoading || !cursor || hasAllMessages) return;
    
    setIsLoading(true);
    socket.emit("messages:load-more", {cursor, limit: 20}, (response: {success: boolean; messages: Array<{id: string; content: string; username: string; createdAt: string}>}) => {
      if (response.success && response.messages.length > 0) {
        // Prepend older messages in correct order
        setAllMessages((prev) => [...response.messages, ...prev]);
        // Update cursor to the oldest message ID for next query
        setCursor(Math.min(...response.messages.map(m => parseInt(m.id))));
        // Check if we've loaded all messages
        if (response.messages.length < 20) {
          setHasAllMessages(true);
        }
      }
      setIsLoading(false);
    })
  }

  function handleScroll() {
    if (messagesContainerRef.current) {
      const { scrollTop } = messagesContainerRef.current;
      // Trigger load more when at top (with small threshold)
      if (scrollTop < 50) {
        handleLoadMore();
      }
    }
  }

  return (
    <div>
      <div ref={messagesContainerRef} onScroll={handleScroll} style={{height: "400px", overflowY: "auto", border: "1px solid #ccc", marginBottom: "10px"}}>
        {isLoading && <div style={{padding: "8px", textAlign: "center", color: "#999"}}>Loading more messages...</div>}
        {allMessages.map((msg, idx) => (
          <div key={idx} style={{padding: "8px", borderBottom: "1px solid #eee"}}>
            <div><strong>{msg.username}</strong> <span style={{color: "#666", fontSize: "12px"}}>{msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ''}</span></div>
            <div>{msg.content}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Enter message..." onKeyPress={(e) => e.key === 'Enter' && handleMessageSend()} />
      <button onClick={() => handleMessageSend()}>Send</button>
    </div>
  )
}

export default App