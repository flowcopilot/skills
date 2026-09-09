# Development

This repository combines each supported upstream skill collection into one Agent Skills package. The generated `SKILL.md` is a small router. The original workflow instructions live under `references/` and load only when the task needs them.

Do not edit generated files under `skills/` by hand. Change `scripts/sync-upstreams.ts`, then regenerate them.

## Requirements

- Git
- [Bun](https://bun.sh/)
- `actionlint` for GitHub Actions checks

## Add an upstream source

### 1. Check the source

Confirm these points before code changes:

- The repository has `skills/<name>/SKILL.md` directories.
- Each `SKILL.md` has YAML frontmatter with string `name` and `description` fields.
- The source license permits redistribution and modification.
- One upstream skill can act as the combined router, or you can write a small router in the adapter.
- References and scripts can remain inside one Agent Skills package.

The current generator accepts Apache License 2.0 sources. If a source uses another license, add explicit license handling before you import it. Update the generated frontmatter and `NOTICE.md` text for that license.

### 2. Register the source

Add an entry to `upstreams.json`:

```json
"example": {
  "repository": "https://github.com/example/skills.git",
  "revision": "",
  "workflows": []
}
```

The sync command replaces `revision` with the imported commit SHA. It also replaces `workflows` with the generated workflow list. Do not maintain those two values by hand after the first sync.

Add the new key to the `Manifest` type in `scripts/sync-upstreams.ts`:

```ts
type Manifest = Record<"cloudflare" | "convex" | "example", SourceConfig>;
```

### 3. Add a source adapter

Add `syncExample(checkout: Checkout)` beside the existing `syncConvex` and `syncCloudflare` functions. The adapter must produce this layout:

```text
skills/example/
|-- SKILL.md
|-- references/
|   |-- workflow-a.md
|   `-- workflow-a/
|       `-- detail.md
`-- scripts/
    `-- workflow-a/
        `-- helper.sh
```

The package must contain only one file named `SKILL.md`. Convert each upstream sub-skill body into `references/<skill-name>.md`. Put that sub-skill's supporting files under `references/<skill-name>/`. Put its scripts under `scripts/<skill-name>/`.

Use the shared helpers where they fit:

- `sourceSkills` reads and sorts upstream skills.
- `resetDirectory` removes the previous generated package with a path guard.
- `writeMarkdown` adds the source revision notice and normalizes Markdown.
- `copyTree` copies nested references or scripts.
- `frontmatter` writes metadata for the combined skill.
- `workflowList` builds router links from upstream names and descriptions.

Rewrite relative links after files move. A link that was relative to a sub-skill directory will usually need the sub-skill name as a prefix. Add a guard for any source-specific rewrite that depends on exact upstream text. The guard must stop the sync when that text changes.

Keep the combined router short. It must tell the agent when to load each workflow reference. Shared rules can stay in the router. Detailed workflow instructions belong in references.

### 4. Connect the adapter

In the main `try` block:

1. Clone the registered source with `clone("example")`.
2. Check its license.
3. Run `syncExample`.
4. Store its revision and workflow list in `manifest.example`.
5. Add its attribution and modification statement to the generated `NOTICE.md` content.

The general checker reads every entry in `upstreams.json`. It will then check that each recorded workflow has a reference and a router link. Add a source-specific check to `scripts/check.ts` when the source has required scripts, fixed files, or another rule that the general checks cannot prove.

### 5. Document the skill

Add the combined skill to the list in `README.md`. State what it covers and why one router replaces the upstream skill set.

The GitHub workflow already stages `NOTICE.md`, `upstreams.json`, and the full `skills/` directory. A new source does not need another staging rule.

## Generate and check

Run:

```sh
bun run sync
bun run check
git diff --check
actionlint .github/workflows/sync-upstreams.yml
```

Run `bun run sync` a second time. The second run must produce the same files as the first run. Review the complete generated diff, including deleted files and moved references.

Check these results before commit:

- `skills/<name>/SKILL.md` is the only `SKILL.md` in the package.
- Every workflow in `upstreams.json` has a router link.
- All local Markdown links resolve after the move.
- Required scripts keep their executable mode.
- Generated files name the source repository and exact commit SHA.
- `NOTICE.md` names the source license and describes the modifications.
- The router stays within the Agent Skills size limit.

## Routine updates

After an adapter exists, `bun run sync` handles routine upstream changes. It discovers added and removed skill directories, regenerates the workflow list, copies references and scripts, and updates revision data.

Manual work is required when an upstream repository changes its directory layout, link form, license, or router text used by a guarded transformation. Fix the adapter and its checks. Do not weaken a guard only to make the update pass.

## Commit and release

Use a scoped Conventional Commit. Examples:

```text
feat(example): add combined upstream skill
fix(example): adapt to upstream link layout
chore(skills): sync upstream sources
```

Push changes through a pull request. The scheduled workflow updates `automation/sync-upstream-skills` and opens the pull request with `SKILLS_SYNC_TOKEN`. It never merges the pull request.
