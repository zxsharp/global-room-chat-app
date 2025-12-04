import { useEffect, useState } from "react"
import { io } from "socket.io-client"

const socket = io(import.meta.env.BACKEND_URL);

function App() {

  const [message, setMessage] = useState<string>("");
  const [allMessages, setAllMessages] = useState<string[]>([]);
  
  useEffect(() => {
    socket.on("connect", () => {
      console.log("connected with id:", socket.id);
    })

    socket.on("message:new", (data: {msg: string}) => {
      setAllMessages((prev) => [...prev, data.msg])
    })

    return () => {
      socket.off("connect");
      socket.off("message:new");
    }
  }, [])

  function handleMessageSend() {
    socket.emit("message:send", {msg: message}, () => {
      setAllMessages((prev) => [...prev, message]);
    })
  }

  return (
    <div>
      <div>{allMessages}</div>
      <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} />
      <button onClick={() => handleMessageSend()}>Send</button>
    </div>
  )
}

export default App
