# Notices

## Ax skill

The files under `skills/ax/` derive from [ax-llm/ax](https://github.com/ax-llm/ax) revision `259bccfd8f681969a3d134ea4f5920757f22278f`, licensed under Apache License 2.0.

The imported revision is dated 2026-09-09. Flow Copilot combines the TypeScript skills into one Agent Skills package, replaces their top-level metadata with one router, moves each skill's instructions into a reference, and records the source package version.

## Convex skill

The files under `skills/convex/` derive from [get-convex/agent-skills](https://github.com/get-convex/agent-skills) revision `c41ece22681a50d326e54f30d24148a6d46d0c3c`, licensed under Apache License 2.0.

The imported revision is dated 2026-09-04. Flow Copilot combines the separate skills into one Agent Skills package, replaces top-level skill metadata with one router, moves capability instructions into references, and adjusts links for their new locations.

## Cloudflare skill

The files under `skills/cloudflare/` derive from [cloudflare/skills](https://github.com/cloudflare/skills) revision `b052c32bab7dd493513260228a36c88294f343f1`, licensed under Apache License 2.0.

The imported revision is dated 2026-09-07. Flow Copilot combines the separate skills into one Agent Skills package, replaces top-level skill metadata with one router, moves specialized skill instructions into references, adjusts links for their new locations, and places bundled scripts under the combined skill.

## Expo skill

The files under `skills/expo/` derive from [expo/skills](https://github.com/expo/skills) revision `39708666ce7014def1f8e34f3d8c93e8d3f588bb`, licensed under the MIT License, retained in `skills/expo/LICENSE`. The animation reference also retains its upstream copyright notice in `skills/expo/references/expo-animation/LICENSE`.

The imported revision is dated 2026-09-15. Flow Copilot combines all skills from plugins/expo/skills into one Agent Skills package, uses the directory README index as the router, moves workflow instructions and supporting files into references, adjusts paths, and preserves helper scripts. Plugin metadata and hooks are not imported.

## React Native skill

Flow Copilot combines both collections into one skill, replaces skill entry filenames with index.md references, preserves source-specific directories and supporting files, and adjusts local entry-file links.

### Software Mansion

Imported from [software-mansion-labs/skills](https://github.com/software-mansion-labs/skills) revision `e3f00cdb34942cee8b788abe10fe0d78a7f2b4e9`, dated 2026-09-16. The upstream plugin metadata declares MIT; the repository provides no standalone LICENSE file. Its declaration and author metadata are retained in `skills/react-native/licenses/software-mansion-marketplace.json`.

### Callstack

Imported from [callstackincubator/agent-skills](https://github.com/callstackincubator/agent-skills) revision `61e6e7dfdf3a8ee862254c200d751fcb1fb863dc`, dated 2026-09-16. The upstream MIT license and copyright notice are retained in `skills/react-native/licenses/callstack-LICENSE`.
