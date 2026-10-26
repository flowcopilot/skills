# Notices

## Ax skill

The files under `skills/ax/` derive from [ax-llm/ax](https://github.com/ax-llm/ax) revision `7948e19213325e41f39ba0715ad8fd2a89714210`, licensed under Apache License 2.0.

The imported revision is dated 2026-10-26. Flow Copilot combines the TypeScript skills into one Agent Skills package, replaces their top-level metadata with one router, moves each skill's instructions into a reference, moves shared reference files to `references/shared/` with adjusted links, and records the source package version.

## Convex skill

The files under `skills/convex/` derive from [get-convex/agent-skills](https://github.com/get-convex/agent-skills) revision `191a5c33a7e7a22ec9d5ff13930f84748bbcf8f8`, licensed under Apache License 2.0.

The imported revision is dated 2026-10-13. Flow Copilot combines the separate skills into one Agent Skills package, replaces top-level skill metadata with one router, moves capability instructions into references, and adjusts links for their new locations.

## Cloudflare skill

The files under `skills/cloudflare/` derive from [cloudflare/skills](https://github.com/cloudflare/skills) revision `86505e44f87d801aa1864a3c4109e9a8ae5c409f`, licensed under Apache License 2.0.

The imported revision is dated 2026-10-15. Flow Copilot combines the separate skills into one Agent Skills package, replaces top-level skill metadata with one router, moves specialized skill instructions into references, adjusts links for their new locations, and places bundled scripts under the combined skill.

## Expo skill

The files under `skills/expo/` derive from [expo/skills](https://github.com/expo/skills) revision `8a0dc4fa57ae345923c357e1451cbcd8b6f2a7db`, licensed under the MIT License, retained in `skills/expo/LICENSE`. The animation reference also retains its upstream copyright notice in `skills/expo/references/expo-animation/LICENSE`.

The imported revision is dated 2026-10-26. Flow Copilot combines all skills from plugins/expo/skills into one Agent Skills package, uses the directory README index as the router, moves workflow instructions and supporting files into references, adjusts paths, and preserves helper scripts. It also updates feedback commands to use --message and corrects Observe event terminology and the MCP documentation link. Plugin metadata and hooks are not imported.

## React Native skill

Flow Copilot combines both collections into one skill, replaces skill entry filenames with index.md references, preserves source-specific directories and supporting files, and adjusts local entry-file links.

### Software Mansion

Imported from [software-mansion-labs/skills](https://github.com/software-mansion-labs/skills) revision `58afa0a09b01dc47819af8fd48bb062561414108`, dated 2026-10-15. The upstream plugin metadata declares MIT; the repository provides no standalone LICENSE file. Its declaration and author metadata are retained in `skills/react-native/licenses/software-mansion-marketplace.json`.

### Callstack

Imported from [callstackincubator/agent-skills](https://github.com/callstackincubator/agent-skills) revision `59e9d17446a248b21d86f078fcd0bd2d36db1ca4`, dated 2026-10-08. The upstream MIT license and copyright notice are retained in `skills/react-native/licenses/callstack-LICENSE`.

## Clerk skill

The files under `skills/clerk/` derive from [clerk/skills](https://github.com/clerk/skills) revision `d694f2709372feb38b87aa905ee2219a485095ab`, licensed under the MIT License. The upstream repository has no standalone LICENSE file; its plugin metadata declaring MIT is retained in `skills/clerk/licenses/clerk-plugin.json`.

The imported revision is dated 2026-10-23. Flow Copilot imports a selected subset of the skills: all core and feature skills, the React and TanStack Start framework skills, and the Expo mobile skill. It replaces the upstream router with one router that keeps its version table, moves skill instructions and supporting files into references, adjusts links and script paths, and links former skill names to their references. It also removes Cache Components default claims and directs subscription cancellation to the profile components. Evaluation fixtures, starter templates, and plugin metadata are not imported.

## Design Engineering skill

Flow Copilot combines both collections into one skill, replaces skill entry filenames with index.md references, groups user-invoked skills in the router, preserves source-specific directories and supporting files, and adjusts local entry-file links. It also initializes the teardown extrusion example and validates teardown color settings, with regression coverage in the viewer builder test.

### Emil Kowalski

Imported from [emilkowalski/skills](https://github.com/emilkowalski/skills) revision `2d228630ba1446365f614a108cb8252f1feda202`, dated 2026-10-11. The upstream MIT license and copyright notice are retained in `skills/design-engineering/licenses/emil-kowalski-LICENSE`.

### Jakub Krehel

Imported from [jakubkrehel/skills](https://github.com/jakubkrehel/skills) revision `592aedc44d7d5b3e29740984252902f3e5402a1c`, dated 2026-10-25. The upstream MIT license and copyright notice are retained in `skills/design-engineering/licenses/jakub-krehel-LICENSE`.

## Clarity skill

Flow Copilot combines selected skills from both sources into one skill. It replaces skill entry filenames with index.md references, keeps each source in its own directory, and records each upstream invocation flag and model role. The router replaces the pstack per-user model rule with one role table and maps Cursor subagent terms to Claude Code, Codex, and T3. The router defines local reply rules for concise chat and keeps the comment rules from pstack `poteto-mode`. Narrow how and why questions use a direct answer. Detailed workflows run when the request needs them. The `wait-what` skill is listed as `bro`. `references/figure-it-out.md` is Flow Copilot text based on the ideas of the pstack `figure-it-out` skill.

### pstack

Imported from [cursor/plugins](https://github.com/cursor/plugins) revision `c5149ef275fa7be41e3ffe5e79c8fc16efcaeedc`, dated 2026-10-26. It imports the `unslop`, `technical-writing`, `how`, and `why` skills from `pstack/skills/`. The upstream MIT license and copyright notice are retained in `skills/clarity/licenses/pstack-LICENSE`.

### Matt Pocock

Imported from [mattpocock/skills](https://github.com/mattpocock/skills) revision `5beb35b040e3de97e54fa9e386d7e42d15c295c2`, dated 2026-10-19. It imports the `writing-for-agents` and `wait-what` skills from `skills/productivity/`. The upstream MIT license and copyright notice are retained in `skills/clarity/licenses/matt-pocock-LICENSE`.
