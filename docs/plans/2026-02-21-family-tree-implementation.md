# Family Tree Website Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a family tree website where family members can view an interactive tree and authenticated users can add, edit, and remove members and relationships.

**Architecture:** Single Docker container running a Hono Node.js server that serves both the REST API and the compiled Vite/React frontend as static files. PostgreSQL (existing Unraid instance) via Prisma ORM. Better-Auth handles email/password sessions.

**Tech Stack:** Vite, React, TanStack Router, TanStack Query, React Flow, Hono, Prisma, Better-Auth, PostgreSQL, Docker, Vitest

---

## Project Structure

```
vreug-tree/
├── client/                     # Vite + React frontend
│   ├── src/
│   │   ├── routes/             # TanStack Router file-based routes
│   │   │   ├── __root.tsx
│   │   │   ├── index.tsx       # Tree view (/)
│   │   │   ├── login.tsx       # /login
│   │   │   └── register.tsx    # /register
│   │   ├── components/
│   │   │   ├── MemberNode.tsx  # React Flow node card
│   │   │   ├── MemberSidebar.tsx
│   │   │   ├── MemberForm.tsx
│   │   │   └── RelationshipForm.tsx
│   │   ├── lib/
│   │   │   ├── api.ts          # fetch wrappers
│   │   │   └── auth.ts         # Better-Auth client
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/
│   ├── src/
│   │   ├── index.ts            # Hono app entry
│   │   ├── auth.ts             # Better-Auth instance
│   │   └── routes/
│   │       ├── members.ts
│   │       └── relationships.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── package.json
│   └── tsconfig.json
├── package.json                # npm workspace root
├── Dockerfile
└── docker-compose.yml
```

---

## Task 1: Initialize npm Workspace

**Files:**
- Create: `package.json`
- Create: `server/package.json`
- Create: `client/package.json`
- Create: `server/tsconfig.json`
- Create: `client/tsconfig.json`

**Step 1: Create workspace root package.json**

```json
{
  "name": "vreug-tree",
  "private": true,
  "workspaces": ["client", "server"]
}
```

**Step 2: Create server/package.json**

```json
{
  "name": "vreug-tree-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "@better-auth/core": "^1.2.0",
    "@hono/node-server": "^1.13.0",
    "@prisma/client": "^6.0.0",
    "hono": "^4.6.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "prisma": "^6.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

**Step 3: Create client/package.json**

```json
{
  "name": "vreug-tree-client",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.62.0",
    "@tanstack/react-router": "^1.82.0",
    "better-auth": "^1.2.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "reactflow": "^11.11.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  }
}
```

**Step 4: Create server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src"]
}
```

**Step 5: Create client/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

**Step 6: Install all dependencies**

```bash
npm install
```

Expected: `node_modules` created for both workspaces.

**Step 7: Commit**

```bash
git add package.json client/package.json server/package.json client/tsconfig.json server/tsconfig.json package-lock.json
git commit -m "feat: initialize npm workspace with client and server"
```

---

## Task 2: Prisma Schema & Database Migration

**Files:**
- Create: `server/prisma/schema.prisma`

**Step 1: Initialize Prisma**

```bash
cd server && npx prisma init --datasource-provider postgresql
```

Expected: `server/prisma/schema.prisma` and `server/.env` created.

**Step 2: Replace schema.prisma with our data model**

```prisma
// server/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Member {
  id         String    @id @default(cuid())
  firstName  String
  lastName   String
  birthDate  DateTime?
  deathDate  DateTime?
  photoUrl   String?
  bio        String?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  relationshipsFrom Relationship[] @relation("RelationshipFrom")
  relationshipsTo   Relationship[] @relation("RelationshipTo")
}

model Relationship {
  id              String           @id @default(cuid())
  memberId        String
  relatedMemberId String
  type            RelationshipType

  member        Member @relation("RelationshipFrom", fields: [memberId], references: [id], onDelete: Cascade)
  relatedMember Member @relation("RelationshipTo", fields: [relatedMemberId], references: [id], onDelete: Cascade)
}

enum RelationshipType {
  PARENT_CHILD
  SPOUSE
}
```

**Step 3: Set DATABASE_URL in server/.env**

```bash
# server/.env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/vreug_tree"
```

Replace USER, PASSWORD, HOST with your Unraid PostgreSQL credentials.

**Step 4: Create .gitignore to exclude .env**

```bash
# server/.gitignore
.env
dist/
node_modules/
```

Also add a root `.gitignore`:

```bash
# .gitignore (root)
node_modules/
dist/
.env
client/dist/
uploads/
```

**Step 5: Run migration**

```bash
cd server && npx prisma migrate dev --name init
```

Expected: Migration files created in `server/prisma/migrations/`.

