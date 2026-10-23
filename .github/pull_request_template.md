<!--
Write for a reviewer who will not open the files. Short prose.
Delete any section that does not apply.
-->

## Why

<!--
One or two sentences. Name the problem: a failed weekly sync, an upstream
change, or an agent that did not load or follow a skill. Link the failed run,
issue, or thread if there is one.
-->

## What changes

<!--
One picture. Pick the smallest view that makes the point:
- A before and after of a bundle `description` when the change affects when
  an agent loads the skill.
- A before and after of the router steps or rules in `SKILL.md` when the
  change affects what the agent does after it loads the skill.
- A Mermaid flowchart when the change is a procedure in
  `scripts/sync-upstreams.ts` or `scripts/check.ts`. Boxes are steps, arrows
  mean "then", and diamonds are decisions, such as a guard that stops the
  sync.
- For other changes: a diff of one file, or a short table.
Add up to three bullets for what the picture misses, including what you
left out on purpose. For a sync, name the bundles and upstream revisions
that changed, and how much of the diff is upstream content.
-->

**Look at:** <!-- the one file or decision that needs a careful look, often an adapter or guard in scripts/sync-upstreams.ts -->

## Evidence

<!--
Only what CI does not show. validate.yml runs `bun run check`,
`bun run check:reach`, `bun test benchmarks/skills`,
`uv run --script scripts/validate.py`, and offline lychee. Write "CI only"
only when those checks cover this change.

CI does not show:
- Whether an agent loads the skill and follows it. For a description or
  router change, show a run of the skill or a result of the skill discovery
  benchmark in benchmarks/skills/. Give the model and the count, for example
  "Sonnet loaded the bundle in 15 of 17 tasks".
- Generator output. After a change to `scripts/sync-upstreams.ts`, run
  `bun run sync` twice and say that the second run changed nothing.
- Workflow files (`actionlint .github/workflows/*.yml`), whitespace
  (`git diff --check`), external URLs, and imported helper scripts.
List the checks that you ran and what stays unchecked.
-->

## Merge danger

**Door:** <!-- one-way (hard to undo: a license or attribution change, or copies that consumers already installed) or two-way (a revert fixes it) -->
**Blast radius:** <!-- one word, e.g. none, sync, clarity, expo, all bundles -->

<!--
One or two sentences on what could break and for whom. Name the agents and
repos that load the changed bundle: flowcopilot-app locks most bundles in
skills-lock.json, and clarity is installed globally for every session. Say
whether the next weekly sync overwrites a local edit: files under skills/
are generated, so an edit there without the same edit in
`scripts/sync-upstreams.ts` is lost. Say whether a changed guard lets new
upstream text through without a stop.
-->

## After merge

<!--
Manual steps in order: refresh the locked skills in each repo that uses the
changed bundle, reinstall global copies, run the sync workflow by hand, or
add the SKILLS_SYNC_TOKEN secret. Delete if none.
-->
