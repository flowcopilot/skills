# Notices

## Ax skill

The files under `skills/ax/` derive from [ax-llm/ax](https://github.com/ax-llm/ax) revision `818d15b02d57de8f215f6d2cb23bd3d3921a6e5e`, licensed under Apache License 2.0.

The imported revision is dated 2026-10-18. Flow Copilot combines the TypeScript skills into one Agent Skills package, replaces their top-level metadata with one router, moves each skill's instructions into a reference, moves shared reference files to `references/shared/` with adjusted links, and records the source package version.

## Convex skill

The files under `skills/convex/` derive from [get-convex/agent-skills](https://github.com/get-convex/agent-skills) revision `191a5c33a7e7a22ec9d5ff13930f84748bbcf8f8`, licensed under Apache License 2.0.

The imported revision is dated 2026-10-13. Flow Copilot combines the separate skills into one Agent Skills package, replaces top-level skill metadata with one router, moves capability instructions into references, and adjusts links for their new locations.

## Cloudflare skill

The files under `skills/cloudflare/` derive from [cloudflare/skills](https://github.com/cloudflare/skills) revision `86505e44f87d801aa1864a3c4109e9a8ae5c409f`, licensed under Apache License 2.0.

The imported revision is dated 2026-10-15. Flow Copilot combines the separate skills into one Agent Skills package, replaces top-level skill metadata with one router, moves specialized skill instructions into references, adjusts links for their new locations, and places bundled scripts under the combined skill.

## Expo skill

The files under `skills/expo/` derive from [expo/skills](https://github.com/expo/skills) revision `7ddc1f5796996e5c7efe2fc3fa9168eb24e8dac1`, licensed under the MIT License, retained in `skills/expo/LICENSE`. The animation reference also retains its upstream copyright notice in `skills/expo/references/expo-animation/LICENSE`.

The imported revision is dated 2026-10-17. Flow Copilot combines all skills from plugins/expo/skills into one Agent Skills package, uses the directory README index as the router, moves workflow instructions and supporting files into references, adjusts paths, and preserves helper scripts. Plugin metadata and hooks are not imported.

## React Native skill

Flow Copilot combines both collections into one skill, replaces skill entry filenames with index.md references, preserves source-specific directories and supporting files, and adjusts local entry-file links.

### Software Mansion

Imported from [software-mansion-labs/skills](https://github.com/software-mansion-labs/skills) revision `58afa0a09b01dc47819af8fd48bb062561414108`, dated 2026-10-15. The upstream plugin metadata declares MIT; the repository provides no standalone LICENSE file. Its declaration and author metadata are retained in `skills/react-native/licenses/software-mansion-marketplace.json`.

### Callstack

Imported from [callstackincubator/agent-skills](https://github.com/callstackincubator/agent-skills) revision `59e9d17446a248b21d86f078fcd0bd2d36db1ca4`, dated 2026-10-08. The upstream MIT license and copyright notice are retained in `skills/react-native/licenses/callstack-LICENSE`.

## Clerk skill

The files under `skills/clerk/` derive from [clerk/skills](https://github.com/clerk/skills) revision `8482d43fe12a5f06a2b5ab3008615875747a3e4e`, licensed under the MIT License. The upstream repository has no standalone LICENSE file; its plugin metadata declaring MIT is retained in `skills/clerk/licenses/clerk-plugin.json`.

The imported revision is dated 2026-10-16. Flow Copilot imports a selected subset of the skills: all core and feature skills, the React and TanStack Start framework skills, and the Expo mobile skill. It replaces the upstream router with one router that keeps its version table, moves skill instructions and supporting files into references, adjusts links and script paths, and links former skill names to their references. Evaluation fixtures, starter templates, and plugin metadata are not imported.

## Design Engineering skill

Flow Copilot combines both collections into one skill, replaces skill entry filenames with index.md references, groups user-invoked skills in the router, preserves source-specific directories and supporting files, and adjusts local entry-file links.

### Emil Kowalski

Imported from [emilkowalski/skills](https://github.com/emilkowalski/skills) revision `2d228630ba1446365f614a108cb8252f1feda202`, dated 2026-10-11. The upstream MIT license and copyright notice are retained in `skills/design-engineering/licenses/emil-kowalski-LICENSE`.

### Jakub Krehel

Imported from [jakubkrehel/skills](https://github.com/jakubkrehel/skills) revision `4c66b1fa86e9ab70187b43d7da9b6fdb29f2ef63`, dated 2026-10-12. The upstream MIT license and copyright notice are retained in `skills/design-engineering/licenses/jakub-krehel-LICENSE`.

## Clarity skill

Flow Copilot combines selected skills from both sources into one skill. It replaces skill entry filenames with index.md references, keeps each source in its own directory, and records each upstream invocation flag and model role. The router replaces the pstack per-user model rule with one role table and maps Cursor subagent terms to Claude Code, Codex, and T3. The router defines local reply rules for concise chat and keeps the comment rules from pstack `poteto-mode`. Narrow how and why questions use a direct answer. Detailed workflows run when the request needs them. The `wait-what` skill is listed as `bro`. `references/figure-it-out.md` is Flow Copilot text based on the ideas of the pstack `figure-it-out` skill.

### pstack

Imported from [cursor/plugins](https://github.com/cursor/plugins) revision `75fabace38ce507ee044546eaca64167c8c1e21b`, dated 2026-10-18. It imports the `unslop`, `technical-writing`, `how`, and `why` skills from `pstack/skills/`. The upstream MIT license and copyright notice are retained in `skills/clarity/licenses/pstack-LICENSE`.

### Matt Pocock

Imported from [mattpocock/skills](https://github.com/mattpocock/skills) revision `49dd158d1076134a641b33efb035946536778336`, dated 2026-10-09. It imports the `writing-for-agents` and `wait-what` skills from `skills/productivity/`. The upstream MIT license and copyright notice are retained in `skills/clarity/licenses/matt-pocock-LICENSE`.