**Step 6: Generate Prisma client**

```bash
cd server && npx prisma generate
```

Expected: `@prisma/client` types generated.

**Step 7: Commit**

```bash
git add server/prisma/ server/.gitignore .gitignore
git commit -m "feat: add prisma schema with Member and Relationship models"
```

---

## Task 3: Better-Auth Setup on Hono

**Files:**
- Create: `server/src/auth.ts`
- Create: `server/src/db.ts`
- Create: `server/src/index.ts`

**Step 1: Add Better-Auth schema to Prisma**

Better-Auth requires its own tables. Add to the bottom of `server/prisma/schema.prisma`:

```prisma
model User {
  id            String    @id
  name          String
  email         String    @unique
  emailVerified Boolean
  image         String?
  createdAt     DateTime
  updatedAt     DateTime
  sessions      Session[]
  accounts      Account[]
}

model Session {
  id        String   @id
  expiresAt DateTime
  token     String   @unique
  createdAt DateTime
  updatedAt DateTime
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Account {
  id                    String    @id
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime
  updatedAt             DateTime
}

model Verification {
  id         String    @id
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime?
  updatedAt  DateTime?
}
```

**Step 2: Run migration for auth tables**

```bash
cd server && npx prisma migrate dev --name add-auth-tables
cd server && npx prisma generate
```

**Step 3: Create server/src/db.ts**

```typescript
import { PrismaClient } from "@prisma/client";

export const db = new PrismaClient();
```

**Step 4: Create server/src/auth.ts**

```typescript
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "./db.js";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: [process.env.BETTER_AUTH_TRUSTED_ORIGIN ?? "http://localhost:5173"],
});
```

**Step 5: Create server/src/index.ts**

```typescript
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth.js";
import { membersRouter } from "./routes/members.js";
import { relationshipsRouter } from "./routes/relationships.js";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  })
);

// Better-Auth handles all /api/auth/* routes
app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));

// API routes
app.route("/api/members", membersRouter);
app.route("/api/relationships", relationshipsRouter);

// Serve static frontend files (production)
app.use("*", serveStatic({ root: "../client/dist" }));
// SPA fallback
app.get("*", serveStatic({ path: "../client/dist/index.html" }));

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on http://localhost:${port}`);
});
```

**Step 6: Test server starts**

```bash
cd server && npm run dev
```

Expected: "Server running on http://localhost:3000" in terminal. Ctrl+C to stop.

**Step 7: Commit**

```bash
git add server/src/ server/prisma/
git commit -m "feat: set up Hono server with Better-Auth and Prisma"
```

---

## Task 4: Members API Routes (with tests)

**Files:**
- Create: `server/src/routes/members.ts`
- Create: `server/src/routes/members.test.ts`

**Step 1: Create auth middleware helper**

Add to `server/src/auth.ts` (append below the existing export):

```typescript
import type { Context, Next } from "hono";

export async function requireAuth(c: Context, next: Next) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("user", session.user);
  await next();
}
```

**Step 2: Create server/src/routes/members.ts**

```typescript
import { Hono } from "hono";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";

export const membersRouter = new Hono();

// GET /api/members — fetch all members and relationships (public)
membersRouter.get("/", async (c) => {
  const members = await db.member.findMany({ orderBy: { createdAt: "asc" } });
  const relationships = await db.relationship.findMany();
  return c.json({ members, relationships });
});

// POST /api/members — add member (auth required)
membersRouter.post("/", requireAuth, async (c) => {
  const body = await c.req.json();
  const { firstName, lastName, birthDate, deathDate, photoUrl, bio } = body;
  if (!firstName || !lastName) {
    return c.json({ error: "firstName and lastName are required" }, 400);
  }
  const member = await db.member.create({
    data: {
      firstName,
      lastName,
      birthDate: birthDate ? new Date(birthDate) : null,
      deathDate: deathDate ? new Date(deathDate) : null,
      photoUrl: photoUrl ?? null,
      bio: bio ?? null,
    },
  });
  return c.json(member, 201);
});

// PUT /api/members/:id — edit member (auth required)
membersRouter.put("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { firstName, lastName, birthDate, deathDate, photoUrl, bio } = body;
  const existing = await db.member.findUnique({ where: { id } });
  if (!existing) return c.json({ error: "Not found" }, 404);
  const member = await db.member.update({
    where: { id },
    data: {
      firstName: firstName ?? existing.firstName,
      lastName: lastName ?? existing.lastName,
      birthDate: birthDate !== undefined ? (birthDate ? new Date(birthDate) : null) : existing.birthDate,
      deathDate: deathDate !== undefined ? (deathDate ? new Date(deathDate) : null) : existing.deathDate,
      photoUrl: photoUrl !== undefined ? photoUrl : existing.photoUrl,
      bio: bio !== undefined ? bio : existing.bio,
    },
  });
  return c.json(member);
});

