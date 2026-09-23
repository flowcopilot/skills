# Skill layout evaluation, 22 September 2026

## Result

The combined layout reduces the skill text that Codex loads at startup. In these short tasks, it did not give a clear gain in answer quality or total token use. Keep the combined layout for its smaller startup cost and its single entry point. Do not claim that it improves task results from this test.

This test follows the method in [Testing Agent Skills Systematically with Evals](https://developers.openai.com/blog/eval-skills): use fixed prompts, save `codex exec --json` traces, check actions in the traces, and score the answers against a task rubric.

## Setup

- I used the six upstream revisions in [`upstreams.json`](../../upstreams.json). Each source had the same revision as the source of its combined skill.
- I installed one combined bundle or its upstream skill set in a separate temporary directory. I used symbolic links to the files. For React Native, I gave Callstack's `react-native-best-practices` a source prefix because both sources use that name.
- I used Codex CLI 0.155.1, its default model, `--ignore-user-config`, and a read-only sandbox. The default model was not pinned. The same user-level skills were available in both layouts.
- Each bundle had one direct prompt that asked Codex to read local skills, one prompt that did not name a skill, and one startup prompt (`Reply with exactly: ready`). The task prompts asked for a plan. They did not ask Codex to build an app.
- I checked the command events for local skill reads. I checked each answer for the task rules below. [`results.json`](results.json) has the prompts, commands, answers, and token counts.

## Scores

| Bundle | Skill files, combined / upstream | Startup input tokens, combined / upstream | Two task runs, input tokens, combined / upstream | Answers that passed, combined / upstream |
| --- | ---: | ---: | ---: | ---: |
| Ax | 1 / 17 | 17,733 / 18,362 | 175,560 / 177,147 | 2 / 2 |
| Cloudflare | 1 / 14 | 17,732 / 18,205 | 193,145 / 263,368 | 2 / 2 |
| Convex | 1 / 33 | 17,741 / 18,444 | 147,617 / 151,513 | 2 / 2 |
| Expo | 1 / 24 | 17,732 / 18,395 | 207,167 / 130,001 | 2 / 2 |
| React Native | 1 / 34 | 17,721 / 18,377 | 236,645 / 239,811 | 2 / 2 |
| **Total** | **5 / 122** | **88,659 / 91,783** | **960,134 / 961,840** | **10 / 10** |

The five startup runs used 3,124 fewer input tokens with the combined layout. This is 625 tokens per run on average. The combined `name` and `description` fields have 1,343 characters in total. The upstream fields have 51,236 characters. The smaller startup cost is real, but it is much smaller than the difference in field length.

The ten task runs used almost the same total input tokens. The combined layout used 1,706 fewer input tokens in total. That difference is 0.2%. Its uncached input count was 189,702 tokens, against 187,312 for upstream. Expo used much more input with the combined layout in these two runs. Cloudflare used much less. One run per prompt cannot show whether these differences will repeat.

Codex read local skill files in all 20 task runs. Each answer met these checks:

- Ax: Select the MCP and agent instructions. Use an MCP client, attach it to the agent, check authorization, and close the client.
- Cloudflare: Select Workers, R2, and Queues. Preserve the original, make repeat jobs safe, and handle failures.
- Convex: Use `cronJobs()` with an internal function. Make repeated runs safe.
- Expo: Check the current SDK, align packages, run Expo Doctor, and test native changes.
- React Native: Measure JavaScript and UI frame work, find the cause, and measure again after a change.

## Limits

The prompts asked for short read-only plans. They did not test code, builds, deployment, or a live app. The prompt that did not name a skill still asked for local file citations. This can make skill use more likely. The startup probe measured one run per layout. The task prompts had one run per layout. I did not test model variance. The model version was not pinned. The React Native upstream copy needed a source prefix for one duplicate name, so that installation is an approximation.

The combined router adds some instructions, and the import process changes some links. This is a comparison of the installed layouts at the same source revisions, not a byte-for-byte test of identical prompt text.

## Next test

Use real project fixtures and score the resulting files or code checks. Run each prompt more than once with a pinned model. Start with Expo, where the task token counts differed most. Keep direct, implicit, and unrelated prompts in the set so that the test can find missed and unwanted skill selection.
