import type { Server } from "socket.io";
import { db, type DBUser } from "./db";

// ═══════════════════════════════════════════════════════════════
// Channel & Notification Helpers
//
// Channel = "user:<userId>" — auto-created from authenticated ID.
// No one can "create" a channel — it's derived from their DB ID.
// ═══════════════════════════════════════════════════════════════

let eventSeq = 0;

// ─── Online presence (supports multiple tabs per user) ───

export const onlineSockets = new Map<string, Set<string>>(); // userId -> Set<socketId>

export function addSocket(userId: string, socketId: string): boolean {
  if (!onlineSockets.has(userId)) {
    onlineSockets.set(userId, new Set());
  }
  onlineSockets.get(userId)!.add(socketId);
  return onlineSockets.get(userId)!.size === 1; // true if first connection
}

export function removeSocket(userId: string, socketId: string): boolean {
  const sockets = onlineSockets.get(userId);
  if (!sockets) return false;
  sockets.delete(socketId);
  if (sockets.size === 0) {
    onlineSockets.delete(userId);
    return true; // true if last connection (user fully offline)
  }
  return false;
}

export function getOnlineUsers(): { id: string; username: string }[] {
  const result: { id: string; username: string }[] = [];
  for (const [userId] of onlineSockets) {
    const user = db.users.get(userId);
    if (user) result.push({ id: user.id, username: user.username });
  }
  return result;
}

// ─── Channel addressing ───

export function userChannel(userId: string): string {
  return `user:${userId}`;
}

export function sendToUser(
  io: Server,
  userId: string,
  event: string,
  payload: unknown
) {
  io.to(userChannel(userId)).emit(event, payload);
}

export function notify(
  io: Server,
  userId: string,
  message: string,
  type: "info" | "success" | "warning" = "info"
) {
  sendToUser(io, userId, "channel:notification", {
    id: ++eventSeq,
    message,
    type,
    timestamp: Date.now(),
  });
}

export function notifyOnlineUsers(
  io: Server,
  message: string,
  type: "info" | "success" | "warning" = "info",
  excludeUserId?: string
) {
  for (const [userId] of onlineSockets) {
    if (userId === excludeUserId) continue;
    notify(io, userId, message, type);
  }
}

// ─── Serializers ───

export function serializeUser(user: DBUser) {
  return { id: user.id, username: user.username };
}

export function serializeGroup(groupId: string, forUserId?: string) {
  const group = db.groups.get(groupId);
  if (!group) return null;
  return {
    id: group.id,
    name: group.name,
    memberCount: group.members.size,
    joined: forUserId ? group.members.has(forUserId) : false,
  };
}
