# Notices

## Ax skill

The files under `skills/ax/` derive from [ax-llm/ax](https://github.com/ax-llm/ax) revision `f60ce12a5a7a0de6d7bf420400ca77934ea61504`, licensed under Apache License 2.0, retained in `skills/ax/licenses/ax-LICENSE`.

The imported revision is dated 2026-11-19. Flow Copilot combines the TypeScript skills into one Agent Skills package, replaces their top-level metadata with one router, moves each skill's instructions into a reference, moves shared reference files to `references/shared/` with adjusted links, and records the source package version.

## Convex skill

The files under `skills/convex/` derive from [get-convex/agent-skills](https://github.com/get-convex/agent-skills) revision `603f4920e15334e26614dcdca44816a4007ee255`, licensed under Apache License 2.0, retained in `skills/convex/licenses/convex-LICENSE`.

The imported revision is dated 2026-11-20. Flow Copilot combines the separate skills into one Agent Skills package, replaces top-level skill metadata with one router, moves capability instructions into references, and adjusts links for their new locations.

## Cloudflare skill

The files under `skills/cloudflare/` derive from [cloudflare/skills](https://github.com/cloudflare/skills) revision `14472d57ac968d1a0322a568077277209b259183`, licensed under Apache License 2.0, retained in `skills/cloudflare/licenses/cloudflare-LICENSE`.

The imported revision is dated 2026-11-23. Flow Copilot combines the separate skills into one Agent Skills package, replaces top-level skill metadata with one router, moves specialized skill instructions into references, adjusts links for their new locations, and places bundled scripts under the combined skill.

## Expo skill

The files under `skills/expo/` derive from [expo/skills](https://github.com/expo/skills) revision `88d9bd79f3fa8452a778fbac65bae162c0b32ce4`, licensed under the MIT License, retained in `skills/expo/LICENSE`. The animation reference also retains its upstream copyright notice in `skills/expo/references/expo-animation/LICENSE`.

The imported revision is dated 2026-11-20. Flow Copilot combines all skills from plugins/expo/skills into one Agent Skills package, uses the directory README index as the router, moves workflow instructions and supporting files into references, adjusts paths, and preserves helper scripts. It also updates feedback commands to use --message and corrects Observe event terminology and the MCP documentation link. Plugin metadata and hooks are not imported.

## React Native skill

Flow Copilot combines both collections into one skill, replaces skill entry filenames with index.md references, preserves source-specific directories and supporting files, and adjusts local entry-file links.

### Software Mansion

Imported from [software-mansion-labs/skills](https://github.com/software-mansion-labs/skills) revision `93a1d83097245f50a61fc2ee7a85b953c4f1be1a`, dated 2026-11-23. The upstream plugin metadata declares MIT; the repository provides no standalone LICENSE file. Its declaration and author metadata are retained in `skills/react-native/licenses/software-mansion-marketplace.json`.

### Callstack

Imported from [callstackincubator/agent-skills](https://github.com/callstackincubator/agent-skills) revision `59e9d17446a248b21d86f078fcd0bd2d36db1ca4`, dated 2026-10-08. The upstream MIT license and copyright notice are retained in `skills/react-native/licenses/callstack-LICENSE`.

## Clerk skill

The files under `skills/clerk/` derive from [clerk/skills](https://github.com/clerk/skills) revision `e9a94f271affdfe9325da63d3267ff29d543fd7f`, licensed under the MIT License. The upstream repository has no standalone LICENSE file; its plugin metadata declaring MIT is retained in `skills/clerk/licenses/clerk-plugin.json`.

The imported revision is dated 2026-11-23. Flow Copilot imports a selected subset of the skills: all core and feature skills, the React and TanStack Start framework skills, and the Expo mobile skill. It replaces the upstream router with one router that keeps its version table, moves skill instructions and supporting files into references, adjusts links and script paths, and links former skill names to their references. It also removes Cache Components default claims and directs subscription cancellation to the profile components. Evaluation fixtures, starter templates, and plugin metadata are not imported.

## Design Engineering skill

Flow Copilot combines both collections into one skill, replaces skill entry filenames with index.md references, groups user-invoked skills in the router, preserves source-specific directories and supporting files, and adjusts local entry-file links.

### Emil Kowalski

Imported from [emilkowalski/skills](https://github.com/emilkowalski/skills) revision `64eb3deb9a5fbfa041faf783e0bc3fd635872e9c`, dated 2026-11-15. The upstream MIT license and copyright notice are retained in `skills/design-engineering/licenses/emil-kowalski-LICENSE`.

### Jakub Krehel

Imported from [jakubkrehel/skills](https://github.com/jakubkrehel/skills) revision `672ae44ace6aaed65b86cbb1e2fd6fbea0e79578`, dated 2026-11-18. The upstream MIT license and copyright notice are retained in `skills/design-engineering/licenses/jakub-krehel-LICENSE`.

## Clarity skill

Flow Copilot combines selected skills from both sources into one skill. It replaces skill entry filenames with index.md references, keeps each source in its own directory, and records each upstream invocation flag. The router defines local reply rules for concise chat, and keeps the comment rules from an earlier pstack `poteto-mode`.

### pstack

Imported from [cursor/plugins](https://github.com/cursor/plugins) revision `005d8f6e8ec057b738adcd08a08b30db0478402d`, dated 2026-11-23. It imports the `unslop` and `technical-writing` skills from `pstack/skills/`. The upstream MIT license and copyright notice are retained in `skills/clarity/licenses/pstack-LICENSE`.

### Matt Pocock

Imported from [mattpocock/skills](https://github.com/mattpocock/skills) revision `abeeaf95660ba9e8b7c753eb38f441ca707a8823`, dated 2026-11-19. It imports the `writing-for-agents` skills from `skills/productivity/`. The upstream MIT license and copyright notice are retained in `skills/clarity/licenses/matt-pocock-LICENSE`.

## Agent Surf skill

Flow Copilot combines the skills of agent-browser, agent-device, and agent-desktop into one skill. It replaces the agent-browser discovery stub with one router that maps each CLI guide command to its bundled reference, replaces skill entry filenames with index.md references, preserves source-specific directories and supporting files, and adjusts local entry-file links. It also corrects upstream examples that contradict the upstream reference: Electron tab IDs, a ref reused after navigation, the proxy region parser, the state encryption key and its .gitignore pattern, named sessions in the browser templates, and a saved state that the authentication template deleted before it saved a new one.

### agent-browser

Imported from [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser) revision `0a923358ea989d7602f0d06507ad3447c62ffe9b`, dated 2026-11-23, from its `skill-data/` directory. The upstream Apache License 2.0 is retained in `skills/agent-surf/licenses/agent-browser-LICENSE`.

### agent-device

Imported from [callstack/agent-device](https://github.com/callstack/agent-device) revision `63fe1b6fe91f9148f0be8a73ca7c357a563011db`, dated 2026-11-24, from its `skills/` directory. The upstream MIT license and copyright notice are retained in `skills/agent-surf/licenses/agent-device-LICENSE`.

### agent-desktop

Imported from [vercel-labs/agent-desktop](https://github.com/vercel-labs/agent-desktop) revision `ce2ddf07226346818de2a1c6bae9869cfad142df`, dated 2026-11-23, from its `skills/` directory. The upstream Apache License 2.0 is retained in `skills/agent-surf/licenses/agent-desktop-LICENSE`.

## gh-stack skill

The files under `skills/gh-stack/` derive from [github/gh-stack](https://github.com/github/gh-stack) revision `80b6d6e910cc1b7eaa26b961d7721ade21084fed`, licensed under the MIT License, retained in `skills/gh-stack/licenses/gh-stack-LICENSE`.

The imported revision is dated 2026-11-16. Flow Copilot replaces the upstream skill entry with a shorter router that it writes itself, and moves the upstream `SKILL.md` into `references/gh-stack.md`. It imports the stack design and troubleshooting references, turns their code paths into links, and replaces the pointer to the command reference with `gh stack <command> --help`. The command reference is not imported.
