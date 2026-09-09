# Flow Copilot skills

Agent skills maintained by Flow Copilot.

## Available skills

- [`ax`](skills/ax/SKILL.md): Build and operate TypeScript LLM applications with `@ax-llm/ax` through one progressively disclosed skill.
- [`cloudflare`](skills/cloudflare/SKILL.md): Choose, build, review, and operate Cloudflare products through one progressively disclosed skill.
- [`convex`](skills/convex/SKILL.md): Build, review, test, secure, migrate, and operate Convex backends through one progressively disclosed skill.

Each directory under `skills/` follows the [Agent Skills specification](https://agentskills.io/specification). Install the whole skill directory, not an individual file from `references/`.

## Sources

The `ax` skill combines the TypeScript skill set from `ax-llm/ax`. Its router selects focused references for providers, generation, agents, memory, MCP, workflows, optimization, and other Ax subsystems.

The `convex` skill combines the upstream `get-convex/agent-skills` collection into one skill. Its `SKILL.md` routes agents to focused reference files. This keeps one skill description in startup context instead of one description for each Convex workflow.

The `cloudflare` skill applies the same structure to the upstream `cloudflare/skills` collection. It keeps Cloudflare's product directory, detailed guides, and Turnstile scripts behind one entry file.

See [`NOTICE.md`](NOTICE.md) for the upstream revision and modification notice.
See [`DEVELOPMENT.md`](DEVELOPMENT.md) to add another upstream skill source.

## Updates

Run `bun run sync` to fetch both upstream repositories and regenerate the combined skills. Run `bun run check` after the update.

The weekly GitHub Action runs the same commands. When upstream content changes, it updates `automation/sync-upstream-skills`. It opens a pull request when the repository has a `SKILLS_SYNC_TOKEN` secret with Contents and Pull requests write access. The Flow Copilot organization currently blocks pull requests from the default `GITHUB_TOKEN`, so the Action otherwise provides a manual pull-request link in its run summary. The Action does not merge the pull request.
