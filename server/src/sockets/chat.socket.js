import Message from "../models/Message.model.js";

const chatSocket = (io, socket) => {
  socket.on("join_room", (roomId) => {
    socket.join(roomId);
  });

  socket.on("send_message", async (data) => {
    const message = await Message.create(data);

    io.to(data.roomId).emit("receive_message", message);
  });

  socket.on("typing", (data) => {
    socket.to(data.roomId).emit("typing", data.userId);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
};

export default chatSocket;
