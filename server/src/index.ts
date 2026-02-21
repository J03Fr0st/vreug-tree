import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth.js";
import { membersRouter } from "./routes/members.js";
import { relationshipsRouter } from "./routes/relationships.js";
import { uploadRouter } from "./routes/upload.js";

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
app.route("/api/upload", uploadRouter);

// Serve uploaded files
app.use(
  "/uploads/*",
  serveStatic({
    root: process.env.UPLOAD_DIR ?? "./uploads",
    rewriteRequestPath: (path) => path.replace("/uploads", ""),
  })
);

// Serve static frontend files (production)
app.use("*", serveStatic({ root: "../client/dist" }));
// SPA fallback
app.get("*", serveStatic({ path: "../client/dist/index.html" }));

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on http://localhost:${port}`);
});
