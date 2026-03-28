import type { Express } from "express";
import {
  db,
  validateSession,
  getMessages,
  privateConvoId,
  groupConvoId,
} from "./db";

// ═══════════════════════════════════════════════════════════════
// REST Message API — history & conversations
//
// Real-time delivery = Socket.IO
// History / bulk data = REST API
// ═══════════════════════════════════════════════════════════════

function authenticate(req: { headers: { authorization?: string } }) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return null;
  return validateSession(token);
}

export function registerMessageRoutes(router: Express) {
  // GET /api/messages/private/:userId?limit=50
  // Fetch private message history with a specific user
  router.get("/api/messages/private/:userId", (req, res) => {
    const me = authenticate(req);
    if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }

    const partnerId = req.params.userId;
    const partner = db.users.get(partnerId);
    if (!partner) { res.status(404).json({ error: "User not found" }); return; }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const convoId = privateConvoId(me.id, partnerId);
    const messages = getMessages(convoId, limit);

    const serialized = messages.map((m) => {
      const sender = db.users.get(m.from);
      return {
        id: m.id,
        from: sender
          ? { id: sender.id, username: sender.username }
          : { id: m.from, username: "unknown" },
        toUserId: m.toUserId,
        toUsername: m.toUserId ? db.users.get(m.toUserId)?.username : undefined,
        message: m.message,
        timestamp: m.timestamp,
      };
    });

    res.json({ convoId, messages: serialized });
  });

  // GET /api/messages/group/:groupId?limit=50
  // Fetch group message history
  router.get("/api/messages/group/:groupId", (req, res) => {
    const me = authenticate(req);
    if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }

    const groupId = req.params.groupId;
    const group = db.groups.get(groupId);
    if (!group) { res.status(404).json({ error: "Group not found" }); return; }
    if (!group.members.has(me.id)) { res.status(403).json({ error: "Not a member" }); return; }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const convoId = groupConvoId(groupId);
    const messages = getMessages(convoId, limit);

    const serialized = messages.map((m) => {
      const sender = db.users.get(m.from);
      return {
        id: m.id,
        from: sender
          ? { id: sender.id, username: sender.username }
          : { id: m.from, username: "unknown" },
        groupId: m.groupId,
        groupName: m.groupName,
        message: m.message,
        timestamp: m.timestamp,
      };
    });

    res.json({ groupId, messages: serialized });
  });

  // GET /api/conversations
  // List all conversations for the current user with last message + unread hint
  router.get("/api/conversations", (req, res) => {
    const me = authenticate(req);
    if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }

    const conversations: Array<{
      type: "private" | "group";
      id: string;
      name: string;
      lastMessage: { message: string; timestamp: number; from: string } | null;
      messageCount: number;
    }> = [];

    // Private conversations
    for (const [convoId, messages] of db.messages) {
      if (convoId.startsWith("group:")) continue;
      if (!convoId.includes(me.id)) continue;

      const parts = convoId.split(":");
      const partnerId = parts[0] === me.id ? parts[1] : parts[0];
      const partner = db.users.get(partnerId);
      if (!partner) continue;

      const last = messages[messages.length - 1];
      conversations.push({
        type: "private",
        id: partnerId,
        name: partner.username,
        lastMessage: last
          ? {
              message: last.message,
              timestamp: last.timestamp,
              from: db.users.get(last.from)?.username || "unknown",
            }
          : null,
        messageCount: messages.length,
      });
    }

    // Group conversations
    for (const [groupId, group] of db.groups) {
      if (!group.members.has(me.id)) continue;
      const messages = db.messages.get(groupConvoId(groupId)) || [];
      const last = messages[messages.length - 1];

      conversations.push({
        type: "group",
        id: groupId,
        name: group.name,
        lastMessage: last
          ? {
              message: last.message,
              timestamp: last.timestamp,
              from: db.users.get(last.from)?.username || "unknown",
            }
          : null,
        messageCount: messages.length,
      });
    }

    // Sort by most recent activity
    conversations.sort(
      (a, b) =>
        (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0)
    );

    res.json(conversations);
  });
}
