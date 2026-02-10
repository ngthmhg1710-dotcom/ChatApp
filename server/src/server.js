import http from "http";
import app from "./app.js";
import { initSocket } from "./config/socket.js";

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// init socket.io
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
