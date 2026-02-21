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
