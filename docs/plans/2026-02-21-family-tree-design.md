# Family Tree Website — Design Document

**Date:** 2026-02-21
**Project:** vreug-tree

---

## Overview

A family tree website for shared family use. Family members can view the tree publicly. Authenticated users can add, edit, and remove members and relationships.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React |
| Routing | TanStack Router (file-based, type-safe) |
| Data fetching | TanStack Query |
| Tree visualization | React Flow (interactive, zoomable, pannable) |
| API server | Hono (Node.js) |
| ORM | Prisma |
| Database | PostgreSQL (existing Unraid instance) |
| Auth | Better-Auth (email/password, session cookies) |
| Deployment | Single Docker container on Unraid |

---

## Architecture

```
Single Docker Container:
  Hono server
  ├── /api/*        → REST API routes
  └── /*            → serves Vite static build

Connects to existing PostgreSQL on Unraid host network
```

- Hono serves both the API and the compiled frontend static files
- One container, one port, connects to the existing PostgreSQL instance via environment variable

---

## Data Model

### `users`
Managed by Better-Auth. Stores authentication accounts.

```
id           String   @id
email        String   @unique
name         String
password     String   (hashed)
created_at   DateTime
```

### `members`
Individual family members in the tree.

```
id           String   @id
first_name   String
last_name    String
birth_date   DateTime? (nullable)
death_date   DateTime? (nullable)
photo_url    String?   (path to uploaded file)
bio          String?   (freeform notes)
created_at   DateTime
updated_at   DateTime
```

### `relationships`
Edges connecting members in the tree.

```
id               String @id
member_id        String (FK → members.id)
related_member_id String (FK → members.id)
type             Enum: PARENT_CHILD | SPOUSE
```

- `PARENT_CHILD`: `member_id` is the parent, `related_member_id` is the child
- `SPOUSE`: bidirectional, either direction is valid
- Deleting a member cascades to delete all their relationships

**Photos** are stored on disk in a mounted Docker volume. The `photo_url` field stores the relative file path.

---

## API Routes

All write routes require an authenticated session (Better-Auth middleware).

```
POST   /api/auth/*              Better-Auth handles all auth (login, register, session)

GET    /api/members             Fetch all members and relationships
POST   /api/members             Add a new member
PUT    /api/members/:id         Edit a member
DELETE /api/members/:id         Delete a member (cascades relationships)

POST   /api/relationships       Add a relationship between two members
DELETE /api/relationships/:id   Remove a relationship
```

**Error responses:** Standard HTTP status codes (400, 401, 404, 500) with JSON error messages.

---

## Frontend Pages & UI

### Tree View (`/`) — public
- React Flow canvas renders members as nodes (photo + name card) and relationships as edges
- Spouse links: horizontal edges
- Parent-child links: vertical edges
- Click a member card → detail sidebar opens (name, dates, bio, spouse, parents, children)
- Zoom, pan, fit-to-screen controls

### Auth
- `/login` — email + password sign in
- `/register` — create account (disable after initial family setup)

### Member Management (authenticated only)
- **Add member** — form: first name, last name, birth date, death date, photo upload, bio
- **Edit member** — same form pre-filled, opened from detail sidebar
- **Remove member** — delete button with confirmation dialog
- **Add relationship** — link a member to another as parent, child, or spouse
- Edit/delete controls only visible when logged in

### Header
- Login / logout button
- Logged-in state indicator

---

## Deployment

- Single `Dockerfile` — multi-stage build:
  1. Build Vite frontend → static files
  2. Build/run Hono server → serves static files + API
- `docker-compose.yml` for local Unraid deployment
- Environment variables:
  - `DATABASE_URL` — PostgreSQL connection string (existing Unraid DB)
  - `BETTER_AUTH_SECRET` — session secret
  - `PORT` — server port (default 3000)
- Photo uploads stored in a named Docker volume mounted at `/app/uploads`

---

## Out of Scope (for now)

- Email verification on registration
- Password reset flow
- Real-time updates (polling or websockets)
- Automated tests
- Export to GEDCOM or other family tree formats
