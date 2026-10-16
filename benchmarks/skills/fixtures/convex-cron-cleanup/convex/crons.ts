import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();
crons.interval("expire reminders", { hours: 1 }, api.reminders.expire, {});
export default crons;
