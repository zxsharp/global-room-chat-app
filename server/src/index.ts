import express from "express";
import { Server } from "socket.io";
import http from "http";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"]
  }
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("message:send", (data, cb) => {
    socket.broadcast.emit("message:new", {
      msg: data.msg
    });
    cb();
  });
});

server.listen(3000, () => console.log("Server running"));