// DELETE /api/members/:id — remove member and cascade relationships (auth required)
membersRouter.delete("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const existing = await db.member.findUnique({ where: { id } });
  if (!existing) return c.json({ error: "Not found" }, 404);
  await db.member.delete({ where: { id } });
  return c.json({ success: true });
});
```

**Step 3: Write tests in server/src/routes/members.test.ts**

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { membersRouter } from "./members.js";

// Mock db and auth
vi.mock("../db.js", () => ({
  db: {
    member: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    relationship: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../auth.js", () => ({
  requireAuth: vi.fn(async (c: any, next: any) => await next()),
}));

import { db } from "../db.js";

const app = new Hono();
app.route("/api/members", membersRouter);

describe("GET /api/members", () => {
  it("returns members and relationships", async () => {
    vi.mocked(db.member.findMany).mockResolvedValue([
      { id: "1", firstName: "John", lastName: "Doe", birthDate: null, deathDate: null, photoUrl: null, bio: null, createdAt: new Date(), updatedAt: new Date() },
    ]);
    vi.mocked(db.relationship.findMany).mockResolvedValue([]);

    const res = await app.request("/api/members");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.members).toHaveLength(1);
    expect(json.members[0].firstName).toBe("John");
  });
});

describe("POST /api/members", () => {
  it("returns 400 when firstName is missing", async () => {
    const res = await app.request("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastName: "Doe" }),
    });
    expect(res.status).toBe(400);
  });

  it("creates a member when valid data provided", async () => {
    const created = { id: "2", firstName: "Jane", lastName: "Doe", birthDate: null, deathDate: null, photoUrl: null, bio: null, createdAt: new Date(), updatedAt: new Date() };
    vi.mocked(db.member.create).mockResolvedValue(created);

    const res = await app.request("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: "Jane", lastName: "Doe" }),
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.firstName).toBe("Jane");
  });
});

describe("DELETE /api/members/:id", () => {
  it("returns 404 when member does not exist", async () => {
    vi.mocked(db.member.findUnique).mockResolvedValue(null);
    const res = await app.request("/api/members/nonexistent", { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});
```

**Step 4: Run tests to verify they pass**

```bash
cd server && npm test
```

Expected: all tests pass.

**Step 5: Commit**

```bash
git add server/src/routes/
git commit -m "feat: add members CRUD API with tests"
```

---

## Task 5: Relationships API Routes (with tests)

**Files:**
- Create: `server/src/routes/relationships.ts`
- Create: `server/src/routes/relationships.test.ts`

**Step 1: Create server/src/routes/relationships.ts**

```typescript
import { Hono } from "hono";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";

export const relationshipsRouter = new Hono();

// POST /api/relationships — add relationship (auth required)
relationshipsRouter.post("/", requireAuth, async (c) => {
  const body = await c.req.json();
  const { memberId, relatedMemberId, type } = body;
  if (!memberId || !relatedMemberId || !type) {
    return c.json({ error: "memberId, relatedMemberId, and type are required" }, 400);
  }
  if (!["PARENT_CHILD", "SPOUSE"].includes(type)) {
    return c.json({ error: "type must be PARENT_CHILD or SPOUSE" }, 400);
  }
  const relationship = await db.relationship.create({
    data: { memberId, relatedMemberId, type },
  });
  return c.json(relationship, 201);
});

// DELETE /api/relationships/:id — remove relationship (auth required)
relationshipsRouter.delete("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const existing = await db.relationship.findUnique({ where: { id } });
  if (!existing) return c.json({ error: "Not found" }, 404);
  await db.relationship.delete({ where: { id } });
  return c.json({ success: true });
});
```

**Step 2: Create server/src/routes/relationships.test.ts**

```typescript
import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { relationshipsRouter } from "./relationships.js";

vi.mock("../db.js", () => ({
  db: {
    relationship: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("../auth.js", () => ({
  requireAuth: vi.fn(async (c: any, next: any) => await next()),
}));

import { db } from "../db.js";

const app = new Hono();
app.route("/api/relationships", relationshipsRouter);

describe("POST /api/relationships", () => {
  it("returns 400 when type is invalid", async () => {
    const res = await app.request("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: "1", relatedMemberId: "2", type: "INVALID" }),
    });
    expect(res.status).toBe(400);
  });

  it("creates a relationship with valid data", async () => {
    const created = { id: "r1", memberId: "1", relatedMemberId: "2", type: "SPOUSE" };
    vi.mocked(db.relationship.create).mockResolvedValue(created as any);

    const res = await app.request("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: "1", relatedMemberId: "2", type: "SPOUSE" }),
    });
    expect(res.status).toBe(201);
  });
});
```

