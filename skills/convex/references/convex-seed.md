<!-- Modified by Flow Copilot from get-convex/agent-skills revision 0aa10576821c6928f6a0f498c087af4ee231536e. -->

# Seed / import data

Populate tables via an internalMutation seed function (re-runnable) or `npx convex import`, matching the schema.

## Workflow

1. For fixtures: write an internalMutation that inserts sample rows; run it with `npx convex run`.
2. For bulk import: shape the data to the schema and use `npx convex import`.
3. Make seeding idempotent (clear-then-insert or upsert) so re-running is safe.
4. Verify row counts.

## Rules

- Seed via internalMutation or convex import, matching validators.
- Make seeding idempotent.
- Never seed secrets/PII into a shared deployment.
