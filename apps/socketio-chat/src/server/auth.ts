import type { Express } from "express";
import type { Server } from "socket.io";
import crypto from "crypto";
import {
  db,
  hashPassword,
  verifyPassword,
  createSession,
  validateSession,
  type DBUser,
} from "./db";

// ═══════════════════════════════════════════════════════════════
// REST Auth Endpoints — mimic your real auth API
// ═══════════════════════════════════════════════════════════════

export function registerAuthRoutes(router: Express) {
  // POST /auth/register
  router.post("/auth/register", (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: "username, email, and password required" });
      return;
    }

    if (db.usersByUsername.has(username)) {
      res.status(409).json({ error: "Username already taken" });
      return;
    }

    const user: DBUser = {
      id: crypto.randomUUID(),
      username,
      email,
      passwordHash: hashPassword(password),
      createdAt: Date.now(),
    };
    db.users.set(user.id, user);
    db.usersByUsername.set(username, user);

    const token = createSession(user.id);
    res.json({ token, user: { id: user.id, username: user.username } });
  });

  // POST /auth/login
  router.post("/auth/login", (req, res) => {
    const { username, password } = req.body;

    const user = db.usersByUsername.get(username);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = createSession(user.id);
    res.json({ token, user: { id: user.id, username: user.username } });
  });

  // GET /auth/me
  router.get("/auth/me", (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      res.status(401).json({ error: "No token" });
      return;
    }

    const user = validateSession(token);
    if (!user) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    res.json({ id: user.id, username: user.username, email: user.email });
  });

  // GET /auth/users — list seeded users (demo convenience)
  router.get("/auth/users", (_req, res) => {
    const users = Array.from(db.users.values()).map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
    }));
    res.json(users);
  });
}

// ═══════════════════════════════════════════════════════════════
// Socket.IO Auth Middleware
// Validates token BEFORE connection. No token = no socket.
// Attaches userId + dbUser to socket.data so handlers use that.
// ═══════════════════════════════════════════════════════════════

export function registerSocketAuth(io: Server) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;

    if (!token) {
      return next(new Error("AUTH_REQUIRED: No token provided"));
    }

    const user = validateSession(token);
    if (!user) {
      return next(new Error("AUTH_INVALID: Invalid or expired token"));
    }

    // Attach to socket.data — the standard Socket.IO way.
    // Handlers read socket.data.userId, never trust client input.
    socket.data.userId = user.id;
    socket.data.dbUser = user;

    next();
  });
}
