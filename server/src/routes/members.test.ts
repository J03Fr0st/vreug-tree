import { describe, it, expect, vi } from "vitest";
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
  requireAuth: vi.fn(async (_c: unknown, next: () => Promise<void>) => await next()),
}));

import { db } from "../db.js";

const app = new Hono();
app.route("/api/members", membersRouter);

describe("GET /api/members", () => {
  it("returns members and relationships", async () => {
    vi.mocked(db.member.findMany).mockResolvedValue([
      {
        id: "1",
        firstName: "John",
        lastName: "Doe",
        birthDate: null,
        deathDate: null,
        photoUrl: null,
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
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
    const created = {
      id: "2",
      firstName: "Jane",
      lastName: "Doe",
      birthDate: null,
      deathDate: null,
      photoUrl: null,
      bio: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
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
