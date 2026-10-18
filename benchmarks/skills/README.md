# Skill benchmark inputs

This directory has 18 tasks, project fixtures, model conditions, transcript parsers, and tests. Task prompts do not name a skill to load. The runner, task check runner, and aggregate report are still missing. No code comes from `expo/eval-experiments`.

## Run the checks

Run these commands from the repository root:

```sh
bun run check
bun run check:reach
bun run bench:test
```

`check:reach` follows local references from each bundle's `SKILL.md`. Inline and reference links resolve relative to the source file. Path mentions such as `expo-router/route-structure.md`, in code or plain text, also count, because upstream skills name references that way. A mention resolves relative to the source file, the bundle's `references/` directory, or the bundle root. In a code block tree, a bare file name under a `folder/` line counts as `folder/name.md`, because the Expo routers list their references that way. Images and comments do not count. `notForAgents` in `scripts/check.ts` lists upstream files that give agents no instructions, such as collection READMEs. The check skips them, and it fails when a listed file is gone or a file starts to point to it. Each unreachable reference causes a nonzero exit code. The existing `check` stays separate. The `validate.yml` workflow runs `check:reach` on every pull request.

## Task and check schema

Each line in `tasks.jsonl` is a JSON object with these fields:

- `id` is a unique task name.
- `prompt` is the agent instruction. Keep all other fields out of the agent's context.
- `fixture` is a directory relative to this directory. Copy its contents into an isolated task workspace.
- `expectedBundles` lists bundle names.
- `requiredReferences` maps bundle names to lists of required reads. Paths are relative to each bundle root.
- `allowedReferences` has the same shape and includes every required reference. Entry reads for expected bundles are also permitted.
- `checks` lists declarative objects. These objects are not shell commands.

Every check has a `type`. File paths are relative to the task workspace:

- `route` has `pathname` and `screen`. Require that route to render the screen.
- `http-response` has `file`, `export`, `status`, `body`, and `outcome`. Stub `fetch`, then call the export. `returns-body` requires the parsed body. `throws-error` requires a rejected promise with an `Error`.
- `unchanged` has `paths`. Compare each file with its fixture bytes.
- `exists` has `path`. Require a nonempty file.
- `word-count` has `path` and `exact`. Count whitespace-separated words, including headings.
- `numbered-steps` has `path`. Require installation actions in an ordered Markdown list.
- `rubric` has `path` and `criteria`. A later reviewer or grader must assess each criterion.

`requiredReferences` is a subset of `allowedReferences` for each expected bundle. The negative control has empty `expectedBundles`, `requiredReferences`, and `allowedReferences`. Any skill read on that task is a false positive, including an entry read. This lowers bundle precision. With no reads, precision has no denominator and is reported as not applicable. Report the negative control's false-positive count separately.

## Tasks

Each new code fixture has a `package.json` with real dependency names and only the source files named in its prompt. The fixtures contain the defects that the agent must fix. Generated Convex modules and native build projects are outside these minimal fixtures. A future task checker must supply generated bindings or mocks when it executes those tasks.

| Task | Expected bundle | Work |
| --- | --- | --- |
| `expo-navigation` | expo | Make the existing settings screen reachable. |
| `expo-networking` | expo | Throw on failed HTTP responses. |
| `expo-upgrade` | expo | Write an SDK 52 to 53 upgrade plan. |
| `clarity-prose` | clarity | Rewrite an announcement in 100 words. |
| `clarity-docs` | clarity | Rewrite installation instructions as numbered steps. |
| `ax-signature` | ax | Constrain typed extraction fields. |
| `ax-candidate-selection` | ax | Score complete candidates and stop at the threshold. |
| `clerk-route-guard` | clerk | Wait for the loaded session before redirecting. |
| `clerk-webhook-verification` | clerk | Verify Express webhook signatures from raw bodies. |
| `cloudflare-d1-binding` | cloudflare | Bind an untrusted email query parameter. |
| `cloudflare-queue-retry` | cloudflare | Acknowledge or retry each message after delivery. |
| `convex-indexed-query` | convex | Replace a full scan with a bounded indexed query. |
| `convex-cron-cleanup` | convex | Use an internal, bounded, repeatable expiration job. |
| `design-toast-lifecycle` | design-engineering | Fix Sonner notifications using Emil Kowalski's source. |
| `design-form-accessibility` | design-engineering | Fix form controls using Jakub Krehel's source. |
| `react-native-gesture-callback` | react-native | Fix the gesture callback using Software Mansion's source. |
| `react-native-list-windowing` | react-native | Virtualize a large list using Callstack's source. |
| `typescript-unique-values` | none | Remove exact duplicates without sorting or mutating the input. |