**Step 3: Run tests**

```bash
cd server && npm test
```

Expected: all tests pass.

**Step 4: Commit**

```bash
git add server/src/routes/relationships.ts server/src/routes/relationships.test.ts
git commit -m "feat: add relationships API with tests"
```

---

## Task 6: Photo Upload Endpoint

**Files:**
- Create: `server/src/routes/upload.ts`
- Modify: `server/src/index.ts`

**Step 1: Create server/src/routes/upload.ts**

```typescript
import { Hono } from "hono";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { requireAuth } from "../auth.js";

export const uploadRouter = new Hono();

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";

uploadRouter.post("/", requireAuth, async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];
  if (!file || !(file instanceof File)) {
    return c.json({ error: "No file provided" }, 400);
  }
  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  const buffer = await file.arrayBuffer();
  await writeFile(join(UPLOAD_DIR, filename), Buffer.from(buffer));
  return c.json({ url: `/uploads/${filename}` }, 201);
});
```

**Step 2: Add upload route and static uploads serving to server/src/index.ts**

Add these lines after the relationships route registration and before static file serving:

```typescript
import { uploadRouter } from "./routes/upload.js";
// ...
app.route("/api/upload", uploadRouter);
app.use("/uploads/*", serveStatic({ root: process.env.UPLOAD_DIR ?? "./uploads", rewriteRequestPath: (path) => path.replace("/uploads", "") }));
```

**Step 3: Test upload works manually**

```bash
cd server && npm run dev
# In another terminal:
curl -X POST http://localhost:3000/api/upload -F "file=@/path/to/test.jpg"
```

Expected: `{"url":"/uploads/<filename>.jpg"}`

**Step 4: Commit**

```bash
git add server/src/routes/upload.ts server/src/index.ts
git commit -m "feat: add photo upload endpoint"
```

---

## Task 7: Vite Client Setup

**Files:**
- Create: `client/vite.config.ts`
- Create: `client/index.html`
- Create: `client/src/main.tsx`
- Create: `client/src/router.tsx`

**Step 1: Create client/vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3000",
      "/uploads": "http://localhost:3000",
    },
  },
});
```

**Step 2: Create client/index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Family Tree</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 3: Create client/src/lib/api.ts**

```typescript
const BASE = "/api";

export async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}
```

**Step 4: Create client/src/lib/auth.ts**

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({ baseURL: "/api/auth" });

export function useSession() {
  return authClient.useSession();
}
```

**Step 5: Create client/src/router.tsx**

```typescript
import { createRouter, createRootRoute, createRoute, Outlet } from "@tanstack/react-router";
import { TreePage } from "./routes/index.js";
import { LoginPage } from "./routes/login.js";
import { RegisterPage } from "./routes/register.js";

const rootRoute = createRootRoute({ component: () => <Outlet /> });
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: TreePage });
const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: "/login", component: LoginPage });
const registerRoute = createRoute({ getParentRoute: () => rootRoute, path: "/register", component: RegisterPage });

const routeTree = rootRoute.addChildren([indexRoute, loginRoute, registerRoute]);
export const router = createRouter({ routeTree });
```

**Step 6: Create client/src/main.tsx**

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "./router.js";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);
```

**Step 7: Create placeholder route files so the router compiles**

`client/src/routes/index.tsx`:
```typescript
export function TreePage() { return <div>Tree Page</div>; }
```

`client/src/routes/login.tsx`:
```typescript
export function LoginPage() { return <div>Login</div>; }
```

`client/src/routes/register.tsx`:
```typescript
export function RegisterPage() { return <div>Register</div>; }
```

**Step 8: Start client dev server**

```bash
cd client && npm run dev
```

Expected: Vite starts on http://localhost:5173, "Tree Page" visible in browser.

**Step 9: Commit**

```bash
git add client/
git commit -m "feat: initialize Vite + React client with TanStack Router and Query"
```

---

## Task 8: Login & Register Pages

**Files:**
- Modify: `client/src/routes/login.tsx`
- Modify: `client/src/routes/register.tsx`
- Create: `client/src/components/Header.tsx`

**Step 1: Replace client/src/routes/login.tsx**

```typescript
import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { authClient } from "../lib/auth.js";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const result = await authClient.signIn.email({ email, password });
    if (result.error) {
      setError(result.error.message ?? "Login failed");
    } else {
      router.navigate({ to: "/" });
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: 24 }}>
      <h1>Sign In</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email<br />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
        </div>
        <div>
          <label>Password<br />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit">Sign In</button>
      </form>
      <p><a href="/register">Create an account</a></p>
    </div>
  );
}
```

**Step 2: Replace client/src/routes/register.tsx**

```typescript
import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { authClient } from "../lib/auth.js";

