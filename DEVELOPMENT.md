# Development

This repository combines each supported upstream skill collection into one Agent Skills package. The generated `SKILL.md` is a small router. The original workflow instructions live under `references/` and load only when the task needs them.

Do not edit generated files under `skills/` by hand. Change `scripts/sync-upstreams.ts`, then regenerate them.

## Requirements

- Git
- [Bun](https://bun.sh/)
- [uv](https://docs.astral.sh/uv/) with Python 3.11 or later
- `actionlint` for GitHub Actions checks

## Add an upstream source

### 1. Check the source

Confirm these points before code changes:

- The repository publishes skill folders or plain Markdown skill sources that the adapter can read.
- Each `SKILL.md` has YAML frontmatter with string `name` and `description` fields.
- The source license permits redistribution and modification.
- One upstream skill can act as the combined router, or you can write a small router in the adapter.
- References and scripts can remain inside one Agent Skills package.

The current generator accepts Apache License 2.0 sources and explicitly handles MIT for Expo, including its bundled copyright notices. If a source uses another license, add explicit license handling before you import it. Update the generated frontmatter and `NOTICE.md` text for that license.

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
type Manifest = Record<"ax" | "cloudflare" | "convex" | "expo" | "software-mansion" | "callstack" | "clerk" | "example", SourceConfig>;
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
- `sourceMarkdownSkills` reads and sorts a directory of Markdown skill sources.
- `resetDirectory` removes the previous generated package with a path guard.
- `writeMarkdown` adds the source revision notice and normalizes Markdown.
- `copyTree` copies nested references or scripts.
- `frontmatter` writes metadata for the combined skill.
- `workflowList` builds router links from upstream names and descriptions.

Rewrite relative links after files move. A link that was relative to a sub-skill directory will usually need the sub-skill name as a prefix. Add a guard for any source-specific rewrite that depends on exact upstream text. The guard must stop the sync when that text changes.

Keep the combined router short. It must tell the agent when to load each workflow reference. Shared rules can stay in the router. Detailed workflow instructions belong in references.

### 4. Connect the adapter

In `syncBundle` and the bundle registry:

1. Add the bundle to `bundleNames`, then clone its registered source with `clone("example")`.
2. Check its license.
3. Run `syncExample`.
4. Store its revision and workflow list in `manifest.example`.
5. Return its attribution and modification section for `NOTICE.md`. The main loop replaces only the selected bundle’s notice.

The general checker reads every entry in `upstreams.json`. It will then check that each recorded workflow has a reference and a router link. Add a source-specific check to `scripts/check.ts` when the source has required scripts, fixed files, or another rule that the general checks cannot prove.

### 5. Document the skill

Add the combined skill to the list in `README.md`. State what it covers and why one router replaces the upstream skill set.

The GitHub workflow already stages `NOTICE.md`, `upstreams.json`, and the full `skills/` directory. A new source does not need another staging rule.

## Generate and check

Run:

```sh
bun run sync
bun run check
uv run --script scripts/validate.py
git diff --check
actionlint .github/workflows/*.yml
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

## Expo source

Expo imports `plugins/expo/skills`. The adapter uses the skill directory README tables as the router and requires the index to match the discovered skills. It preserves helper scripts, standalone supporting files, and MIT license notices. Plugin metadata, hooks, and other plugin directories are excluded. Run `bun run sync --only expo` to update this source without updating the other collections.

## Clerk source

Clerk imports a subset of `skills/` from `clerk/skills`. The `clerkSelection` constant in `scripts/sync-upstreams.ts` chooses skills by category: `"all"` imports every current and future skill in that category, and a list imports only the named skills. The sync stops when Clerk adds a category or removes a listed skill. To bundle another Clerk skill, add it to that constant and run `bun run sync --only clerk`.

The upstream `clerk` router is not imported as a workflow. The generated router keeps its version table and lists the skills this bundle excludes. Evaluation fixtures and starter templates are not imported because no imported instruction reads them. Backend API scripts move to `scripts/clerk-backend-api/` and keep their executable mode.

The repository has no standalone LICENSE file. Its README and Codex plugin metadata declare MIT; the plugin metadata is retained under `licenses/`.

## Multiple sources in one bundle

The `software-mansion` and `callstack` manifest entries both set `"bundle": "react-native"`. Each retains its repository, revision, and workflow list. The checker uses `bundle` as the output directory when present.

The React Native adapter discovers every `SKILL.md` recursively under each source's `skills/` directory. It preserves each source tree under `references/<source>/`, converts entry files to `index.md`, and rewrites local entry-file references. It rejects filename collisions before replacing the package. Agent UI metadata is excluded; other supporting files are preserved. No helper scripts are currently present in these sources; any future scripts remain within their source tree so their relative dependencies stay valid.

Both sources declare MIT. Callstack's license and copyright notice are copied. Software Mansion has no standalone license file; its plugin marketplace metadata, including the MIT declaration and author, is retained under `licenses/`.

To add another community, register a separate manifest entry with `bundle: react-native`, add it to the adapter's source list, and implement its license validation and attribution. Keep paths qualified by source. Update the router's source selection guidance and the checker. Do not merge files based only on an upstream skill name.

Run `bun run sync --only react-native` to update both sources together. The default sync and weekly workflow include this bundle. The `--only` option also accepts the other bundle names.

## Repository validation

Run `bun run check` and `uv run --script scripts/validate.py` to run every validation layer without fetching or regenerating skill sources. The Python script declares its pinned dependencies. `uv` installs them when it runs the script.

The reference implementation is pinned to an exact `agentskills/agentskills` commit. `scripts/validate.py` calls `skills_ref.validate` for each bundle, then checks optional field types against the published specification. It reports all bundle errors and returns a nonzero exit code on failure, including an empty skill collection or a missing root entry file.

`scripts/check.ts` adds repository rules: one root entry file per bundle, at most 500 lines, manifest routes, source-specific provenance and license checks. Lychee checks local Markdown links. `mise.toml` defines Bun, uv, and Lychee. These are separate from standards compliance. This does not verify external URLs, execute imported helper scripts, or evaluate the accuracy or safety of imported instructions. Deep reference paths are permitted by the checker; the specification recommends keeping reference chains shallow.

Both `.github/workflows/validate.yml` and the sync workflow run all validation commands. To update the reference validator, review its changes, update the pinned commit and dependency versions, and run the full suite. Do not change the pin automatically during source sync.
