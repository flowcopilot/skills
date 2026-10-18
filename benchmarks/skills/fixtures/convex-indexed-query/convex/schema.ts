import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    projectId: v.string(),
    title: v.string(),
    status: v.union(v.literal("open"), v.literal("done")),
  }),
});