export function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const result = await authClient.signUp.email({ name, email, password });
    if (result.error) {
      setError(result.error.message ?? "Registration failed");
    } else {
      router.navigate({ to: "/" });
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: 24 }}>
      <h1>Create Account</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Name<br />
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        </div>
        <div>
          <label>Email<br />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
        </div>
        <div>
          <label>Password<br />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </label>
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit">Create Account</button>
      </form>
      <p><a href="/login">Already have an account?</a></p>
    </div>
  );
}
```

**Step 3: Create client/src/components/Header.tsx**

```typescript
import { useRouter } from "@tanstack/react-router";
import { authClient, useSession } from "../lib/auth.js";

export function Header() {
  const { data: session } = useSession();
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.navigate({ to: "/" });
  }

  return (
    <header style={{ padding: "12px 24px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <a href="/" style={{ fontWeight: "bold", textDecoration: "none" }}>Family Tree</a>
      <div>
        {session ? (
          <>
            <span style={{ marginRight: 12 }}>Hello, {session.user.name}</span>
            <button onClick={handleSignOut}>Sign Out</button>
          </>
        ) : (
          <a href="/login">Sign In</a>
        )}
      </div>
    </header>
  );
}
```

**Step 4: Add Header to root route in client/src/router.tsx**

```typescript
// Replace the rootRoute component:
const rootRoute = createRootRoute({
  component: () => (
    <>
      <Header />
      <Outlet />
    </>
  ),
});
```

Add `import { Header } from "./components/Header.js";` at the top.

**Step 5: Test login/register manually**

1. Start both server and client: `cd server && npm run dev` and `cd client && npm run dev`
2. Visit http://localhost:5173/register, create an account
3. Visit http://localhost:5173/login, sign in
4. Verify header shows your name

**Step 6: Commit**

```bash
git add client/src/
git commit -m "feat: add login, register pages and header with auth state"
```

---

## Task 9: React Flow Tree View

**Files:**
- Create: `client/src/components/MemberNode.tsx`
- Modify: `client/src/routes/index.tsx`

**Step 1: Create client/src/components/MemberNode.tsx**

```typescript
import { Handle, Position } from "reactflow";

export type MemberNodeData = {
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  onClick: () => void;
};

export function MemberNode({ data }: { data: MemberNodeData }) {
  return (
    <div
      onClick={data.onClick}
      style={{
        padding: 12,
        border: "2px solid #ccc",
        borderRadius: 8,
        background: "white",
        cursor: "pointer",
        minWidth: 140,
        textAlign: "center",
      }}
    >
      <Handle type="target" position={Position.Top} />
      {data.photoUrl && (
        <img src={data.photoUrl} alt="" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }} />
      )}
      <div style={{ fontWeight: "bold" }}>{data.firstName} {data.lastName}</div>
      {data.birthDate && <div style={{ fontSize: 11, color: "#888" }}>{data.birthDate.slice(0, 4)}{data.deathDate ? `–${data.deathDate.slice(0, 4)}` : ""}</div>}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
```

**Step 2: Replace client/src/routes/index.tsx**

```typescript
import { useState, useCallback, useMemo } from "react";
import ReactFlow, { Background, Controls, MiniMap, useNodesState, useEdgesState, addEdge } from "reactflow";
import "reactflow/dist/style.css";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api.js";
import { MemberNode } from "../components/MemberNode.js";
import { MemberSidebar } from "../components/MemberSidebar.js";
import { useSession } from "../lib/auth.js";

const nodeTypes = { member: MemberNode };

type Member = {
  id: string; firstName: string; lastName: string;
  birthDate: string | null; deathDate: string | null;
  photoUrl: string | null; bio: string | null;
};
type Relationship = { id: string; memberId: string; relatedMemberId: string; type: string };

export function TreePage() {
  const { data: session } = useSession();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const { data, refetch } = useQuery<{ members: Member[]; relationships: Relationship[] }>({
    queryKey: ["tree"],
    queryFn: () => apiFetch("/members"),
  });

  const [nodes, , onNodesChange] = useNodesState([]);
  const [edges, , onEdgesChange] = useEdgesState([]);

  const flowNodes = useMemo(() => {
    if (!data) return [];
    return data.members.map((m, i) => ({
      id: m.id,
      type: "member",
      position: { x: (i % 5) * 200, y: Math.floor(i / 5) * 160 },
      data: {
        ...m,
        onClick: () => setSelectedMemberId(m.id),
      },
    }));
  }, [data]);

  const flowEdges = useMemo(() => {
    if (!data) return [];
    return data.relationships.map((r) => ({
      id: r.id,
      source: r.memberId,
      target: r.relatedMemberId,
      label: r.type === "SPOUSE" ? "spouse" : undefined,
      type: r.type === "SPOUSE" ? "straight" : "smoothstep",
    }));
  }, [data]);

  const selectedMember = data?.members.find((m) => m.id === selectedMemberId) ?? null;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 52px)" }}>
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
      {selectedMember && (
        <MemberSidebar
          member={selectedMember}
          relationships={data?.relationships ?? []}
          members={data?.members ?? []}
          isAuthenticated={!!session}
          onClose={() => setSelectedMemberId(null)}
          onRefetch={refetch}
        />
      )}
      {session && (
        <button
          style={{ position: "fixed", bottom: 24, right: 24, padding: "12px 24px", background: "#333", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}
          onClick={() => setSelectedMemberId("__new__")}
        >
          + Add Member
        </button>
      )}
    </div>
  );
}
```

**Step 3: Verify tree renders**

With both server and client running and at least one member in the DB (add via Prisma Studio: `cd server && npx prisma studio`), visit http://localhost:5173 and verify the React Flow canvas appears.

**Step 4: Commit**

```bash
git add client/src/
git commit -m "feat: add React Flow tree view with member nodes"
```

---

## Task 10: Member Sidebar

**Files:**
- Create: `client/src/components/MemberSidebar.tsx`

**Step 1: Create client/src/components/MemberSidebar.tsx**

```typescript
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api.js";
import { MemberForm } from "./MemberForm.js";
import { RelationshipForm } from "./RelationshipForm.js";

