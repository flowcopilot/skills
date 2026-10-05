# Notices

## Ax skill

The files under `skills/ax/` derive from [ax-llm/ax](https://github.com/ax-llm/ax) revision `46a1ced876ffc1e17257c8dd8167f11ca45fdde3`, licensed under Apache License 2.0.

The imported revision is dated 2026-10-03. Flow Copilot combines the TypeScript skills into one Agent Skills package, replaces their top-level metadata with one router, moves each skill's instructions into a reference, and records the source package version.

## Convex skill

The files under `skills/convex/` derive from [get-convex/agent-skills](https://github.com/get-convex/agent-skills) revision `2cfe645c87f971242cfc8ef3eb53662cbec26a53`, licensed under Apache License 2.0.

The imported revision is dated 2026-10-01. Flow Copilot combines the separate skills into one Agent Skills package, replaces top-level skill metadata with one router, moves capability instructions into references, and adjusts links for their new locations.

## Cloudflare skill

The files under `skills/cloudflare/` derive from [cloudflare/skills](https://github.com/cloudflare/skills) revision `41e0d19858946d18af9ee2c2feebbe2e11d829ff`, licensed under Apache License 2.0.

The imported revision is dated 2026-10-01. Flow Copilot combines the separate skills into one Agent Skills package, replaces top-level skill metadata with one router, moves specialized skill instructions into references, adjusts links for their new locations, and places bundled scripts under the combined skill.

## Expo skill

The files under `skills/expo/` derive from [expo/skills](https://github.com/expo/skills) revision `13ad8e05874195633b5c185f6947bb6400e228fc`, licensed under the MIT License, retained in `skills/expo/LICENSE`. The animation reference also retains its upstream copyright notice in `skills/expo/references/expo-animation/LICENSE`.

The imported revision is dated 2026-10-02. Flow Copilot combines all skills from plugins/expo/skills into one Agent Skills package, uses the directory README index as the router, moves workflow instructions and supporting files into references, adjusts paths, and preserves helper scripts. Plugin metadata and hooks are not imported.

## React Native skill

Flow Copilot combines both collections into one skill, replaces skill entry filenames with index.md references, preserves source-specific directories and supporting files, and adjusts local entry-file links.

### Software Mansion

Imported from [software-mansion-labs/skills](https://github.com/software-mansion-labs/skills) revision `e3f00cdb34942cee8b788abe10fe0d78a7f2b4e9`, dated 2026-09-16. The upstream plugin metadata declares MIT; the repository provides no standalone LICENSE file. Its declaration and author metadata are retained in `skills/react-native/licenses/software-mansion-marketplace.json`.

### Callstack

Imported from [callstackincubator/agent-skills](https://github.com/callstackincubator/agent-skills) revision `61e6e7dfdf3a8ee862254c200d751fcb1fb863dc`, dated 2026-09-16. The upstream MIT license and copyright notice are retained in `skills/react-native/licenses/callstack-LICENSE`.

## Clerk skill

The files under `skills/clerk/` derive from [clerk/skills](https://github.com/clerk/skills) revision `cc508f98dfca1ada6b420d2910e6aa150013e80c`, licensed under the MIT License. The upstream repository has no standalone LICENSE file; its plugin metadata declaring MIT is retained in `skills/clerk/licenses/clerk-plugin.json`.

The imported revision is dated 2026-10-02. Flow Copilot imports a selected subset of the skills: all core and feature skills, the React and TanStack Start framework skills, and the Expo mobile skill. It replaces the upstream router with one router that keeps its version table, moves skill instructions and supporting files into references, adjusts links and script paths, and links former skill names to their references. Evaluation fixtures, starter templates, and plugin metadata are not imported.

## Design Engineering skill

Flow Copilot combines both collections into one skill, replaces skill entry filenames with index.md references, groups user-invoked skills in the router, preserves source-specific directories and supporting files, and adjusts local entry-file links.

### Emil Kowalski

Imported from [emilkowalski/skills](https://github.com/emilkowalski/skills) revision `e8a175de22ae1e49370fc144c1f3bb9aeedf988d`, dated 2026-10-02. The upstream MIT license and copyright notice are retained in `skills/design-engineering/licenses/emil-kowalski-LICENSE`.

### Jakub Krehel

Imported from [jakubkrehel/skills](https://github.com/jakubkrehel/skills) revision `267330e1adfc66a718fb65fa6918c1f06d0a689e`, dated 2026-08-29. The upstream MIT license and copyright notice are retained in `skills/design-engineering/licenses/jakub-krehel-LICENSE`.

## Clarity skill

Flow Copilot combines selected skills from both sources into one skill. It replaces skill entry filenames with index.md references, keeps each source in its own directory, and records each upstream invocation flag and model role. The router replaces the pstack per-user model rule with one role table and maps Cursor subagent terms to Claude Code, Codex, and T3. The router also keeps the reply and comment rules from pstack `poteto-mode`, without its playbook paragraph. The `wait-what` skill is listed as `bro`. `references/figure-it-out.md` is Flow Copilot text based on the ideas of the pstack `figure-it-out` skill.

### pstack

Imported from [cursor/plugins](https://github.com/cursor/plugins) revision `e5a8186d7b43be8d6ac4452440fbead5f1a51c70`, dated 2026-10-05. It imports the `unslop`, `technical-writing`, `how`, and `why` skills from `pstack/skills/`. The upstream MIT license and copyright notice are retained in `skills/clarity/licenses/pstack-LICENSE`.

### Matt Pocock

Imported from [mattpocock/skills](https://github.com/mattpocock/skills) revision `4588b32ecab9ecc9fc8cc6b6c5e7d675b6004b0d`, dated 2026-10-05. It imports the `writing-for-agents` and `wait-what` skills from `skills/productivity/`. The upstream MIT license and copyright notice are retained in `skills/clarity/licenses/matt-pocock-LICENSE`.
