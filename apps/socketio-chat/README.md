# @repo/socketio-chat

Real-time chat app built with **Socket.IO** on both frontend and backend, featuring authenticated channels, private messaging, group chat, and live notifications.

## Architecture

```
src/
├── server.ts              — Entry point (bootstrap, wiring)
├── server/
│   ├── db.ts              — In-memory DB (users, sessions, groups)
│   ├── auth.ts            — REST auth endpoints + Socket.IO middleware
│   ├── channels.ts        — Channel helpers, presence tracking, serializers
│   └── handlers.ts        — All socket event handlers
└── client/
    ├── main.tsx           — React entry point
    ├── App.tsx            — Login/register UI, chat layout
    └── useSocket.ts       — Socket.IO hook + auth API helpers
```

## Auth Flow

```
1. Client → POST /auth/login { username, password }
2. Server → validates against DB → returns { token, user }
3. Client → io(SERVER, { auth: { token } })
4. Socket.IO middleware → validates token → attaches userId to socket.data
5. Server → socket.join("user:<userId>") — personal channel, unforgeable
6. All events route through the user's channel
```

No one can choose or forge their channel — it's derived from the authenticated DB user ID in the middleware. The client never sends a userId; the server always reads `socket.data.userId`.

## Features

- **Auth** — login/register with session tokens, Socket.IO middleware rejects unauthenticated connections
- **Personal Channels** — `user:<userId>` room auto-joined on auth, all events flow through it
- **Private Chat** — 1:1 messaging routed through personal channels
- **Group Chat** — join/leave/create groups, must be a member to send
- **Notifications** — real-time toasts for joins, leaves, system events
- **Typing Indicators** — private and group typing relayed through channels
- **Multi-Tab Support** — user stays "online" until ALL tabs disconnect

## Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `channel:registered` | Server → Client | Auth confirmed, initial state |
| `channel:private-message` | Server → Client | Private message (via personal channel) |
| `channel:group-message` | Server → Client | Group message (via group room) |
| `channel:notification` | Server → Client | System notification |
| `channel:typing` | Server → Client | Typing indicator |
| `channel:user-online` | Server → Client | User came online |
| `channel:user-offline` | Server → Client | User went offline |
| `channel:group-created` | Server → Client | New group available |
| `channel:group-updated` | Server → Client | Group membership changed |
| `private-message` | Client → Server | Send private message |
| `group-message` | Client → Server | Send group message |
| `join-group` | Client → Server | Join a group |
| `leave-group` | Client → Server | Leave a group |
| `create-group` | Client → Server | Create a new group |
| `typing` | Client → Server | Typing indicator |

## Running

```bash
# From monorepo root
yarn && yarn dev

# Or standalone
cd apps/socketio-chat
yarn dev    # server on :3004, client on :3003
```

Open http://localhost:3003 in two tabs. Demo users: **alice**, **bob**, **charlie** (password = username).

## Mimicking a Real DB

The `db.ts` file uses Maps structured like real database tables:
- `db.users` — user records with UUIDs, hashed passwords
- `db.sessions` — token-based sessions with expiry
- `db.groups` — groups with creator tracking, member sets

To swap in a real DB, replace the Map operations in `db.ts` with your ORM/query builder. The rest of the code stays the same.
