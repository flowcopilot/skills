---
name: paper-drift
description: Check Paper drift, design drift, or token drift between the Paper "Flow" file's --flow-* tokens and the openui flow-tokens.ts. Read-only report; changes neither side.
---

# Paper Token Drift

Report which `--flow-*` tokens in the Paper file "Flow" differ from
`apps/openui/src/design/flow-tokens.ts`. The product owner designs in Paper
first or in code first, so neither side is the source. This skill only
reports: do not change Paper tokens or code, and do not propose a direction
unless the user asks.

## Workflow

1. Call the Paper MCP `get_tokens` with fileId `01M3CNQQ556P825EEA1F1ZPK67`,
   `namePattern` `--flow-*`, and format `css`. If the Paper tools are not
   connected, stop and say that the Paper desktop app must be open and its MCP
   connected.
2. Save the `:root { … }` block unchanged to a temporary file outside the
   repository, for example `/tmp/paper-flow-tokens.css`.
3. From the flowcopilot-app root, run the script in this skill's directory
   (`.agents/skills/paper-drift` when installed there):

   ```sh
   bun .agents/skills/paper-drift/scripts/token-drift.ts /tmp/paper-flow-tokens.css
   ```

   Add `--all` to list matching tokens too. Exit code 0 means no drift, 1
   means drift, and 2 means bad input: no `--flow-*` tokens, or not run from
   the flowcopilot-app root.

4. Report the result: the count, and the script's table of drifting tokens.
   A row is one of:
   - **DIFFERENT:** both sides have the token with different values.
   - **only in Paper / only in code:** the token is missing on one side.

   The script maps Paper text sizes to code type roles by name (for example
   `--flow-text-large` to `flowType.largeTitle`). When a text row differs,
   say that the mapping in the script can also be out of date.

## Done when

The user has the drift count and every drifting token with its Paper value,
code value, and code source. Nothing in Paper or the repository changed.
