import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  reminders: defineTable({
    expiresAt: v.number(),
    status: v.union(v.literal("pending"), v.literal("expired")),
  }).index("by_status_expiresAt", ["status", "expiresAt"]),
});
