import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    roomId: String,
    senderId: String,
    content: String,
    type: {
      type: String,
      default: "text",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
