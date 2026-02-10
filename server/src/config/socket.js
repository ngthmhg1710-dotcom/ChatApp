import { Server } from "socket.io";
import chatSocket from "../sockets/chat.socket.js";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    chatSocket(io, socket);
  });
};

export const getIO = () => io;
