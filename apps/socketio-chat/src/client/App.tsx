import { useState, useRef, useEffect } from "react";
import { useSocket, login, register } from "./useSocket";
import type { GroupInfo, User } from "./useSocket";

// ─── Styles ───
const colors = {
  bg: "#0a0a0a",
  panel: "#111",
  border: "#333",
  text: "#eee",
  muted: "#888",
  green: "#4ade80",
  blue: "#60a5fa",
  yellow: "#fbbf24",
  red: "#ef4444",
  purple: "#c084fc",
};

const panelStyle: React.CSSProperties = {
  background: colors.panel,
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  padding: 16,
};

// ─── App ───
export function App() {
  const socket = useSocket();
  const [activeChat, setActiveChat] = useState<
    | { type: "private"; user: User }
    | { type: "group"; group: GroupInfo }
    | null
  >(null);

  // When user selects a chat: set active + mark read + fetch history
  const openChat = (chat: typeof activeChat) => {
    setActiveChat(chat);
    if (!chat) {
      socket.markChatActive(null);
      return;
    }
    if (chat.type === "private") {
      socket.markChatActive(chat.user.id, "private");
      socket.fetchPrivateHistory(chat.user.id);
    } else {
      socket.markChatActive(chat.group.id, "group");
      socket.fetchGroupHistory(chat.group.id);
    }
  };

  if (!socket.currentUser) {
    return (
      <LoginScreen
        onAuthenticated={(token) => socket.connect(token)}
        authError={socket.authError}
      />
    );
  }

  return (
    <div style={{ fontFamily: "monospace", background: colors.bg, color: colors.text, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{ padding: "12px 20px", borderBottom: `1px solid ${colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0, fontSize: 18, color: colors.purple }}>Socket.IO Chat</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: socket.isConnected ? colors.green : colors.red, display: "inline-block" }} />
          <span style={{ fontSize: 13, color: colors.muted }}>{socket.currentUser.username}</span>
          {socket.channel && <span style={{ fontSize: 11, color: colors.border }}>({socket.channel})</span>}
          <button onClick={socket.disconnect} style={{
            padding: "4px 10px", background: "#333", color: colors.muted, border: "none",
            borderRadius: 3, fontSize: 11, cursor: "pointer", fontFamily: "monospace",
          }}>Logout</button>
        </div>
      </header>

      {/* Notifications */}
      {socket.notifications.length > 0 && (
        <div style={{ padding: "8px 20px", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {socket.notifications.slice(0, 3).map((n) => (
            <div key={n.id} onClick={() => socket.dismissNotification(n.id)} style={{
              padding: "6px 12px", borderRadius: 4, fontSize: 12, cursor: "pointer",
              background: n.type === "success" ? "#0f2f1a" : n.type === "warning" ? "#2f2f0a" : "#0a1a2f",
              border: `1px solid ${n.type === "success" ? colors.green : n.type === "warning" ? colors.yellow : colors.blue}`,
              color: n.type === "success" ? colors.green : n.type === "warning" ? colors.yellow : colors.blue,
            }}>
              {n.message} <span style={{ color: colors.muted, marginLeft: 8 }}>x</span>
            </div>
          ))}
        </div>
      )}

      {/* Main layout */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <aside style={{ width: 260, borderRight: `1px solid ${colors.border}`, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Online Users */}
          <div>
            <h3 style={{ margin: "0 0 8px", fontSize: 13, color: colors.muted, textTransform: "uppercase", letterSpacing: 1 }}>
              Online ({socket.onlineUsers.length})
            </h3>
            {socket.onlineUsers.length === 0 ? (
              <p style={{ color: colors.muted, fontSize: 12 }}>No other users online</p>
            ) : (
              socket.onlineUsers.map((user) => {
                const unread = socket.unreadCounts[user.id] || 0;
                return (
                  <div key={user.id} onClick={() => openChat({ type: "private", user })} style={{
                    padding: "8px 10px", borderRadius: 4, cursor: "pointer", fontSize: 13, marginBottom: 2,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: activeChat?.type === "private" && activeChat.user.id === user.id ? "#1a1a2f" : "transparent",
                  }}>
                    <span>
                      <span style={{ color: colors.green, marginRight: 6 }}>●</span>
                      {user.username}
                    </span>
                    {unread > 0 && (
                      <span style={{
                        background: colors.green, color: "#000", borderRadius: 10,
                        padding: "1px 7px", fontSize: 11, fontWeight: "bold", minWidth: 18,
                        textAlign: "center", display: "inline-block",
                      }}>
                        {unread}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Groups */}
          <div>
            <h3 style={{ margin: "0 0 8px", fontSize: 13, color: colors.muted, textTransform: "uppercase", letterSpacing: 1 }}>
              Groups
            </h3>
            {socket.groups.map((group) => {
              const unread = socket.unreadCounts[group.id] || 0;
              return (
                <div key={group.id} onClick={() => { if (group.joined) openChat({ type: "group", group }); }} style={{
                  padding: "8px 10px", borderRadius: 4, cursor: group.joined ? "pointer" : "default", fontSize: 13,
                  marginBottom: 2, display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: activeChat?.type === "group" && activeChat.group.id === group.id ? "#1a1a2f" : "transparent",
                }}>
                  <span>
                    #{group.name} <span style={{ color: colors.muted, fontSize: 11 }}>({group.memberCount})</span>
                  </span>
                  <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {unread > 0 && (
                      <span style={{
                        background: colors.yellow, color: "#000", borderRadius: 10,
                        padding: "1px 7px", fontSize: 11, fontWeight: "bold", minWidth: 18,
                        textAlign: "center", display: "inline-block",
                      }}>
                        {unread}
                      </span>
                    )}
                    {!group.joined ? (
                      <button onClick={(e) => { e.stopPropagation(); socket.joinGroup(group.id); }} style={{
                        padding: "2px 8px", background: colors.blue, color: "#000", border: "none",
                        borderRadius: 3, fontSize: 11, cursor: "pointer", fontFamily: "monospace",
                      }}>Join</button>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); socket.leaveGroup(group.id); }} style={{
                        padding: "2px 8px", background: colors.red, color: "#000", border: "none",
                        borderRadius: 3, fontSize: 11, cursor: "pointer", fontFamily: "monospace",
                      }}>Leave</button>
                    )}
                  </span>
                </div>
              );
            })}
            <CreateGroupButton onCreate={socket.createGroup} />
          </div>
        </aside>

        {/* Chat area */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {!activeChat ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: colors.muted }}>
              Select a user or group to start chatting
            </div>
          ) : activeChat.type === "private" ? (
            <PrivateChat
              partner={activeChat.user}
              messages={socket.privateMessages[activeChat.user.id] || []}
              onSend={(msg) => socket.sendPrivateMessage(activeChat.user.id, msg)}
              onTyping={() => socket.sendTyping({ toUserId: activeChat.user.id })}
              typingUsers={socket.typingUsers.filter((t) => t.context === "private" && t.from.id === activeChat.user.id)}
              currentUserId={socket.currentUser.id}
            />
          ) : (
            <GroupChat
              group={activeChat.group}
              messages={socket.groupMessages[activeChat.group.id] || []}
              onSend={(msg) => socket.sendGroupMessage(activeChat.group.id, msg)}
              onTyping={() => socket.sendTyping({ groupId: activeChat.group.id })}
              typingUsers={socket.typingUsers.filter((t) => t.context === "group" && t.groupId === activeChat.group.id)}
              currentUserId={socket.currentUser.id}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Login / Register Screen ───
function LoginScreen({ onAuthenticated, authError }: {
  onAuthenticated: (token: string) => void;
  authError: string | null;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result =
        mode === "login"
          ? await login(username, password)
          : await register(username, email, password);

      // Connect socket with the auth token
      onAuthenticated(result.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const displayError = error || authError;

  return (
    <div style={{
      fontFamily: "monospace", background: colors.bg, color: colors.text,
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ ...panelStyle, width: 380, textAlign: "center" }}>
        <h1 style={{ color: colors.purple, marginTop: 0 }}>Socket.IO Chat</h1>
        <p style={{ color: colors.muted, fontSize: 13 }}>
          Authenticated channels, private + group chat
        </p>

        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 0, marginBottom: 16 }}>
          <button onClick={() => setMode("login")} style={{
            flex: 1, padding: "8px 0", fontFamily: "monospace", fontSize: 13, cursor: "pointer",
            background: mode === "login" ? colors.purple : "#222",
            color: mode === "login" ? "#000" : colors.muted,
            border: `1px solid ${colors.border}`, borderRadius: "4px 0 0 4px",
          }}>Login</button>
          <button onClick={() => setMode("register")} style={{
            flex: 1, padding: "8px 0", fontFamily: "monospace", fontSize: 13, cursor: "pointer",
            background: mode === "register" ? colors.purple : "#222",
            color: mode === "register" ? "#000" : colors.muted,
            border: `1px solid ${colors.border}`, borderRadius: "0 4px 4px 0",
          }}>Register</button>
        </div>

        {displayError && (
          <div style={{
            padding: "8px 12px", marginBottom: 12, borderRadius: 4, fontSize: 12,
            background: "#2f0f0f", border: `1px solid ${colors.red}`, color: colors.red,
            textAlign: "left",
          }}>
            {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoFocus
            style={{
              width: "100%", padding: "10px 12px", background: "#222", border: `1px solid ${colors.border}`,
              borderRadius: 4, color: colors.text, fontFamily: "monospace", fontSize: 14,
              marginBottom: 8, boxSizing: "border-box",
            }}
          />
          {mode === "register" && (
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              type="email"
              style={{
                width: "100%", padding: "10px 12px", background: "#222", border: `1px solid ${colors.border}`,
                borderRadius: 4, color: colors.text, fontFamily: "monospace", fontSize: 14,
                marginBottom: 8, boxSizing: "border-box",
              }}
            />
          )}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type={showPassword ? "text" : "password"}
              style={{
                width: "100%", padding: "10px 12px", paddingRight: 48, background: "#222",
                border: `1px solid ${colors.border}`, borderRadius: 4, color: colors.text,
                fontFamily: "monospace", fontSize: 14, boxSizing: "border-box",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                background: "transparent", border: "none", color: colors.muted,
                fontFamily: "monospace", fontSize: 11, cursor: "pointer", padding: "4px 6px",
              }}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <button type="submit" disabled={loading || !username.trim() || !password.trim()} style={{
            width: "100%", padding: "10px 0",
            background: !loading && username.trim() && password.trim() ? colors.purple : "#333",
            color: !loading && username.trim() && password.trim() ? "#000" : colors.muted,
            border: "none", borderRadius: 4, fontFamily: "monospace", fontSize: 14,
            cursor: !loading ? "pointer" : "wait", fontWeight: "bold",
          }}>
            {loading ? "..." : mode === "login" ? "Login" : "Create Account"}
          </button>
        </form>

        <p style={{ color: colors.muted, fontSize: 11, marginBottom: 0, marginTop: 12 }}>
          Demo: alice / bob / charlie (password = username)
        </p>
      </div>
    </div>
  );
}

// ─── Private Chat ───
function PrivateChat({ partner, messages, onSend, onTyping, typingUsers, currentUserId }: {
  partner: User;
  messages: { from: User; message: string; timestamp: number }[];
  onSend: (msg: string) => void;
  onTyping: () => void;
  typingUsers: { from: User }[];
  currentUserId: string;
}) {
  return (
    <>
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${colors.border}` }}>
        <h2 style={{ margin: 0, fontSize: 15 }}>
          <span style={{ color: colors.green, marginRight: 6 }}>●</span>
          {partner.username}
          <span style={{ color: colors.muted, fontSize: 12, marginLeft: 8 }}>private message</span>
        </h2>
      </div>
      <MessageList messages={messages} currentUserId={currentUserId} />
      {typingUsers.length > 0 && (
        <div style={{ padding: "4px 20px", fontSize: 12, color: colors.muted }}>
          {typingUsers[0].from.username} is typing...
        </div>
      )}
      <MessageInput onSend={onSend} onTyping={onTyping} placeholder={`Message ${partner.username}...`} />
    </>
  );
}

// ─── Group Chat ───
function GroupChat({ group, messages, onSend, onTyping, typingUsers, currentUserId }: {
  group: GroupInfo;
  messages: { from: User; message: string; timestamp: number; groupId: string; groupName: string }[];
  onSend: (msg: string) => void;
  onTyping: () => void;
  typingUsers: { from: User }[];
  currentUserId: string;
}) {
  return (
    <>
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${colors.border}` }}>
        <h2 style={{ margin: 0, fontSize: 15 }}>
          <span style={{ color: colors.yellow }}>#</span> {group.name}
          <span style={{ color: colors.muted, fontSize: 12, marginLeft: 8 }}>{group.memberCount} members</span>
        </h2>
      </div>
      <MessageList messages={messages} currentUserId={currentUserId} />
      {typingUsers.length > 0 && (
        <div style={{ padding: "4px 20px", fontSize: 12, color: colors.muted }}>
          {typingUsers.map((t) => t.from.username).join(", ")}{" "}
          {typingUsers.length === 1 ? "is" : "are"} typing...
        </div>
      )}
      <MessageInput onSend={onSend} onTyping={onTyping} placeholder={`Message #${group.name}...`} />
    </>
  );
}

// ─── Message List ───
function MessageList({ messages, currentUserId }: {
  messages: { from: User; message: string; timestamp: number }[];
  currentUserId: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
      {messages.length === 0 ? (
        <p style={{ color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 40 }}>
          No messages yet. Say hello!
        </p>
      ) : (
        messages.map((msg, i) => {
          const isOwn = msg.from.id === currentUserId;
          return (
            <div key={i} style={{ marginBottom: 12, display: "flex", flexDirection: "column", alignItems: isOwn ? "flex-end" : "flex-start" }}>
              <div style={{ fontSize: 11, color: colors.muted, marginBottom: 2 }}>
                {isOwn ? "You" : msg.from.username}
                <span style={{ marginLeft: 8 }}>{new Date(msg.timestamp).toLocaleTimeString()}</span>
              </div>
              <div style={{
                padding: "8px 14px", borderRadius: 12, maxWidth: "70%", fontSize: 13, lineHeight: 1.5,
                background: isOwn ? colors.purple : "#222",
                color: isOwn ? "#000" : colors.text,
                borderBottomRightRadius: isOwn ? 2 : 12,
                borderBottomLeftRadius: isOwn ? 12 : 2,
              }}>
                {msg.message}
              </div>
            </div>
          );
        })
      )}
      <div ref={bottomRef} />
    </div>
  );
}

// ─── Message Input ───
function MessageInput({ onSend, onTyping, placeholder }: {
  onSend: (msg: string) => void;
  onTyping: () => void;
  placeholder: string;
}) {
  const [text, setText] = useState("");
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(onTyping, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: "12px 20px", borderTop: `1px solid ${colors.border}`, display: "flex", gap: 8 }}>
      <input
        value={text}
        onChange={handleChange}
        placeholder={placeholder}
        style={{
          flex: 1, padding: "10px 12px", background: "#222", border: `1px solid ${colors.border}`,
          borderRadius: 4, color: colors.text, fontFamily: "monospace", fontSize: 13,
        }}
      />
      <button type="submit" disabled={!text.trim()} style={{
        padding: "10px 20px", background: text.trim() ? colors.purple : "#333",
        color: text.trim() ? "#000" : colors.muted,
        border: "none", borderRadius: 4, fontFamily: "monospace", fontWeight: "bold",
        cursor: text.trim() ? "pointer" : "not-allowed",
      }}>
        Send
      </button>
    </form>
  );
}

