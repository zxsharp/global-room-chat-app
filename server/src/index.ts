import express from "express";
import { Server } from "socket.io";
import http from "http";
import {getMessagesByPage, getRecentMessages, storeMessage} from "./db.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:5173", "http://localhost:5174"]
  }
});

io.on("connection", async (socket) => {
  console.log("Client connected:", socket.id);

  // send username
  const adjectives = ["Happy", "Quick", "Clever", "Brave", "Gentle", "Swift", "Bright", "Cool", "Smart", "Keen", "Nimble", "Bold", "Calm", "Fierce", "Graceful", "Mighty", "Noble", "Quiet", "Radiant", "Strong", "Vibrant", "Witty", "Zealous", "Agile", "Brilliant", "Creative", "Daring", "Energetic", "Friendly", "Glorious", "Honest", "Inspiring", "Jovial", "Kind", "Lively", "Magnificent", "Nice", "Optimistic", "Proud", "Quirky", "Resilient", "Serene", "Thoughtful", "Understanding", "Valiant", "Wise", "Youthful", "Zealful", "Adventurous", "Awesome"];
  const animals = ["Panda", "Eagle", "Tiger", "Dolphin", "Wolf", "Fox", "Lion", "Bear", "Monkey", "Rabbit", "Penguin", "Owl", "Whale", "Leopard", "Cheetah", "Kangaroo", "Koala", "Giraffe", "Zebra", "Elephant"];

  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)] ?? "neutral";
  const randomAnimal = animals[Math.floor(Math.random() * animals.length)] ?? "human";
  const username = randomAdjective + randomAnimal;

  socket.emit("user:username", { username });

  // fetch and send last recent messages
   try {
    const recentMessages = await getRecentMessages();
    socket.emit("messages:recent", { messages: recentMessages });
  } catch (error) {
    console.error("Error fetching recent messages:", error);
  }

  // handle pagination request
  socket.on("messages:load-more", async (data, callback) => {
    try {
      const { cursor} = data;
      const messages = await getMessagesByPage(cursor ? { id: cursor } : undefined);
      callback({ success: true, messages });
    } catch (error) {
      console.error("Error loading more messages:", error);
      callback({ success: false, messages: [] });
    }
  });

  socket.on("message:send", async (data, callback) => {
    
    if(await storeMessage(data.content, data.username)){
      callback(true);
      // Broadcasting to everyone including sender
      io.emit("message:new", {
        content: data.content,
        username: data.username,
        id: Date.now().toString()
      });
    }
    else{
      callback(false);
    }
    
  });
});

server.listen(3000, () => console.log("Server running"));
