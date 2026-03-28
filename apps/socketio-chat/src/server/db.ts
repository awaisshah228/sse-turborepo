import crypto from "crypto";

// ═══════════════════════════════════════════════════════════════
// In-Memory DB — mimics a real database.
// In production, replace these Maps with actual DB queries.
// ═══════════════════════════════════════════════════════════════

export interface DBUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: number;
}

export interface DBSession {
  token: string;
  userId: string;
  expiresAt: number;
}

export interface DBGroup {
  id: string;
  name: string;
  createdBy: string;
  members: Set<string>; // userIds
  createdAt: number;
}

export interface DBMessage {
  id: string;
  from: string;      // userId
  message: string;
  timestamp: number;
  // Private messages
  toUserId?: string;
  // Group messages
  groupId?: string;
  groupName?: string;
}

const MAX_MESSAGES_PER_CONVERSATION = 200;

export const db = {
  users: new Map<string, DBUser>(),
  usersByUsername: new Map<string, DBUser>(),
  sessions: new Map<string, DBSession>(),
  groups: new Map<string, DBGroup>(),
  // Message storage: key = conversationId, value = messages[]
  // Private: conversationId = sorted pair "userId1:userId2"
  // Group: conversationId = "group:groupId"
  messages: new Map<string, DBMessage[]>(),
  // Read receipts: key = "userId:convoId", value = last read timestamp
  // Like WhatsApp: stores when user last opened each conversation
  readReceipts: new Map<string, number>(),
};

// ─── Message helpers ───

export function privateConvoId(userA: string, userB: string): string {
  return [userA, userB].sort().join(":");
}

export function groupConvoId(groupId: string): string {
  return `group:${groupId}`;
}

export function storeMessage(convoId: string, msg: DBMessage) {
  if (!db.messages.has(convoId)) {
    db.messages.set(convoId, []);
  }
  const messages = db.messages.get(convoId)!;
  messages.push(msg);
  // Cap per conversation
  if (messages.length > MAX_MESSAGES_PER_CONVERSATION) {
    messages.splice(0, messages.length - MAX_MESSAGES_PER_CONVERSATION);
  }
}

export function getMessages(convoId: string, limit = 50): DBMessage[] {
  const messages = db.messages.get(convoId) || [];
  return messages.slice(-limit);
}

// ─── Read receipt helpers ───

function readKey(userId: string, convoId: string): string {
  return `${userId}:${convoId}`;
}

export function markRead(userId: string, convoId: string): number {
  const now = Date.now();
  db.readReceipts.set(readKey(userId, convoId), now);
  return now;
}

export function getLastRead(userId: string, convoId: string): number {
  return db.readReceipts.get(readKey(userId, convoId)) || 0;
}

export function getUnreadCount(userId: string, convoId: string): number {
  const lastRead = getLastRead(userId, convoId);
  const messages = db.messages.get(convoId) || [];
  // Count messages after lastRead that aren't from this user
  return messages.filter(
    (m) => m.timestamp > lastRead && m.from !== userId
  ).length;
}

// ─── Password helpers ───

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// ─── Session helpers ───

export function createSession(userId: string): string {
  const token = crypto.randomUUID();
  db.sessions.set(token, {
    token,
    userId,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24h
  });
  return token;
}

export function validateSession(token: string): DBUser | null {
  const session = db.sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    db.sessions.delete(token);
    return null;
  }
  return db.users.get(session.userId) || null;
}

// ─── Seed data ───

export function seedDB() {
  const seedUsers = [
    { username: "alice", email: "alice@example.com" },
    { username: "bob", email: "bob@example.com" },
    { username: "charlie", email: "charlie@example.com" },
  ];

  for (const { username, email } of seedUsers) {
    const user: DBUser = {
      id: crypto.randomUUID(),
      username,
      email,
      passwordHash: hashPassword(username), // password = username for demo
      createdAt: Date.now(),
    };
    db.users.set(user.id, user);
    db.usersByUsername.set(username, user);
  }

  db.groups.set("general", {
    id: "general",
    name: "General",
    createdBy: "system",
    members: new Set(),
    createdAt: Date.now(),
  });

  db.groups.set("random", {
    id: "random",
    name: "Random",
    createdBy: "system",
    members: new Set(),
    createdAt: Date.now(),
  });
}
