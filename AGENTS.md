# Agent instructions

Read `DEVELOPMENT.md` before you change a bundle, the sync script, or the checks. The files under `skills/` are generated. Edit `scripts/sync-upstreams.ts`, then regenerate them.

## Bundle descriptions

The `description` of each bundle is the trigger that makes an agent load the skill. Write it as two plain sentences, in this order:

1. When. Start with `Load this skill before you <action>`. Name a signal that the agent can check in the project, such as a `package.json` dependency, a config file, or a directory. Add the product names that a task can contain.
2. What. Start with `Covers` and list the topics in the words that tasks use.

Example from `skills/expo/SKILL.md`:

```text
Load this skill before you read or change code in a project whose package.json lists expo, or when the task names Expo or EAS. Covers routes and navigation, data fetching, native UI, native modules, SDK upgrades, EAS builds, hosting, and OTA updates.
```

- Put the When sentence first. Descriptions without it, or with the topics first, loaded the skill much less often in the benchmark.
- Write sentences without labels such as `When:`. Labels loaded the skill less often, and a `: ` in the text needs YAML quotes.
- Add a sentence that starts with `Do not load it for` only when a near-miss task loads the skill by mistake.
- Keep the description under 1024 characters.
- Run the skill discovery benchmark in `benchmarks/skills/` when you change the format. `benchmarks/skills/README.md` has the measured results.
