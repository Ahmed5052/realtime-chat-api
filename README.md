# Real-Time Chat API

A backend REST + real-time API for a chat application, built as a portfolio project to demonstrate professional backend development practices: secure authentication, relational data modeling, real-time communication, automated testing, and production-style DevOps.

This project is under active development. This README reflects what has been built and tested so far: **authentication, the core data model/messaging layer, real-time communication, an automated test suite, and a containerized, CI-tested deployment setup**.

## Architecture

![Architecture diagram](./docs/architecture.svg)

## Tech Stack

- **Runtime:** Node.js 22 (ES Modules)
- **Framework:** Express
- **Real-time:** Socket.IO (with Redis adapter for multi-instance scaling)
- **Database:** PostgreSQL
- **Cache / pub-sub:** Redis
- **ORM:** Prisma 7 (with `@prisma/adapter-pg`)
- **Validation:** Zod v4
- **Auth:** JWT (access tokens) + rotating refresh tokens
- **Password hashing:** bcrypt
- **Rate limiting:** express-rate-limit
- **Testing:** Jest + Supertest
- **Containerization:** Docker (multi-stage build), Docker Compose
- **Reverse proxy:** Nginx (with WebSocket upgrade support)
- **CI:** GitHub Actions (lint → migrate → test → build)

## Project Structure

```
src/
├── config/          # env loading, database connection
├── middleware/       # auth guard, rate limiter, global error handler
├── modules/
│   ├── auth/          # register, login, refresh token rotation
│   ├── conversations/ # create/list conversations (1-to-1 and group)
│   ├── messages/      # send, edit, delete, paginated fetch
│   └── health/         # health check endpoint
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

tests/
├── unit/                # isolated logic tests (hashing, tokens) — no database
├── integration/          # full HTTP request/response tests via Supertest, real test DB
├── helpers/               # shared test utilities (e.g. test user creation)
└── setup.js                # loads .env.test before any test runs

docker/
├── docker-compose.yml    # API + Postgres + Redis + pgAdmin + Nginx
└── nginx/
    └── nginx.conf          # reverse proxy config with WebSocket upgrade headers

.github/
└── workflows/
    └── ci.yml              # lint → migrate → test → build, on push/PR to main

Dockerfile                 # multi-stage build (builder + production image)
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
- **Redis adapter**: Socket.IO state (rooms, broadcasts) is shared via Redis pub/sub, allowing multiple API instances to serve the same real-time layer without sticky sessions

### Automated Testing

- **Unit tests** for isolated logic (password hashing, JWT signing/verification) with no database dependency
- **Integration tests** (via Supertest) covering the full HTTP request/response cycle for auth, conversations, and messages, run against a dedicated, isolated test database
- Coverage includes happy paths, validation failures, authorization boundaries (e.g. non-participants blocked from reading/writing), and business-logic edge cases such as refresh token reuse detection and conversation deduplication
- Rate limiting is automatically bypassed in the test environment so it doesn't interfere with tests unrelated to it, while remaining fully active in development/production

### DevOps & Deployment

- **Multi-stage Dockerfile**: a `builder` stage installs full dependencies (including the Prisma CLI) to generate the Prisma client; the final production image installs only production dependencies, keeping the shipped image lean
- **Docker Compose stack**: API, Postgres, Redis, pgAdmin, and Nginx all run as networked containers, brought up with a single command
- **Healthcheck-gated startup**: the API container waits for Postgres and Redis to report actually healthy (not just "started") before it boots, preventing race-condition crashes on cold start
- **Nginx reverse proxy**: sits in front of the API as the only publicly exposed port, with `Upgrade`/`Connection` headers correctly configured so Socket.IO's WebSocket handshake passes through cleanly instead of being silently downgraded to plain HTTP
- **Environment-based config**: all secrets and connection strings are injected via `.env`, never hardcoded or committed
- **`/health` endpoint**: a lightweight liveness check suitable for container orchestration
- **CI pipeline (GitHub Actions)**: on every push/PR to `main`, an isolated pipeline spins up its own Postgres and Redis, generates the Prisma client, applies migrations, lints, runs the full test suite, and confirms the Docker image builds — all before code is considered good

## API Endpoints (implemented so far)

| Method | Endpoint                                  | Auth required | Description                                              |
| ------ | ----------------------------------------- | :-----------: | -------------------------------------------------------- |
| GET    | `/health`                                 |      No       | Liveness check for orchestration/monitoring              |
| POST   | `/auth/register`                          |      No       | Create a new user account                                |
| POST   | `/auth/login`                             |      No       | Log in, receive access + refresh tokens                  |
| POST   | `/auth/refresh`                           |      No       | Exchange a valid refresh token for a new token pair      |
| POST   | `/conversations`                          |      Yes      | Create a 1-to-1 or group conversation                    |
| GET    | `/conversations`                          |      Yes      | List all conversations the authenticated user is part of |
| GET    | `/conversations/:conversationId/messages` |      Yes      | Fetch paginated message history (cursor-based)           |
| POST   | `/conversations/:conversationId/messages` |      Yes      | Send a message                                           |
| PATCH  | `/conversations/messages/:messageId`      |      Yes      | Edit a message (sender only)                             |
| DELETE | `/conversations/messages/:messageId`      |      Yes      | Soft-delete a message (sender only)                      |

## API Documentation

A ready-to-use Postman collection is available in `docs/`:

1. Import `docs/Realtime Chat API.postman_collection.json`
2. Import `docs/Realtime Chat API.postman_environment.json` and select it as the active environment
3. Run **Login** or **Register** first — the access/refresh tokens are captured automatically and reused by every other request

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

## Running with Docker (recommended)

**Prerequisites:** Docker Desktop

```bash
# Copy env template and fill in real values
cp .env.example .env

