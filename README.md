# Flow Copilot skills

Agent skills maintained by Flow Copilot.

## Available skills

- [`ax`](skills/ax/SKILL.md): Build and operate TypeScript LLM applications with `@ax-llm/ax` through one progressively disclosed skill.
- [`cloudflare`](skills/cloudflare/SKILL.md): Choose, build, review, and operate Cloudflare products through one progressively disclosed skill.
- [`convex`](skills/convex/SKILL.md): Build, review, test, secure, migrate, and operate Convex backends through one progressively disclosed skill.

- [`expo`](skills/expo/SKILL.md): Build, debug, upgrade, and deploy Expo apps and operate EAS through one progressively disclosed skill.

- [`react-native`](skills/react-native/SKILL.md): Build, profile, upgrade, and migrate React Native apps with Software Mansion and Callstack community skills.

Each directory under `skills/` follows the [Agent Skills specification](https://agentskills.io/specification). Install the whole skill directory, not an individual file from `references/`.

## Sources

The `ax` skill combines the TypeScript skill set from `ax-llm/ax`. Its router selects focused references for providers, generation, agents, memory, MCP, workflows, optimization, and other Ax subsystems.

The `convex` skill combines the upstream `get-convex/agent-skills` collection into one skill. Its `SKILL.md` routes agents to focused reference files. This keeps one skill description in startup context instead of one description for each Convex workflow.

The `cloudflare` skill applies the same structure to the upstream `cloudflare/skills` collection. It keeps Cloudflare's product directory, detailed guides, and Turnstile scripts behind one entry file.

The `expo` skill tracks all skills in `expo/skills` under `plugins/expo/skills`. Its router uses that directory’s README index and preserves the framework and paid-service groups. Experimental skills in other plugins are outside this source.

The `react-native` skill combines all skills from `software-mansion-labs/skills` and `callstackincubator/agent-skills`, including nested skills. Each source has its own reference directory and revision, so duplicate names such as `react-native-best-practices` remain separate. More community sources can join this bundle.

See [`NOTICE.md`](NOTICE.md) for the upstream revision and modification notice.
See [`DEVELOPMENT.md`](DEVELOPMENT.md) to add another upstream skill source.

## Updates

Run `bun run sync` to fetch all upstream repositories and regenerate the combined skills. Use `bun run sync --only expo` to update Expo alone, or `bun run sync --only react-native` to update both React Native sources together. Run `bun run validate` after the update.

The weekly GitHub Action runs the same commands. When upstream content changes, it updates `automation/sync-upstream-skills`. It opens a pull request when the repository has a `SKILLS_SYNC_TOKEN` secret with Contents and Pull requests write access. The Flow Copilot organization currently blocks pull requests from the default `GITHUB_TOKEN`, so the Action otherwise provides a manual pull-request link in its run summary. The Action does not merge the pull request.

## Validation

Set up the pinned Agent Skills reference validator once (Python 3.11 or later):

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-validation.txt
bun run validate
```

`bun run validate` discovers every bundle under `skills/`, runs the [Agent Skills reference validator](https://agentskills.io/specification#validation), checks frontmatter field types, and runs the repository checks and regression tests. Repository checks cover local Markdown links, workflow routes, source attribution, licenses, bundled script paths, and source separation. `bun run check` remains available for the Bun-only checks.

Validation runs on pull requests, pushes to `main`, and after the weekly sync. Format validation does not test instruction accuracy or agent output quality. The 500-line limit and one entry file per bundle are repository rules; reference depth and token budgets remain authoring guidance.
