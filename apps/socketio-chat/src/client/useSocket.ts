import { useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { playMessageSound, playNotificationSound, playGroupMessageSound } from "./sounds";

export interface User {
  id: string;
  username: string;
}

export interface Notification {
  id: number;
  message: string;
  type: "info" | "success" | "warning";
  timestamp: number;
}

export interface ChatMessage {
  from: User;
  toUserId?: string;
  toUsername?: string;
  message: string;
  timestamp: number;
}

export interface GroupMessage extends ChatMessage {
  groupId: string;
  groupName: string;
}

export interface GroupInfo {
  id: string;
  name: string;
  memberCount: number;
  joined: boolean;
}

export interface TypingInfo {
  from: User;
  context: "private" | "group";
  groupId?: string;
}

const SERVER_URL = "http://localhost:3004";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [channel, setChannel] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [privateMessages, setPrivateMessages] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [groupMessages, setGroupMessages] = useState<
    Record<string, GroupMessage[]>
  >({});
  const [typingUsers, setTypingUsers] = useState<TypingInfo[]>([]);
  // Unread counts: key = partnerId (private) or groupId (group)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  // Track which chat is currently active so we don't count those as unread
  const activeChatRef = useRef<string | null>(null);

  // Connect with auth token — middleware validates before connection
  const connect = useCallback((token: string) => {
    // Disconnect existing socket if any
    socketRef.current?.disconnect();
    setAuthError(null);

    tokenRef.current = token;
    const socket = io(SERVER_URL, {
      auth: { token },
    });
    socketRef.current = socket;

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    // Auth middleware rejection
    socket.on("connect_error", (err: Error) => {
      setAuthError(err.message);
      setIsConnected(false);
    });

    // ─── All events come through the user's personal channel ───

    // Track our own userId inside the closure so message handlers
    // can distinguish "my message" from "their message".
    // socket.id is the transport ID — NOT the DB userId.
    let myUserId: string | null = null;

    socket.on("channel:registered", (data: {
      user: User;
      channel: string;
      groups: GroupInfo[];
      onlineUsers: User[];
      unreadCounts: Record<string, number>;
    }) => {
      myUserId = data.user.id;
      setCurrentUser(data.user);
      setChannel(data.channel);
      setGroups(data.groups);
      setOnlineUsers(data.onlineUsers);
      // Server-computed unread counts (persisted across reconnects)
      setUnreadCounts(data.unreadCounts || {});
    });

    socket.on("channel:user-online", (user: User) => {
      setOnlineUsers((prev) =>
        prev.some((u) => u.id === user.id) ? prev : [...prev, user]
      );
    });

    socket.on("channel:user-offline", (data: { id: string }) => {
      setOnlineUsers((prev) => prev.filter((u) => u.id !== data.id));
    });

    socket.on("channel:notification", (notif: Notification) => {
      playNotificationSound();
      setNotifications((prev) => [notif, ...prev].slice(0, 50));
    });

    socket.on("channel:private-message", (msg: ChatMessage) => {
      setPrivateMessages((prev) => {
        // Key by the partner's userId
        const partnerId =
          msg.from.id === myUserId ? msg.toUserId! : msg.from.id;

        const existing = prev[partnerId] || [];
        // Dedupe (server echoes to sender)
        const isDupe = existing.some(
          (m) =>
            m.timestamp === msg.timestamp &&
            m.from.id === msg.from.id &&
            m.message === msg.message
        );
        if (isDupe) return prev;

        // Play sound + increment unread only for incoming messages not in active chat
        if (msg.from.id !== myUserId) {
          playMessageSound();
          if (activeChatRef.current !== partnerId) {
            setUnreadCounts((prev) => ({
              ...prev,
              [partnerId]: (prev[partnerId] || 0) + 1,
            }));
          }
        }

        return { ...prev, [partnerId]: [...existing, msg] };
      });
    });

    socket.on("channel:group-message", (msg: GroupMessage) => {
      if (msg.from.id !== myUserId) {
        playGroupMessageSound();
        if (activeChatRef.current !== msg.groupId) {
          setUnreadCounts((prev) => ({
            ...prev,
            [msg.groupId]: (prev[msg.groupId] || 0) + 1,
          }));
        }
      }
      setGroupMessages((prev) => ({
        ...prev,
        [msg.groupId]: [...(prev[msg.groupId] || []), msg],
      }));
    });

    socket.on("channel:group-created", (group: GroupInfo) => {
      setGroups((prev) =>
        prev.some((g) => g.id === group.id) ? prev : [...prev, group]
      );
    });

    socket.on("channel:group-updated", (group: GroupInfo) => {
      setGroups((prev) =>
        prev.map((g) => (g.id === group.id ? { ...g, ...group } : g))
      );
    });

    // Read receipts — clear unread when server confirms
    socket.on("channel:read-receipt", (data: {
      convoId: string;
      readBy: User;
      readAt: number;
      groupId?: string;
    }) => {
      // If we're the reader, clear our unread badge
      if (data.readBy.id === myUserId) {
        const key = data.groupId
          ? data.groupId
          : data.convoId.split(":").find((id) => id !== myUserId) || "";
        if (key) {
          setUnreadCounts((prev) => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }
      }
      // TODO: you can use readBy + readAt to show blue ticks on messages
    });

    socket.on("channel:typing", (info: TypingInfo) => {
      setTypingUsers((prev) => {
        if (prev.some((t) => t.from.id === info.from.id)) return prev;
        return [...prev, info];
      });
      setTimeout(() => {
        setTypingUsers((prev) =>
          prev.filter((t) => t.from.id !== info.from.id)
        );
      }, 2000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setIsConnected(false);
    setCurrentUser(null);
    setChannel(null);
  }, []);

  const sendPrivateMessage = useCallback(
    (toUserId: string, message: string) => {
      socketRef.current?.emit("private-message", { toUserId, message });
    },
    []
  );

  const sendGroupMessage = useCallback(
    (groupId: string, message: string) => {
      socketRef.current?.emit("group-message", { groupId, message });
    },
    []
  );

  const joinGroup = useCallback((groupId: string) => {
    socketRef.current?.emit("join-group", groupId);
  }, []);

  const leaveGroup = useCallback((groupId: string) => {
    socketRef.current?.emit("leave-group", groupId);
  }, []);

  const createGroup = useCallback((name: string) => {
    socketRef.current?.emit("create-group", name);
  }, []);

  const sendTyping = useCallback(
    (target: { toUserId?: string; groupId?: string }) => {
      socketRef.current?.emit("typing", target);
    },
    []
  );

  const dismissNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Mark a chat as active — clears badge immediately + emits to server
  // Server persists the read timestamp and notifies the sender (blue ticks)
  const markChatActive = useCallback(
    (chatId: string | null, chatType?: "private" | "group") => {
      activeChatRef.current = chatId;
      if (chatId) {
        // Clear badge immediately (optimistic) — don't wait for server round-trip
        setUnreadCounts((prev) => {
          if (!prev[chatId]) return prev;
          const next = { ...prev };
          delete next[chatId];
          return next;
        });

        // Emit to server so it persists + notifies sender (blue ticks)
        if (socketRef.current) {
          if (chatType === "group") {
            socketRef.current.emit("mark-read", { groupId: chatId });
          } else {
            socketRef.current.emit("mark-read", { partnerId: chatId });
          }
        }
      }
    },
    []
  );

  // Fetch message history via REST API
  const tokenRef = useRef<string | null>(null);

  const fetchPrivateHistory = useCallback(
    async (partnerId: string, limit = 50) => {
      if (!tokenRef.current) return;
      const res = await fetch(
        `${SERVER_URL}/api/messages/private/${partnerId}?limit=${limit}`,
        { headers: { Authorization: `Bearer ${tokenRef.current}` } }
      );
      if (!res.ok) return;
      const data = await res.json();
      setPrivateMessages((prev) => ({
        ...prev,
        [partnerId]: data.messages,
      }));
    },
    []
  );

  const fetchGroupHistory = useCallback(
    async (groupId: string, limit = 50) => {
      if (!tokenRef.current) return;
      const res = await fetch(
        `${SERVER_URL}/api/messages/group/${groupId}?limit=${limit}`,
        { headers: { Authorization: `Bearer ${tokenRef.current}` } }
      );
      if (!res.ok) return;
      const data = await res.json();
      setGroupMessages((prev) => ({
        ...prev,
        [groupId]: data.messages,
      }));
    },
    []
  );

  return {
    isConnected,
    authError,
    currentUser,
    channel,
    onlineUsers,
    groups,
    notifications,
    privateMessages,
    groupMessages,
    typingUsers,
    unreadCounts,
    connect,
    disconnect,
    sendPrivateMessage,
    sendGroupMessage,
    joinGroup,
    leaveGroup,
    createGroup,
    sendTyping,
    dismissNotification,
    markChatActive,
    fetchPrivateHistory,
    fetchGroupHistory,
  };
}

// ─── Auth API helpers ───

export async function login(
  username: string,
  password: string
): Promise<{ token: string; user: User }> {
  const res = await fetch(`${SERVER_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Login failed");
  }
  return res.json();
}

export async function register(
  username: string,
  email: string,
  password: string
): Promise<{ token: string; user: User }> {
  const res = await fetch(`${SERVER_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Registration failed");
  }
  return res.json();
}
