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
