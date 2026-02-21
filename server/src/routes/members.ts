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
