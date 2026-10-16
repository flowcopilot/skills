import { mutation } from "./_generated/server";

export const expire = mutation({
  args: {},
  handler: async (ctx) => {
    const reminders = await ctx.db.query("reminders").collect();
    for (const reminder of reminders) {
      if (reminder.expiresAt <= Date.now()) {
        await ctx.db.patch(reminder._id, { status: "expired" });
      }
    }
    return null;
  },
});
