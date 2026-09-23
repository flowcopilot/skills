# Skill layout evaluation in Claude Code, 22 September 2026

## Result

In Claude Code, the combined layout helps. When all five bundles are installed together:

- The agent loaded the correct workflow instructions in 60 of 60 task runs with the combined layout. In 2 of these runs, it first called a skill that does not exist (see [Problems found](#problems-found)). With the upstream layout, it loaded them in 51 of 60 runs.
- Each session starts with 8,400 fewer input tokens (15,684 against 24,090).
- Answer quality was a little higher with the combined layout (mean judge score 2.78 against 2.52 of 4). This difference is small and not certain (see [Scores](#scores)).
- Neither layout loaded a skill for an unrelated prompt (0 of 12 runs each).

Task runs with the combined layout used more input tokens (median 67,809 against 53,326) because the agent reads the router and then the reference. Total cost for all 72 runs was lower with the combined layout ($4.75 against $5.48), because the smaller startup prompt costs less in each run.

This test follows the recommendations in the [Codex evaluation](../layout-2026-09-22/report.md): prompts that do not name skills, more than one run for each prompt, a pinned model, and unrelated prompts.

## Setup

- Claude Code 2.1.280, model `claude-sonnet-5`, default effort.
- Two project directories. Each has `.claude/skills/` with all five bundles: 5 combined skills, or 122 upstream skills at the revisions in [`upstreams.json`](../../upstreams.json). The upstream checkouts come from the Codex evaluation. Callstack's `react-native-best-practices` has the name `callstack-react-native-best-practices` to prevent a collision with the Software Mansion skill.
- `--setting-sources project` removes user skills. `--strict-mcp-config` with an empty configuration removes MCP servers. Built-in Claude Code skills stay in both layouts.
- Tools: `Skill`, `Read`, `Glob`, `Grep`. No network and no edits.
- 24 prompts: 4 for each bundle, and 4 unrelated prompts (Python, Supabase, Vercel, Flutter). No prompt names a skill or tells the agent to read local files. Each prompt ends with "Do not edit files. Keep the answer under 400 words."
- 3 runs for each prompt and layout: 144 runs.
- Trace checks: the bundle that the agent used, and whether it loaded the target workflow. For the combined layout, the target is the reference file. For the upstream layout, the target is the skill.
- A blind judge (`claude-sonnet-5`) gave each answer a score from 0 to 4 against the target reference text. The judge did not know the layout. The reference text is the same in both layouts, except for rewritten links.

[`harness/`](harness/) has the prompts and scripts. The scripts expect `cases/combined`, `cases/combined-v2` (for `run_cf.py`), `cases/upstream`, `cases/none`, and `upstream-map.txt` (lines of `<bundle> <skill>`) next to them. [`results.json`](results.json) has each trace summary, answer, and judge result.

## Scores

| Bundle | Target loaded, combined / upstream | Judge score, combined / upstream | Mean input tokens, combined / upstream | Mean cost (USD), combined / upstream |
| --- | ---: | ---: | ---: | ---: |
| Ax | 12 / 12 | 3.25 / 2.50 | 66,318 / 58,092 | 0.091 / 0.105 |
| Cloudflare | 12 / 12 | 2.75 / 2.58 | 97,501 / 77,931 | 0.093 / 0.088 |
| Convex | 12 / 12 | 3.17 / 2.83 | 60,500 / 52,027 | 0.047 / 0.056 |
| Expo | 12 / 12 | 1.92 / 2.08 | 57,884 / 46,043 | 0.054 / 0.057 |
| React Native | 12 / 12 | 2.83 / 2.58 | 95,166 / 70,838 | 0.096 / 0.095 |
| **All tasks** | **60 / 60** | **2.78 / 2.52** | **75,474 / 60,986** | **0.076 / 0.080** |
| Unrelated prompts | 0 / 12 false loads | - | 15,684 / 24,090 | 0.014 / 0.056 |

Upstream missed these targets:

| Prompt | Upstream runs that loaded the target |
| --- | ---: |
| Convex tests for todo mutations | 0 / 3 |
| Convex hourly cleanup job | 1 / 3 |
| Expo native module | 1 / 3 |
| Convex authorization audit | 2 / 3 |
| React Native 0.74 to 0.79 upgrade | 2 / 3 |

In these runs, the agent answered from its own knowledge. All missed skills were in the skill list that the model received. With 140 skills in the list, the model did not select a specific skill for some common tasks. With 23 skills, it always selected the bundle.

Judge scores, compared for each prompt: the combined layout scored higher on 8 prompts, lower on 2, and the same on 10. The mean difference is +0.27 (bootstrap 95% interval +0.05 to +0.55; two-sided sign test p = 0.11). One prompt, Ax flow, causes a large part of the difference: in all three upstream runs, the answer invented an `execute()` option. Without that prompt, the mean difference is +0.16. The two layouts load the same text for that prompt, so this is probably model variance, not a layout effect.

A missed skill did not always make the answer worse. Upstream answers that did not load the target had a mean score of 2.67. The Convex references for these tasks have only 11 or 12 lines, and they send the agent to a served Convex catalog. The skill cannot add much content without network access.

## Problems found

- The Cloudflare router refers to 16 workflows as "`name` skill", for example "`sandbox-next` skill". In 2 of 3 Cloudflare sandbox runs, the agent called `Skill("sandbox-next")`. That skill does not exist in the combined layout. The agent then read `references/sandbox-next.md`, so the answer was correct, but the call is a wasted step. Change these mentions in `scripts/sync-upstreams.ts` to links to the reference files. Some imported references also use this wording (for example, `expo/references/expo-native-ui.md` and `ax/references/ax-agent.md`).
  This problem is now fixed. See [Cloudflare rerun after the router fix](#cloudflare-rerun-after-the-router-fix).
- Both layouts scored low on the EAS Update prompt (1 of 4 in all six runs). The answers wrote channel settings in `eas.json` by hand. The reference tells the agent to use `eas update:configure`. This is a problem with how the model follows that reference, not with the layout.

## Cloudflare rerun after the router fix

`scripts/sync-upstreams.ts` now changes each "`name` skill" mention in the Cloudflare router and workflow references to a link to `references/name.md`. It links the two Sandbox names in the product table, and it removes the instructions to load named skills. A guard stops the sync if the router still names a skill. I made the new bundle from the same upstream revision (`b052c32`). The only changed files are `SKILL.md` and `references/workers-best-practices.md`.

The rerun used the four Cloudflare prompts above and four new prompts. The new prompts use product-table rows that named a skill before the fix: Turnstile, email, Worker secrets, and Access. Each prompt ran 5 times in three layouts: 120 runs. The setup, model, and judge are the same as above. [`results-cloudflare-rerun.json`](results-cloudflare-rerun.json) has the data.

| Layout | Target loaded | Runs with a call to a skill that does not exist | Mean judge score | Mean tool calls | Mean input tokens | Mean cost (USD) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Combined, before the fix | 38 / 40 | 3 / 40 | 2.70 | 2.70 | 90,524 | 0.093 |
| Combined, after the fix | 38 / 40 | **0 / 40** | 2.75 | 2.65 | 88,620 | 0.096 |
| Upstream | 38 / 40 | 0 / 40 | 2.58 | 1.62 | 66,930 | 0.072 |

- The fix removed the failed skill calls. Before the fix, 3 of 5 Sandbox runs called `Skill("sandbox-next")`. After the fix, no run called that skill.
- The other rows that named a skill did not cause failed calls before the fix. The Sandbox row was different, because it gave the bare name and no link.
- The fix did not change which reference the agent loaded, and it did not change the judge score by more than normal variance.
- The Worker secrets prompt did not load the `wrangler` reference in 2 of 5 runs in all three layouts. The agent answered from the router and its own knowledge.
- With only Cloudflare prompts, the upstream layout loaded the target as often as the combined layout, and used fewer tokens per task. Cloudflare has 14 upstream skills, and none of the misses in the full test were Cloudflare misses. The selection gain of the combined layout comes from the full installation of 122 skills, not from one bundle.

## Limits

- One model and one agent. Results for Codex are in the [earlier evaluation](../layout-2026-09-22/report.md).
- Three runs for each prompt. The quality difference needs more runs to be certain.
- The judge is one model and one call for each answer. The judge compared answers to the reference text, not to working code.
- The prompts asked for short plans in an empty directory. There were no project files, builds, or tests.
- Claude Code built-in skills were present in both layouts. They are the same in both layouts.