// ─── Create Group Button ───
function CreateGroupButton({ onCreate }: { onCreate: (name: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} style={{
        marginTop: 8, width: "100%", padding: "8px 0", background: "transparent",
        border: `1px dashed ${colors.border}`, borderRadius: 4, color: colors.muted,
        fontFamily: "monospace", fontSize: 12, cursor: "pointer",
      }}>
        + Create Group
      </button>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) { onCreate(name.trim()); setName(""); setIsOpen(false); } }}
      style={{ marginTop: 8, display: "flex", gap: 4 }}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name..." autoFocus style={{
        flex: 1, padding: "6px 8px", background: "#222", border: `1px solid ${colors.border}`,
        borderRadius: 3, color: colors.text, fontFamily: "monospace", fontSize: 12,
      }} />
      <button type="submit" style={{
        padding: "6px 10px", background: colors.green, color: "#000", border: "none",
        borderRadius: 3, fontSize: 11, cursor: "pointer", fontFamily: "monospace",
      }}>OK</button>
      <button type="button" onClick={() => { setIsOpen(false); setName(""); }} style={{
        padding: "6px 8px", background: "#333", color: colors.muted, border: "none",
        borderRadius: 3, fontSize: 11, cursor: "pointer", fontFamily: "monospace",
      }}>x</button>
    </form>
  );
}
