# Real-Time Chat API

A backend REST + real-time API for a chat application, built as a portfolio project to demonstrate professional backend development practices: secure authentication, relational data modeling, real-time communication, and production-style engineering workflows.

This project is under active development. This README reflects what has been built and tested so far: **authentication, the core data model/messaging layer, and real-time communication**.

## Tech Stack

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express
- **Real-time:** Socket.IO
- **Database:** PostgreSQL (via Docker)
- **ORM:** Prisma 7 (with `@prisma/adapter-pg`)
- **Validation:** Zod v4
- **Auth:** JWT (access tokens) + rotating refresh tokens
- **Password hashing:** bcrypt
- **Rate limiting:** express-rate-limit

## Project Structure

```
src/
├── config/          # env loading, database connection
├── middleware/       # auth guard, rate limiter, global error handler
├── modules/
│   ├── auth/          # register, login, refresh token rotation
│   ├── conversations/ # create/list conversations (1-to-1 and group)
│   └── messages/      # send, edit, delete, paginated fetch
├── sockets/            # real-time layer
│   ├── index.js          # Socket.IO server bootstrap
│   ├── presence.js        # in-memory online/offline connection tracking
│   ├── middleware/
│   │   └── socketAuth.js    # JWT verification on socket handshake
│   └── handlers/
│       ├── message.handler.js   # message:send / message:receive
│       ├── typing.handler.js    # typing:start / typing:stop
│       └── presence.handler.js  # presence:online / presence:offline
├── utils/             # password hashing, token signing/verification
├── generated/          # Prisma-generated client (auto-generated, gitignored)
├── app.js              # Express app assembly
└── server.js            # entrypoint (HTTP server + Socket.IO)
```

## Features Implemented So Far

### Authentication

- User registration and login with input validation (Zod)
- Passwords hashed with bcrypt, never stored or returned in plaintext
- **JWT access tokens** (short-lived, 15 min) for authenticating requests
- **Refresh token rotation**: every refresh invalidates the old token and issues a new one
- **Reuse detection**: if an already-used (revoked) refresh token is presented again, all sessions for that user are automatically revoked — a signal that theft may have occurred
- Rate limiting on `/auth/login` and `/auth/register` to prevent brute-force attempts
- Centralized error handling middleware — all errors return consistent, safe JSON responses with correct HTTP status codes (no internal details leaked to clients)

### Data Model & Conversations

- Single schema supports both 1-to-1 and group conversations (no duplicated logic between them)
- `ConversationParticipant` join table manages many-to-many membership between users and conversations
- Automatic deduplication: creating a 1-to-1 conversation between the same two users returns the existing conversation instead of creating a duplicate
- **Cursor-based pagination** for message history — stable under concurrent writes, unlike offset-based pagination, and indexed for performance at scale
- Message ownership enforcement: users can only edit or delete their own messages
- **Soft-delete** for messages: deleted messages are hidden from message lists but retained in the database (not hard-deleted)

### Real-Time Communication (Socket.IO)

- **Authenticated socket handshake**: reuses the same JWT verification logic as the REST API — connections without a valid access token are rejected before ever being established
- **Room-based architecture**: each conversation maps to a Socket.IO room; users are automatically joined to every room for the conversations they're part of when they connect
- **Live messaging** (`message:send` / `message:receive`): socket events reuse the exact same service-layer functions as the REST message endpoints, guaranteeing identical validation, authorization, and persistence — messages sent over the socket are saved to the database exactly like REST-sent messages
- **Typing indicators** (`typing:start` / `typing:stop`): lightweight, ephemeral broadcasts with no database involvement; correctly excludes the sender from receiving their own typing event
- **Presence tracking** (`presence:online` / `presence:offline`): tracks online status per user (not per connection) using a connection-count map, so a user with multiple open tabs/devices is only marked offline once _all_ of their connections close; presence changes are broadcast once per user even when they share multiple conversations with the observer, avoiding duplicate events

## API Endpoints (implemented so far)

| Method | Endpoint                                  | Auth required | Description                                              |
| ------ | ----------------------------------------- | :-----------: | -------------------------------------------------------- |
| POST   | `/auth/register`                          |      No       | Create a new user account                                |
| POST   | `/auth/login`                             |      No       | Log in, receive access + refresh tokens                  |
| POST   | `/auth/refresh`                           |      No       | Exchange a valid refresh token for a new token pair      |
| POST   | `/conversations`                          |      Yes      | Create a 1-to-1 or group conversation                    |
| GET    | `/conversations`                          |      Yes      | List all conversations the authenticated user is part of |
| GET    | `/conversations/:conversationId/messages` |      Yes      | Fetch paginated message history (cursor-based)           |
| POST   | `/conversations/:conversationId/messages` |      Yes      | Send a message                                           |
| PATCH  | `/messages/:messageId`                    |      Yes      | Edit a message (sender only)                             |
| DELETE | `/messages/:messageId`                    |      Yes      | Soft-delete a message (sender only)                      |

## Socket.IO Events (implemented so far)

Connections must send a valid access token via `socket.handshake.auth.token`.

| Event              | Direction              | Description                                                     |
| ------------------ | ---------------------- | --------------------------------------------------------------- |
| `message:send`     | Client → Server        | Send a message into a conversation (validated, persisted)       |
| `message:receive`  | Server → Room          | Broadcast a new message to everyone in the conversation         |
| `typing:start`     | Client → Server → Room | Notify others in the conversation that the user started typing  |
| `typing:stop`      | Client → Server → Room | Notify others in the conversation that the user stopped typing  |
| `presence:online`  | Server → Room(s)       | Broadcast that a user has come online (first connection)        |
| `presence:offline` | Server → Room(s)       | Broadcast that a user has gone offline (last connection closed) |

## Local Setup

**Prerequisites:** Node.js, Docker

```bash
# Install dependencies
npm install

# Start PostgreSQL
docker compose -f docker/docker-compose.yml up -d

# Copy env template and fill in real values
cp .env.example .env

# Run migrations
npx prisma migrate dev

# Start the dev server
npm run dev
```

## Design Decisions

A few choices worth calling out, since they reflect deliberate tradeoffs rather than defaults:

- **Refresh token rotation over static refresh tokens** — a static long-lived refresh token, if stolen, remains silently valid for its entire lifespan. Rotation means a stolen token becomes a detectable, one-time-use liability instead.
- **Cursor pagination over offset pagination** — offset pagination degrades in performance at scale and produces skipped/duplicated results when new messages are inserted while a user is paginating. Cursor pagination avoids both problems.
- **One schema for 1-to-1 and group chats** — rather than separate tables/logic for direct messages vs. group messages, a single `Conversation` model (differentiated by an `isGroup` flag and participant count) avoids duplicating every feature built on top of it.
- **Shared service layer between REST and sockets** — rather than reimplementing message-sending logic for the socket handler, it calls the exact same service function the REST endpoint uses. This guarantees both interfaces behave identically and eliminates an entire class of bugs where the two could silently drift apart.
- **Connection-count presence tracking, not connection-existence** — presence is tracked as a count per user rather than a boolean per socket, so a user with multiple open tabs or devices isn't incorrectly marked offline when only one of their connections closes.
- **Plain JavaScript, not TypeScript** — chosen deliberately to build a solid grasp of Node.js fundamentals (ES modules, async patterns, Express internals) before introducing a type system on top.

## What's Coming Next

Redis-backed horizontal scaling (allowing multiple server instances to share socket state), an automated test suite, and a full Docker/CI deployment setup are planned next.
