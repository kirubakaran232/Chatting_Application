import http from "http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { registerSockets } from "./sockets/index.js";

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: env.clientUrl, credentials: true }
});

app.set("io", io);
registerSockets(io);

await connectDb();

server.listen(env.port, () => {
  console.log(`API listening on ${env.port}`);
});