type Member = { id: string; firstName: string; lastName: string; birthDate: string | null; deathDate: string | null; photoUrl: string | null; bio: string | null };
type Relationship = { id: string; memberId: string; relatedMemberId: string; type: string };

type Props = {
  member: Member;
  members: Member[];
  relationships: Relationship[];
  isAuthenticated: boolean;
  onClose: () => void;
  onRefetch: () => void;
};

export function MemberSidebar({ member, members, relationships, isAuthenticated, onClose, onRefetch }: Props) {
  const [editing, setEditing] = useState(false);
  const [addingRelationship, setAddingRelationship] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => apiFetch(`/members/${member.id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tree"] }); onClose(); },
  });

  const deleteRelMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/relationships/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tree"] }),
  });

  const memberRelationships = relationships.filter(
    (r) => r.memberId === member.id || r.relatedMemberId === member.id
  );

  function getRelatedMember(r: Relationship) {
    const relatedId = r.memberId === member.id ? r.relatedMemberId : r.memberId;
    return members.find((m) => m.id === relatedId);
  }

  if (editing) {
    return <MemberForm member={member} onDone={() => { setEditing(false); onRefetch(); }} onCancel={() => setEditing(false)} />;
  }

  return (
    <div style={{ width: 300, borderLeft: "1px solid #eee", padding: 24, overflowY: "auto" }}>
      <button onClick={onClose} style={{ float: "right" }}>✕</button>
      {member.photoUrl && <img src={member.photoUrl} alt="" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover" }} />}
      <h2>{member.firstName} {member.lastName}</h2>
      {member.birthDate && <p>Born: {member.birthDate.slice(0, 10)}</p>}
      {member.deathDate && <p>Died: {member.deathDate.slice(0, 10)}</p>}
      {member.bio && <p>{member.bio}</p>}

      <h3>Relationships</h3>
      {memberRelationships.length === 0 && <p style={{ color: "#888" }}>None</p>}
      {memberRelationships.map((r) => {
        const related = getRelatedMember(r);
        return (
          <div key={r.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span>{r.type === "SPOUSE" ? "Spouse" : r.memberId === member.id ? "Child" : "Parent"}: {related?.firstName} {related?.lastName}</span>
            {isAuthenticated && (
              <button onClick={() => deleteRelMutation.mutate(r.id)} style={{ color: "red", background: "none", border: "none", cursor: "pointer" }}>✕</button>
            )}
          </div>
        );
      })}

      {isAuthenticated && (
        <div style={{ marginTop: 16 }}>
          {addingRelationship ? (
            <RelationshipForm
              memberId={member.id}
              members={members}
              onDone={() => { setAddingRelationship(false); onRefetch(); }}
              onCancel={() => setAddingRelationship(false)}
            />
          ) : (
            <button onClick={() => setAddingRelationship(true)}>+ Add Relationship</button>
          )}
          <div style={{ marginTop: 8 }}>
            <button onClick={() => setEditing(true)}>Edit Member</button>
            <button
              onClick={() => { if (confirm("Delete this member?")) deleteMutation.mutate(); }}
              style={{ marginLeft: 8, color: "red" }}
            >
              Delete Member
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add client/src/components/MemberSidebar.tsx
git commit -m "feat: add member detail sidebar with relationship list"
```

---

## Task 11: Member Form (Add & Edit)

**Files:**
- Create: `client/src/components/MemberForm.tsx`
- Modify: `client/src/routes/index.tsx`

**Step 1: Create client/src/components/MemberForm.tsx**

```typescript
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api.js";

type Member = { id: string; firstName: string; lastName: string; birthDate: string | null; deathDate: string | null; photoUrl: string | null; bio: string | null };

type Props = {
  member?: Member;
  onDone: () => void;
  onCancel: () => void;
};

export function MemberForm({ member, onDone, onCancel }: Props) {
  const [firstName, setFirstName] = useState(member?.firstName ?? "");
  const [lastName, setLastName] = useState(member?.lastName ?? "");
  const [birthDate, setBirthDate] = useState(member?.birthDate?.slice(0, 10) ?? "");
  const [deathDate, setDeathDate] = useState(member?.deathDate?.slice(0, 10) ?? "");
  const [bio, setBio] = useState(member?.bio ?? "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      let photoUrl = member?.photoUrl;
      if (photoFile) {
        const form = new FormData();
        form.append("file", photoFile);
        const upload = await fetch("/api/upload", { method: "POST", credentials: "include", body: form });
        const data = await upload.json();
        photoUrl = data.url;
      }
      const body = { firstName, lastName, birthDate: birthDate || null, deathDate: deathDate || null, bio: bio || null, photoUrl };
      if (member) {
        return apiFetch(`/members/${member.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        return apiFetch("/members", { method: "POST", body: JSON.stringify(body) });
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tree"] }); onDone(); },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div style={{ width: 300, borderLeft: "1px solid #eee", padding: 24 }}>
      <h2>{member ? "Edit Member" : "Add Member"}</h2>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
        <div><label>First Name *<br /><input value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></label></div>
        <div><label>Last Name *<br /><input value={lastName} onChange={(e) => setLastName(e.target.value)} required /></label></div>
        <div><label>Birth Date<br /><input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} /></label></div>
        <div><label>Death Date<br /><input type="date" value={deathDate} onChange={(e) => setDeathDate(e.target.value)} /></label></div>
        <div><label>Bio<br /><textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} /></label></div>
        <div><label>Photo<br /><input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} /></label></div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <div style={{ marginTop: 12 }}>
          <button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save"}</button>
          <button type="button" onClick={onCancel} style={{ marginLeft: 8 }}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
