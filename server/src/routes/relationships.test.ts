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
  requireAuth: vi.fn(async (_c: unknown, next: () => Promise<void>) => await next()),
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
    vi.mocked(db.relationship.create).mockResolvedValue(created as never);

    const res = await app.request("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: "1", relatedMemberId: "2", type: "SPOUSE" }),
    });
    expect(res.status).toBe(201);
  });
});
