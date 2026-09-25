# Notices

## Ax skill

The files under `skills/ax/` derive from [ax-llm/ax](https://github.com/ax-llm/ax) revision `daa2b38ad435333f5fb7dd392a319bda41a6dbf9`, licensed under Apache License 2.0.

The imported revision is dated 2026-09-25. Flow Copilot combines the TypeScript skills into one Agent Skills package, replaces their top-level metadata with one router, moves each skill's instructions into a reference, and records the source package version.

## Convex skill

The files under `skills/convex/` derive from [get-convex/agent-skills](https://github.com/get-convex/agent-skills) revision `0aa10576821c6928f6a0f498c087af4ee231536e`, licensed under Apache License 2.0.

The imported revision is dated 2026-09-09. Flow Copilot combines the separate skills into one Agent Skills package, replaces top-level skill metadata with one router, moves capability instructions into references, and adjusts links for their new locations.

## Cloudflare skill

The files under `skills/cloudflare/` derive from [cloudflare/skills](https://github.com/cloudflare/skills) revision `6dc7604903127485e7e4cb26314651ebd4a4df19`, licensed under Apache License 2.0.

The imported revision is dated 2026-09-22. Flow Copilot combines the separate skills into one Agent Skills package, replaces top-level skill metadata with one router, moves specialized skill instructions into references, adjusts links for their new locations, and places bundled scripts under the combined skill.

## Expo skill

The files under `skills/expo/` derive from [expo/skills](https://github.com/expo/skills) revision `efa52f0a9d2176db75992736281c77da1b714fa3`, licensed under the MIT License, retained in `skills/expo/LICENSE`. The animation reference also retains its upstream copyright notice in `skills/expo/references/expo-animation/LICENSE`.

The imported revision is dated 2026-09-24. Flow Copilot combines all skills from plugins/expo/skills into one Agent Skills package, uses the directory README index as the router, moves workflow instructions and supporting files into references, adjusts paths, and preserves helper scripts. Plugin metadata and hooks are not imported.

## React Native skill

Flow Copilot combines both collections into one skill, replaces skill entry filenames with index.md references, preserves source-specific directories and supporting files, and adjusts local entry-file links.

### Software Mansion

Imported from [software-mansion-labs/skills](https://github.com/software-mansion-labs/skills) revision `e3f00cdb34942cee8b788abe10fe0d78a7f2b4e9`, dated 2026-09-16. The upstream plugin metadata declares MIT; the repository provides no standalone LICENSE file. Its declaration and author metadata are retained in `skills/react-native/licenses/software-mansion-marketplace.json`.

### Callstack

Imported from [callstackincubator/agent-skills](https://github.com/callstackincubator/agent-skills) revision `61e6e7dfdf3a8ee862254c200d751fcb1fb863dc`, dated 2026-09-16. The upstream MIT license and copyright notice are retained in `skills/react-native/licenses/callstack-LICENSE`.

## Clerk skill

The files under `skills/clerk/` derive from [clerk/skills](https://github.com/clerk/skills) revision `d01c99c0d8f608d6a51bf5a62c79e30d2395248a`, licensed under the MIT License. The upstream repository has no standalone LICENSE file; its plugin metadata declaring MIT is retained in `skills/clerk/licenses/clerk-plugin.json`.

The imported revision is dated 2026-09-24. Flow Copilot imports a selected subset of the skills: all core and feature skills, the React and TanStack Start framework skills, and the Expo mobile skill. It replaces the upstream router with one router that keeps its version table, moves skill instructions and supporting files into references, adjusts links and script paths, and links former skill names to their references. Evaluation fixtures, starter templates, and plugin metadata are not imported.

## Design Engineering skill

Flow Copilot combines both collections into one skill, replaces skill entry filenames with index.md references, groups user-invoked skills in the router, preserves source-specific directories and supporting files, and adjusts local entry-file links.

### Emil Kowalski

Imported from [emilkowalski/skills](https://github.com/emilkowalski/skills) revision `d16ebe60d09a5ba2afcb7054ede9d0a10c9f6128`, dated 2026-09-24. The upstream MIT license and copyright notice are retained in `skills/design-engineering/licenses/emil-kowalski-LICENSE`.

### Jakub Krehel

Imported from [jakubkrehel/skills](https://github.com/jakubkrehel/skills) revision `267330e1adfc66a718fb65fa6918c1f06d0a689e`, dated 2026-08-29. The upstream MIT license and copyright notice are retained in `skills/design-engineering/licenses/jakub-krehel-LICENSE`.