```

**Step 2: Update TreePage to handle "+ Add Member" button**

In `client/src/routes/index.tsx`, update the + Add Member button and handle `selectedMemberId === "__new__"`:

```typescript
// Add this import at the top
import { MemberForm } from "../components/MemberForm.js";

// Replace the sidebar/add-member section in the return:
{selectedMemberId === "__new__" ? (
  <MemberForm onDone={() => { setSelectedMemberId(null); refetch(); }} onCancel={() => setSelectedMemberId(null)} />
) : selectedMember ? (
  <MemberSidebar ... />
) : null}
```

**Step 3: Commit**

```bash
git add client/src/components/MemberForm.tsx client/src/routes/index.tsx
git commit -m "feat: add member add/edit form with photo upload"
```

---

## Task 12: Relationship Form

**Files:**
- Create: `client/src/components/RelationshipForm.tsx`

**Step 1: Create client/src/components/RelationshipForm.tsx**

```typescript
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api.js";

type Member = { id: string; firstName: string; lastName: string };

type Props = {
  memberId: string;
  members: Member[];
  onDone: () => void;
  onCancel: () => void;
};

export function RelationshipForm({ memberId, members, onDone, onCancel }: Props) {
  const [relatedMemberId, setRelatedMemberId] = useState("");
  const [type, setType] = useState("PARENT_CHILD");
  const [direction, setDirection] = useState<"parent" | "child">("child");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      const isParentChild = type === "PARENT_CHILD";
      const body = isParentChild
        ? { memberId: direction === "parent" ? relatedMemberId : memberId, relatedMemberId: direction === "parent" ? memberId : relatedMemberId, type }
        : { memberId, relatedMemberId, type };
      return apiFetch("/relationships", { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tree"] }); onDone(); },
    onError: (e: Error) => setError(e.message),
  });

  const otherMembers = members.filter((m) => m.id !== memberId);

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} style={{ marginTop: 8 }}>
      <div>
        <label>Relationship Type<br />
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="PARENT_CHILD">Parent / Child</option>
            <option value="SPOUSE">Spouse</option>
          </select>
        </label>
      </div>
      {type === "PARENT_CHILD" && (
        <div>
          <label>This member is the<br />
            <select value={direction} onChange={(e) => setDirection(e.target.value as "parent" | "child")}>
              <option value="child">Child of selected</option>
              <option value="parent">Parent of selected</option>
            </select>
          </label>
        </div>
      )}
      <div>
        <label>Related Member<br />
          <select value={relatedMemberId} onChange={(e) => setRelatedMemberId(e.target.value)} required>
            <option value="">— select —</option>
            {otherMembers.map((m) => (
              <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
            ))}
          </select>
        </label>
      </div>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <div style={{ marginTop: 8 }}>
        <button type="submit" disabled={!relatedMemberId}>Add</button>
        <button type="button" onClick={onCancel} style={{ marginLeft: 8 }}>Cancel</button>
      </div>
    </form>
  );
}
```

**Step 2: Commit**

```bash
git add client/src/components/RelationshipForm.tsx
git commit -m "feat: add relationship form component"
```

---

## Task 13: Dockerfile & Docker Compose

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.dockerignore`

