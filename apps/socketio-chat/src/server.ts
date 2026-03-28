import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { seedDB, db } from "./server/db";
import { registerAuthRoutes, registerSocketAuth } from "./server/auth";
import { registerMessageRoutes } from "./server/messages";
import { registerHandlers } from "./server/handlers";
import { onlineSockets } from "./server/channels";

// ─── Bootstrap ───
const app = express();
app.use(cors({ origin: ["http://localhost:3003"] }));
app.use(express.json());
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3003"],
    methods: ["GET", "POST"],
  },
});

// ─── Initialize ───
seedDB();
registerAuthRoutes(app);
registerMessageRoutes(app);
registerSocketAuth(io);
registerHandlers(io);

// ─── Health check ───
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    connections: io.engine.clientsCount,
    registeredUsers: db.users.size,
    onlineUsers: onlineSockets.size,
    groups: db.groups.size,
    sessions: db.sessions.size,
  });
});

const PORT = parseInt(process.env.PORT || "3004", 10);
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on http://localhost:${PORT}`);
  console.log(`Auth: POST /auth/login, POST /auth/register`);
  console.log(`Seeded users: alice, bob, charlie (password = username)`);
});
