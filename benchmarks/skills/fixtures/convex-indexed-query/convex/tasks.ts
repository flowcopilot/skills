import { query } from "./_generated/server";
import { v } from "convex/values";

export const listOpen = query({
  args: { projectId: v.string() },
  handler: async (ctx, { projectId }) => {
    const tasks = await ctx.db.query("tasks").collect();
    return tasks.filter((task) => task.projectId === projectId && task.status === "open");
  },
});