**Step 1: Create Dockerfile**

```dockerfile
# Stage 1: Build client
FROM node:22-alpine AS client-builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm ci
COPY client/ ./client/
RUN npm run build --workspace=client

# Stage 2: Build server
FROM node:22-alpine AS server-builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json ./server/
RUN npm ci --workspace=server --omit=dev
COPY server/ ./server/
RUN npm run build --workspace=server

# Stage 3: Production image
FROM node:22-alpine
WORKDIR /app
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=server-builder /app/server/node_modules ./server/node_modules
COPY --from=server-builder /app/server/prisma ./server/prisma
COPY --from=client-builder /app/client/dist ./client/dist
RUN mkdir -p uploads
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server/dist/index.js"]
```

**Step 2: Create docker-compose.yml**

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: ${DATABASE_URL}
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
      BETTER_AUTH_TRUSTED_ORIGIN: ${BETTER_AUTH_TRUSTED_ORIGIN:-http://localhost:3000}
      PORT: 3000
      UPLOAD_DIR: /app/uploads
    volumes:
      - uploads:/app/uploads
    restart: unless-stopped

volumes:
  uploads:
```

**Step 3: Create .dockerignore**

```
node_modules
*/node_modules
*/dist
.git
.env
uploads
```

**Step 4: Create server/.env.example**

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/vreug_tree"
BETTER_AUTH_SECRET="change-me-to-a-random-32-char-string"
BETTER_AUTH_TRUSTED_ORIGIN="http://your-unraid-ip:3000"
PORT=3000
```

**Step 5: Run Prisma migrations inside Docker before first start**

When deploying to Unraid for the first time, run:

```bash
docker compose run --rm app node -e "
const { execSync } = require('child_process');
execSync('npx prisma migrate deploy', { cwd: '/app/server', stdio: 'inherit' });
"
```

Or add a startup migration script. Simpler: just add to the CMD in Dockerfile:

```dockerfile
CMD ["sh", "-c", "cd server && npx prisma migrate deploy && cd /app && node server/dist/index.js"]
```

**Step 6: Build and test Docker image locally**

```bash
docker compose build
docker compose up
```

Visit http://localhost:3000 — should see the family tree app.

**Step 7: Commit**

```bash
git add Dockerfile docker-compose.yml .dockerignore server/.env.example
git commit -m "feat: add Docker setup for single-container deployment"
```

---

## Task 14: End-to-End Smoke Test

**Goal:** Manually verify the full user journey works before shipping.

**Step 1: Start the app**

```bash
docker compose up
```

**Step 2: Run through the checklist**

- [ ] Visit http://localhost:3000 — tree view loads (empty canvas)
- [ ] Click "Sign In" → redirected to `/login`
- [ ] Click "Create an account" → fill in name/email/password → register
- [ ] Redirected back to tree — header shows your name
- [ ] Click "+ Add Member" → fill in a family member → save → member appears on canvas
- [ ] Add a second member the same way
- [ ] Click first member → sidebar opens with name, dates, bio
- [ ] Click "Add Relationship" → link to second member as spouse → relationship edge appears
- [ ] Click "Edit Member" → change the bio → save → sidebar reflects change
- [ ] Click "Delete Member" → confirm → member and relationship removed from canvas
- [ ] Sign out → header shows "Sign In" → "+ Add Member" button gone
- [ ] Verify tree is still visible (public view)

**Step 3: Fix any issues found, commit fixes**

```bash
git add -A && git commit -m "fix: resolve smoke test issues"
```

---

## Deployment to Unraid

1. Copy the project to your Unraid server (git clone or scp)
2. Create a `.env` file with your PostgreSQL credentials and secret
3. Run `docker compose up -d`
4. (Optional) Set up Nginx Proxy Manager to give it a clean local domain like `family.local`
