# Flow Copilot skills

Agent skills maintained by Flow Copilot.

## Available skills

- [`convex`](skills/convex/SKILL.md): Build, review, test, secure, migrate, and operate Convex backends through one progressively disclosed skill.

Each directory under `skills/` follows the [Agent Skills specification](https://agentskills.io/specification). Install the whole skill directory, not an individual file from `references/`.

## Convex source

The `convex` skill combines the upstream `get-convex/agent-skills` collection into one skill. Its `SKILL.md` routes agents to focused reference files. This keeps one skill description in startup context instead of one description for each Convex workflow.

See [`NOTICE.md`](NOTICE.md) for the upstream revision and modification notice.
