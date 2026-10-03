<!-- Modified by Flow Copilot from get-convex/agent-skills revision 2cfe645c87f971242cfc8ef3eb53662cbec26a53. -->

# Add scheduled jobs (crons)

Define recurring jobs in convex/crons.ts targeting internal functions, with sane intervals and idempotent handlers.

## Workflow

1. Create convex/crons.ts with cronJobs().
2. Schedule internal functions (never public api.*) at the right interval.
3. Make handlers idempotent (safe to re-run); keep each run small.
4. Verify the job appears in the dashboard schedule.

## Rules

- Schedule internal.* functions, never api.*.
- Keep cron handlers small + idempotent.
- Don't poll tight intervals for things a subscription can push.
