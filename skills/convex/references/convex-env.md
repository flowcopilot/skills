<!-- Modified by Flow Copilot from get-convex/agent-skills revision 191a5c33a7e7a22ec9d5ff13930f84748bbcf8f8. -->

# Manage env vars + secrets

Store secrets as Convex deployment env vars (npx convex env set), read them with process.env in actions, never commit them.

## Workflow

1. `npx convex env set KEY value` (per deployment).
2. Read via process.env.KEY inside actions (not queries/mutations).
3. Never hardcode or commit secrets; add to .env.local only for local.
4. Confirm it's set with `npx convex env list --names-only`, which lists names without printing the secret values.

## Rules

- Secrets live in Convex env vars, never in code or git.
- process.env only in actions ('use node' if needed), not queries/mutations.
- Different deployments need their own values.
- Check what is set with `npx convex env list --names-only`; never print secret values into the conversation.