# Build and start the full stack: API, Postgres, Redis, pgAdmin, Nginx
docker compose -f docker/docker-compose.yml --env-file .env up -d --build

# Apply database migrations inside the running API container
docker exec -it chat_api npx prisma migrate deploy
```

The API is reachable through Nginx at `http://localhost` (port 80) — not directly on port 3000, which is intentionally not exposed to the host. pgAdmin is available at `http://localhost:5050`.

```bash
# Confirm everything is healthy
curl http://localhost/health
```

## Local Setup (without Docker)

**Prerequisites:** Node.js 22, Docker (for Postgres/Redis only)

```bash
# Install dependencies
npm install

# Start Postgres and Redis only
docker compose -f docker/docker-compose.yml --env-file .env up -d postgres redis

# Copy env template and fill in real values
cp .env.example .env

# Run migrations
npx prisma migrate dev

# Start the dev server
npm run dev
```

## Running Tests

Tests run against a separate, isolated database so they never touch development data.

```bash
# One-time setup: create the test database
docker exec -it chat_postgres psql -U chatuser -d chatdb -c "CREATE DATABASE chatdb_test;"

# Apply migrations to the test database
$env:DATABASE_URL="postgresql://chatuser:chatpassword@localhost:5432/chatdb_test"
npx prisma migrate deploy

# Run the full test suite
npm test
```

`.env.test` holds the test environment's configuration and is loaded automatically before tests run. The same lint → migrate → test sequence runs automatically in CI on every push/PR to `main`.

## Design Decisions

A few choices worth calling out, since they reflect deliberate tradeoffs rather than defaults:

- **Refresh token rotation over static refresh tokens** — a static long-lived refresh token, if stolen, remains silently valid for its entire lifespan. Rotation means a stolen token becomes a detectable, one-time-use liability instead.
- **Cursor pagination over offset pagination** — offset pagination degrades in performance at scale and produces skipped/duplicated results when new messages are inserted while a user is paginating. Cursor pagination avoids both problems.
- **One schema for 1-to-1 and group chats** — rather than separate tables/logic for direct messages vs. group messages, a single `Conversation` model (differentiated by an `isGroup` flag and participant count) avoids duplicating every feature built on top of it.
- **Shared service layer between REST and sockets** — rather than reimplementing message-sending logic for the socket handler, it calls the exact same service function the REST endpoint uses. This guarantees both interfaces behave identically and eliminates an entire class of bugs where the two could silently drift apart.
- **Connection-count presence tracking, not connection-existence** — presence is tracked as a count per user rather than a boolean per socket, so a user with multiple open tabs or devices isn't incorrectly marked offline when only one of their connections closes.
- **Isolated test database over shared dev database** — running tests against the same database used for manual development testing would cause tests to interfere with each other and with manual testing sessions. A dedicated test database keeps automated tests deterministic and repeatable.
- **Multi-stage Docker build** — generating the Prisma client requires the Prisma CLI, which is a dev dependency and unnecessary bloat in a production image. A `builder` stage handles generation with full dependencies installed; the final image copies over only the generated output and production dependencies, keeping the shipped image smaller and reducing its attack surface.
- **Healthcheck-gated container startup over plain `depends_on`** — Docker's default `depends_on` only waits for a container to _start_, not for the service inside it to actually be ready to accept connections. Gating startup on real healthchecks (`pg_isready`, `redis-cli ping`) prevents the API from crashing against a database that technically exists but isn't accepting connections yet.
- **Nginx as the sole public entry point** — the API container is not directly exposed to the host; all traffic is routed through Nginx. This mirrors how real deployments isolate application servers behind a reverse proxy, and centralizes where concerns like TLS termination or request logging would be added later.
- **Plain JavaScript, not TypeScript** — chosen deliberately to build a solid grasp of Node.js fundamentals (ES modules, async patterns, Express internals) before introducing a type system on top.
