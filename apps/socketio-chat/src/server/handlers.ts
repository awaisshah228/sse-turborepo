import type { Server, Socket } from "socket.io";
import {
  db,
  type DBUser,
  type DBGroup,
  storeMessage,
  privateConvoId,
  groupConvoId,
  markRead,
  getUnreadCount,
} from "./db";
import {
  userChannel,
  sendToUser,
  notify,
  notifyOnlineUsers,
  addSocket,
  removeSocket,
  getOnlineUsers,
  onlineSockets,
  serializeUser,
  serializeGroup,
} from "./channels";

// ═══════════════════════════════════════════════════════════════
// Socket Event Handlers
//
// At this point middleware has authenticated the socket.
// socket.data.userId / socket.data.dbUser are guaranteed valid.
// ═══════════════════════════════════════════════════════════════

export function registerHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    const userId: string = socket.data.userId;
    const dbUser: DBUser = socket.data.dbUser;

    console.log(
      `Authenticated: ${dbUser.username} (${userId}) → socket ${socket.id}`
    );

    // ── Auto-join personal channel (derived from DB ID — unforgeable) ──
    socket.join(userChannel(userId));

    // ── Track presence (supports multiple tabs) ──
    const isFirstConnection = addSocket(userId, socket.id);

    // ── Auto-join groups the user belongs to ──
    const general = db.groups.get("general")!;
    if (!general.members.has(userId)) {
      general.members.add(userId);
    }

    for (const [groupId, group] of db.groups) {
      if (group.members.has(userId)) {
        socket.join(`group:${groupId}`);
      }
    }

    // ── Build unread counts for all conversations ──
    const unreadCounts: Record<string, number> = {};

    // Private convos
    for (const convoId of db.messages.keys()) {
      if (convoId.startsWith("group:")) continue;
      if (!convoId.includes(userId)) continue;
      const parts = convoId.split(":");
      const partnerId = parts[0] === userId ? parts[1] : parts[0];
      const count = getUnreadCount(userId, convoId);
      if (count > 0) unreadCounts[partnerId] = count;
    }

    // Group convos
    for (const [groupId, group] of db.groups) {
      if (!group.members.has(userId)) continue;
      const count = getUnreadCount(userId, groupConvoId(groupId));
      if (count > 0) unreadCounts[groupId] = count;
    }

    // ── Send initial state ──
    sendToUser(io, userId, "channel:registered", {
      user: serializeUser(dbUser),
      channel: userChannel(userId),
      groups: Array.from(db.groups.keys()).map((id) =>
        serializeGroup(id, userId)
      ),
      onlineUsers: getOnlineUsers().filter((u) => u.id !== userId),
      unreadCounts,
    });

    // ── Broadcast presence (only on first tab) ──
    if (isFirstConnection) {
      notifyOnlineUsers(io, `${dbUser.username} is online`, "success", userId);
      for (const [otherUserId] of onlineSockets) {
        if (otherUserId === userId) continue;
        sendToUser(io, otherUserId, "channel:user-online", serializeUser(dbUser));
      }
    }

    // ── Private message ──
    socket.on(
      "private-message",
      (data: { toUserId: string; message: string }) => {
        const recipient = db.users.get(data.toUserId);
        if (!recipient) return;

        const timestamp = Date.now();
        const msgId = `${userId}-${timestamp}`;

        // Store in DB
        storeMessage(privateConvoId(userId, data.toUserId), {
          id: msgId,
          from: userId,
          toUserId: data.toUserId,
          message: data.message,
          timestamp,
        });

        const payload = {
          from: serializeUser(dbUser),
          toUserId: data.toUserId,
          toUsername: recipient.username,
          message: data.message,
          timestamp,
        };

        sendToUser(io, data.toUserId, "channel:private-message", payload);
        sendToUser(io, userId, "channel:private-message", payload);
      }
    );

    // ── Join group ──
    socket.on("join-group", (groupId: string) => {
      const group = db.groups.get(groupId);
      if (!group || group.members.has(userId)) return;

      group.members.add(userId);
      socket.join(`group:${groupId}`);

      notify(io, userId, `You joined #${group.name}`, "success");

      for (const memberId of group.members) {
        if (memberId === userId) continue;
        notify(io, memberId, `${dbUser.username} joined #${group.name}`, "info");
        sendToUser(io, memberId, "channel:group-updated", serializeGroup(groupId, memberId));
      }

      sendToUser(io, userId, "channel:group-updated", serializeGroup(groupId, userId));
    });

    // ── Leave group ──
    socket.on("leave-group", (groupId: string) => {
      const group = db.groups.get(groupId);
      if (!group || !group.members.has(userId)) return;

      group.members.delete(userId);
      socket.leave(`group:${groupId}`);

      notify(io, userId, `You left #${group.name}`, "warning");
      sendToUser(io, userId, "channel:group-updated", serializeGroup(groupId, userId));

      for (const memberId of group.members) {
        notify(io, memberId, `${dbUser.username} left #${group.name}`, "info");
        sendToUser(io, memberId, "channel:group-updated", serializeGroup(groupId, memberId));
      }
    });

    // ── Group message (must be a member) ──
    socket.on(
      "group-message",
      (data: { groupId: string; message: string }) => {
        const group = db.groups.get(data.groupId);
        if (!group || !group.members.has(userId)) return;

        const timestamp = Date.now();

        // Store in DB
        storeMessage(groupConvoId(data.groupId), {
          id: `${userId}-${timestamp}`,
          from: userId,
          groupId: data.groupId,
          groupName: group.name,
          message: data.message,
          timestamp,
        });

        io.to(`group:${data.groupId}`).emit("channel:group-message", {
          groupId: data.groupId,
          groupName: group.name,
          from: serializeUser(dbUser),
          message: data.message,
          timestamp,
        });
      }
    );

    // ── Create group ──
    socket.on("create-group", (name: string) => {
      const id = name.toLowerCase().replace(/\s+/g, "-");
      if (db.groups.has(id)) {
        notify(io, userId, `Group #${name} already exists`, "warning");
        return;
      }

      const group: DBGroup = {
        id,
        name,
        createdBy: userId,
        members: new Set([userId]),
        createdAt: Date.now(),
      };
      db.groups.set(id, group);
      socket.join(`group:${id}`);

      for (const [onlineUserId] of onlineSockets) {
        sendToUser(io, onlineUserId, "channel:group-created", serializeGroup(id, onlineUserId));
      }

      notify(io, userId, `You created #${name}`, "success");
    });

    // ── Mark read (WhatsApp-style blue ticks) ──
    // Client emits this when user opens a chat.
    // Server updates lastRead timestamp + notifies the other party.
    socket.on(
      "mark-read",
      (data: { partnerId?: string; groupId?: string }) => {
        if (data.partnerId) {
          const convoId = privateConvoId(userId, data.partnerId);
          const readAt = markRead(userId, convoId);

          // Notify the sender so they see blue ticks in real-time
          sendToUser(io, data.partnerId, "channel:read-receipt", {
            convoId,
            readBy: serializeUser(dbUser),
            readAt,
          });

          // Confirm to the reader (clears their unread badge)
          sendToUser(io, userId, "channel:read-receipt", {
            convoId,
            readBy: serializeUser(dbUser),
            readAt,
          });
        } else if (data.groupId) {
          const convoId = groupConvoId(data.groupId);
          markRead(userId, convoId);

          // In groups, broadcast read receipt to all members
          const group = db.groups.get(data.groupId);
          if (group) {
            for (const memberId of group.members) {
              if (memberId === userId) continue;
              sendToUser(io, memberId, "channel:read-receipt", {
                convoId,
                groupId: data.groupId,
                readBy: serializeUser(dbUser),
                readAt: Date.now(),
              });
            }
          }

          // Confirm to self
          sendToUser(io, userId, "channel:read-receipt", {
            convoId,
            groupId: data.groupId,
            readBy: serializeUser(dbUser),
            readAt: Date.now(),
          });
        }
      }
    );

    // ── Typing ──
    socket.on("typing", (data: { toUserId?: string; groupId?: string }) => {
      const typingPayload = {
        from: serializeUser(dbUser),
        context: data.toUserId ? "private" : "group",
        groupId: data.groupId,
      };

      if (data.toUserId) {
        sendToUser(io, data.toUserId, "channel:typing", typingPayload);
      } else if (data.groupId) {
        socket.to(`group:${data.groupId}`).emit("channel:typing", typingPayload);
      }
    });

    // ── Disconnect ──
    socket.on("disconnect", () => {
      const isFullyOffline = removeSocket(userId, socket.id);

      if (isFullyOffline) {
        for (const [otherUserId] of onlineSockets) {
          sendToUser(io, otherUserId, "channel:user-offline", {
            id: userId,
            username: dbUser.username,
          });
        }
        notifyOnlineUsers(io, `${dbUser.username} went offline`, "warning");
      }

      console.log(`Disconnected: ${dbUser.username} (socket ${socket.id})`);
    });
  });
}