All eight bundles have at least two tasks. The two React Native tasks and the two design engineering tasks each cover one task per upstream source. New tasks use the existing `exists`, `unchanged`, and `rubric` checks. No check type was added. Rubric checks require a later reviewer or grader; the dataset tests do not grade agent solutions.

## Conditions and run count

`config.json` sets four models at low effort and three repeats. Conditions apply to all tasks unless they have `taskIds`.

| Condition | Applicable tasks | Installed skills |
| --- | --- | --- |
| `no-skills` | All 18 | None. |
| `all-bundles` | All 18 | All eight Flow Copilot bundles. |
| `upstream-layout` | All 18 | Each published upstream skill from all 11 pinned sources. |
| `expo-overview-entry` | The three Expo tasks | All eight bundles, with the Expo entry variant. |

The Expo entry variant replaces the Expo entry body with `references/expo-overview.md` and preserves `name` and `description`. Transform only the installed test copy. The future runner must isolate global skills and agent instructions in every condition.

The formula is **tasks × conditions that apply × models × repeats**. For this dataset, the count is `(18 × 3 + 3 × 1) × 4 × 3 = 684` runs. The extra three task-condition pairs are the Expo entry variant. This is a planned run count, not a completed benchmark result.

## Upstream layout

This condition compares the bundles with the original published collections. `sourceManifest` resolves relative to this directory and supplies each repository URL and pinned `revision`. Each `sources` entry defines a checkout-relative `root` and an `entries` pattern. `**/SKILL.md` includes direct children and nested skills. It has no Flow Copilot bundle entry and no entry override.

The future runner builds the layout as follows:

1. Fetch each repository into a temporary sync checkout and check out the exact manifest revision. Verify `git rev-parse HEAD` against the pin. Do not use a checkout at the latest upstream HEAD. The existing sync `clone` function fetches HEAD, so calling it unchanged does not provide this guarantee. See [sync checkout code](../../scripts/sync-upstreams.ts#L49-L57).
2. Discover entries under the configured source roots. Copy upstream skill directories, support files, scripts, and agent metadata without Flow Copilot rewrites. Preserve frontmatter, invocation policies, executable modes, and relative links. Keep the source trees available so links to sibling and parent directories still resolve. Do not run the bundle adapters.
3. Expose one skill directory per discovered entry through the CLI's skill discovery mechanism. Preserve the upstream tree and use source-qualified installation aliases when directory names collide. Keep both upstream `react-native-best-practices` skills. Do not rewrite their frontmatter names or silently select one. If a CLI cannot expose both, mark the condition unsupported for that CLI and report the cause.
4. Record a map from each installed path to its source, original path, and comparison bundle, using `manifest[source].bundle ?? source`. Map original skill entries and support files to the corresponding bundled reference paths before reference scoring. For example, Clerk's `skills/frameworks/clerk-react-patterns/references/protected-routes.md` maps to `clerk/references/clerk-react-patterns/protected-routes.md`. A read of an original workflow `SKILL.md` counts as its equivalent reference read, even though the parser calls it an entry. Extra upstream skills have no equivalent reference and remain visible as extra reads. The current parsers do not implement this source map.

These sources need special handling:

- Ax publishes flat Markdown skill files under `src/ax/skills`. Install each file as its own `<skill>/SKILL.md`, retaining its upstream bytes and frontmatter. Keep source files available for links between Markdown files. The bundle adapter instead strips metadata and substitutes the package version. See [Ax import](../../scripts/sync-upstreams.ts#L201-L226).
- Convex and Cloudflare publish routers beside specialized skills under `skills/`. Keep the original routers and their support directories. The bundle adapters replace the Convex router and modify the Cloudflare router. See [Convex import](../../scripts/sync-upstreams.ts#L261-L320) and [Cloudflare import](../../scripts/sync-upstreams.ts#L324-L450).
- Expo publishes this collection under `plugins/expo/skills`, not the repository root. Include `expo-overview` and the other skills in that root. Other Expo plugins are outside this source. See [Expo import](../../scripts/sync-upstreams.ts#L454-L528).
- React Native has nested Software Mansion skills, including Gesture Handler guidance and Fishjam SDK guidance. Discover every nested `SKILL.md`, even inside another skill's `references/`. Keep Callstack separate. Both design engineering sources currently use flat skill directories. See [tree discovery](../../scripts/sync-upstreams.ts#L539-L556), [React Native import](../../scripts/sync-upstreams.ts#L594-L645), and [design engineering import](../../scripts/sync-upstreams.ts#L657-L684).
- Clerk groups skills under `core`, `features`, `frameworks`, and `mobile`. Include the root `clerk` router and all published skills. This restores the eight skills excluded from our bundle: `clerk-astro-patterns`, `clerk-nuxt-patterns`, `clerk-nextjs-patterns`, `clerk-react-router-patterns`, `clerk-vue-patterns`, `clerk-chrome-extension-patterns`, `clerk-swift`, and `clerk-android`. Preserve upstream support directories, including templates and evaluations. See [selection](../../scripts/sync-upstreams.ts#L912-L970) and [support-file exclusions](../../scripts/sync-upstreams.ts#L996-L1014).
- Clarity imports only four pstack skills from `pstack/skills` and two Matt Pocock skills from `skills/productivity`. The baseline installs the full published `pstack/skills` and Matt Pocock `skills` trees, including their routers. It excludes other Cursor plugins. Do not add Flow Copilot's `figure-it-out`, model role table, or implicit-invocation policy. Preserve the published `wait-what` name. See [selected subset](../../scripts/sync-upstreams.ts#L715-L736), [invocation checks](../../scripts/sync-upstreams.ts#L748-L757), and [local additions](../../scripts/sync-upstreams.ts#L825-L908).

The published baseline has more skills than our selected Clerk and clarity bundles. This comparison measures that scope difference as well as layout and invocation policy. It is not a layout-only ablation. Report those differences with the results.

## Upstream routers and our entries

Here, an overview can cover a focused subject rather than every skill in a repository. A modified copy retains upstream routing content. Flow Copilot text creates a new entry, even when it keeps an upstream table or rule section.

| Bundle | Upstream router or overview | Our entry | Sync evidence |
| --- | --- | --- | --- |
| ax | Yes, `ax-llm` overview. | Flow Copilot text. | [Overview check](../../scripts/sync-upstreams.ts#L211-L216), [new entry](../../scripts/sync-upstreams.ts#L229-L257). |
| clarity | Yes, pstack `poteto-mode`; Matt Pocock also publishes `ask-matt` outside our subset. | Flow Copilot text, with pstack reply rules. | [pstack source](../../scripts/sync-upstreams.ts#L771-L781), [subset](../../scripts/sync-upstreams.ts#L718-L729), [new entry](../../scripts/sync-upstreams.ts#L851-L908). |
| clerk | Yes, root `clerk` skill. | Flow Copilot text, with the upstream version table. | [Root read](../../scripts/sync-upstreams.ts#L970), [version table and new entry](../../scripts/sync-upstreams.ts#L1055-L1086). |
| cloudflare | Yes, root `cloudflare` skill. | Modified copy of the upstream router. | [Root lookup](../../scripts/sync-upstreams.ts#L328-L331), [body changes](../../scripts/sync-upstreams.ts#L398-L447). |
| convex | Yes, root `convex` skill. | Flow Copilot text. | [Root lookup](../../scripts/sync-upstreams.ts#L265-L268), [new entry](../../scripts/sync-upstreams.ts#L290-L320). |
| design-engineering | Yes, Emil's `emil-design-eng` overview and Jakub's `better-interface` router. | Flow Copilot text. | [New entry and overview links](../../scripts/sync-upstreams.ts#L690-L711). |
| expo | Yes, `expo-overview`. The directory README also has a routing index. | Modified copy of the README index, with Flow Copilot instructions. | [Overview and index](../../scripts/sync-upstreams.ts#L459-L473), [entry](../../scripts/sync-upstreams.ts#L514-L527). |
| react-native | Yes, each source has a `react-native-best-practices` overview. | Flow Copilot text. | [Overview checks](../../scripts/sync-upstreams.ts#L597-L600), [new entry](../../scripts/sync-upstreams.ts#L628-L648). |

The sync script does not import Matt Pocock's router. Its existence is verified in the [pinned `ask-matt` entry](https://github.com/mattpocock/skills/blob/f3fc5632f401156837ee3872f14fe33ccf1024ea/skills/engineering/ask-matt/SKILL.md#L1-L6). The overview bodies retained in [Ax](../../skills/ax/references/ax-llm.md), [Emil's source](../../skills/design-engineering/references/emil-kowalski/emil-design-eng/index.md), and [Jakub's source](../../skills/design-engineering/references/jakub-krehel/better-interface/index.md) establish their roles beyond the sync script's file discovery.

## Description formats

`variants/descriptions.json` has three description formats for all 8 bundles. `imperative` starts with "Always apply this skill when". `when-how-what` uses three plain sentences. `labeled` puts the same content after `When:`, `How:`, and `What:` labels. The bundles used `when-how-what` until the description part results below. They now use `w-wh` from `variants/formats.json`, and `AGENTS.md` makes it the rule.

T3 `delegate_task` ran each task once per model on October 17, 2026, with low effort. Each cell shows the tasks that loaded the expected bundle, out of 17, and the required references read, out of 22. "Before" is the description at commit `14f833e`.

| Harness and model | Before | Imperative | Sentences | Labels |
| --- | --- | --- | --- | --- |
| Codex `gpt-6-luna` | 0, 0 | 3, 3 | 3, 4 | 5, 4 |
| Codex `gpt-6.1-sol` | 17, 13 | 17, 15 | 17, 15 | 17, 15 |
| Claude Code `claude-haiku-5-5` | 1, 1 | 5, 5 | 10, 5 | 3, 3 |
| Claude Code `claude-sonnet-5-5` | 4, 1 | 7, 3 | 15, 5 | 11, 5 |
| Cursor `grok-4.7` | 17, 12 | | 16, 17 | 17, 17 |
| Cursor `gemini-4-argon` | 17, 22 | | 17, 20 | 17, 21 |
| OpenCode `deepseek-v4.1-flash-free` | 7, 5 | | 7, 9 | 5 of 11, 6 of 14 |
| OpenCode `glm-5.3-flash-free` | 4, 5 | | 2, 2 | 4 of 11, 5 of 14 |
| Pi `xai/grok-4.7` | 17, 22 | | 17, 22 | 17, 21 |

The imperative format ran only on Codex and Claude Code. The OpenCode free tier hit its rate limit during the labels run, so those cells count only the 11 tasks that finished. No run loaded a skill on the negative control. One run per cell is a small sample, so a difference of one or two tasks is noise.

## Description parts

`variants/formats.json` splits the `when-how-what` text into parts and recombines them. W is the "Load this skill before you" sentence. H is the "Then read SKILL.md and open only the reference" sentence, and HS is the same sentence without "read SKILL.md". Wh is the "Covers" sentence. M joins W and Wh in one sentence with "including". A puts W, HS, and Wh in one sentence.

T3 `delegate_task` ran each task 3 times per model on October 18, 2026, with low effort. Each cell shows the runs that loaded the expected bundle, out of 51, and the required references read, out of 66. `AGENTS.md` and `CLAUDE.md` were removed from the repository root during the runs, except in the last row.

| Variant | Codex `gpt-6-luna` | Claude Code `claude-haiku-5-5` | Claude Code `claude-sonnet-5-5` |
| --- | --- | --- | --- |
| W, H, Wh (current) | 10, 8 | 25, 10 | 41, 18 |
| W, HS, Wh | 5, 6 | 27, 13 | 37, 17 |
| W, Wh (now in use) | 5, 6 | 32, 12 | 41, 14 |
| HS, Wh | 0, 0 | 0, 0 | 11, 9 |
| Wh, W, HS | 0, 0 | 24, 7 | 45, 21 |
| W | 11, 10 | 29, 10 | 46, 19 |
| M, HS | 11, 11 | 29, 15 | 41, 15 |
| M | 7, 5 | 31, 10 | 40, 16 |
| A | 8, 7 | 21, 12 | 41, 24 |
| W, H, Wh with `AGENTS.md` | 7, 7 | 5, 3 | 27, 7 |

With 51 runs, the 95% interval of a count near 25 is about plus or minus 7. Differences between the variants that start with W are inside that interval. Three effects are larger. Without W, loads fall to 0 for Luna and Haiku. With Wh first, Luna loads nothing. The repository `AGENTS.md` and `CLAUDE.md` lower Haiku from 25 to 5 and Sonnet from 41 to 27 with the same descriptions.

DeepSeek on the OpenCode free tier ran only the first two variants and part of the third, and then every run failed with "Rate limit exceeded". Its results are not in the table. The design-engineering tasks are among the lowest in every variant. Their trigger names UI work and has no package signal.

## When alone against When and What

This test compares W alone with W and Wh, the format now in use. Each task ran 5 times per model per variant on October 18, 2026, with low effort. The two variants alternated batch by batch. `AGENTS.md`, `CLAUDE.md`, and the global clarity rule were off. Each cell shows loads of the expected bundle out of 85 runs and required references read out of 110. The interval is a 95% bootstrap interval of the paired difference, with the task as the resampled unit.

| Model | W loads | W, Wh loads | Difference | W refs | W, Wh refs | Difference |
| --- | --- | --- | --- | --- | --- | --- |
| Codex `gpt-6-luna` | 15 | 10 | -5 (-18 to 7) | 18 | 5 | -13 (-32 to 1) |
| Claude Code `claude-haiku-5-5` | 49 | 63 | +14 (3 to 26) | 25 | 22 | -3 (-9 to 4) |
| Claude Code `claude-sonnet-5-5` | 74 | 80 | +6 (-4 to 19) | 25 | 23 | -2 (-12 to 9) |
| All three | 138 of 255 | 153 of 255 | +15 (-6 to 37) | 68 of 330 | 50 of 330 | -18 (-41 to 2) |

Only the Haiku load gain excludes 0 at 95%. At 99%, its interval is -1 to 30, so the gain does not survive a correction for three models. No other difference excludes 0. No run failed, and the negative control had no false loads.

## Transcript parsers

`src/claude.ts` exports `parseClaudeTranscript`. `src/codex.ts` exports `parseCodexTranscript`. Each accepts a JSONL string or parsed event array and returns `{ bundle, path, tool, complete }` reads. Invalid JSON throws. Options accept a fallback `cwd` and additional absolute `skillRoots`.

The parsers recognize `.claude/skills`, `.agents/skills`, and `.codex/skills`. Failed or unfinished reads do not count. Duplicate event IDs count once. Successful `Skill` calls map to `SKILL.md`. Shell support covers literal `cat`, `head`, numeric `sed -n` ranges, shell wrappers, and `cd` with `&&`. Listings, dynamic commands, and uncertain command statuses do not count. Transcript commands never execute.

`head`, `sed -n`, and `Read` with `limit` or `offset` are partial. Other supported reads are complete. This flag describes the requested range, not guaranteed delivery or use by the agent.

## Real capture fixtures

One capture per CLI succeeded on October 17, 2026. Claude Code `2.1.301` used `claude-haiku-5-5` at low effort with `--output-format stream-json --verbose`. Codex CLI `0.163.0` used `gpt-6-luna` at low effort with `exec --json`. Both read `skills/expo/SKILL.md`.

The fixtures retain tool events and file output. Unrelated metadata is removed. The worktree prefix becomes `/workspace`. Tests map that repository directory through `skillRoots`.

Both outputs matched the requested fields. Claude omitted `is_error` on success. Codex wrapped its command in `/bin/zsh -lc` and supplied no event `cwd`. Hand-written tests cover the remaining cases without more model runs.
