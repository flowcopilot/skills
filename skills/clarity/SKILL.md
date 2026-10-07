---
name: clarity
description: Write clear text for people and agents, and explain code with evidence. Use before any reply, doc, PR, commit message, code comment, or product copy. Use when you write or edit skills, AGENTS.md, CLAUDE.md, or docs/agents files. Use when the user asks how code works or why it is built this way. Use when the user did not understand a message (bro, wait what, repeat, make it shorter), or says to figure it out yourself.
license: MIT
metadata:
  author: flowcopilot
  upstream: cursor/plugins@d0ef80d86795816da932a153458c5dbe192d294e
  upstream_matt_pocock: "mattpocock/skills@f3fc5632f401156837ee3872f14fe33ccf1024ea"
---

<!-- Modified by Flow Copilot from cursor/plugins revision d0ef80d86795816da932a153458c5dbe192d294e. -->

# Clarity

Write every text so that its reader understands it on the first read. Answer how and why questions with evidence. Read only the references that the task needs.

## Pick the rules by reader

- Prose that a person reads: chat replies, PR bodies, commit messages, docs, issues, code comments, and product or marketing copy. Read [unslop](references/pstack/unslop/index.md) before you write the first sentence, and again when its rules are no longer in your context. Write the prose clean as you draft, to the unslop rules and the reply rules below.
- Technical text that a person reads: docs, READMEs, RFCs, PR descriptions, commit messages, and explanations of how code works, how it was built, or why a bug occurs. Also apply [technical-writing](references/pstack/technical-writing/index.md).
- Text that an agent reads: skills, `AGENTS.md`, `CLAUDE.md`, files under `docs/agents/`, and prompts for subagents. Apply [writing-for-agents](references/matt-pocock/writing-for-agents/index.md) and the sentence rules of technical-writing. Leading words from writing-for-agents are correct here, although unslop rules 26 and 32 remove metaphors from text for people.

## Workflows

- [how](references/pstack/how/index.md): the user asks how code works, where something belongs, or which layer owns it.
- [why](references/pstack/why/index.md): the user asks why code has its shape, why a decision was made, or what caused a regression. Start with the light path: answer alone or with one exploration agent, and follow [the epistemics guide](references/pstack/why/references/epistemics.md). Run the full investigation only when the user names `why`, or when the evidence spans more than one system.

Only when the user asks for them:

- [bro](references/matt-pocock/wait-what/index.md): the user says "I didn't get that", "repeat", "make it shorter", "wait, what", or "bro". Re-pitch the last message. Its upstream name is `wait-what`.
- [figure-it-out](references/figure-it-out.md): the user says "figure it out yourself", or hands off a large task to finish alone.

The user selects a workflow by name: `/clarity bro` in Claude Code, `$clarity bro` in Codex.

Imported text names upstream skills. `unslop`, `technical-writing`, `how`, and `why` mean the references above. Other pstack skills, such as `poteto-mode`, `show-me-your-work`, `teach`, `architect`, and `arena`, are not in this bundle. Continue without them. Relative paths stay relative to the imported file.

## Writing the reply

Write the reply clean as you draft it. A cleanup pass after drafting does not remove these patterns.

- **Short declarative sentences.** One thought per sentence, ended with a period.
- **No long-dash character anywhere.** Write a file-list bullet as a sentence ("`main.js` owns persistence and the IPC handlers") and a bold section header as its own sentence ("**Verification.** End to end via CDP").
- **A colon as a mid-sentence connector is also out** (unslop rule 14). A colon before a list is fine.
- **Terse is not an excuse to drop content.** Short sentences, but every section the workflow's reply names stays: details, tradeoffs, choices, open decisions.
- **Frame impact for the consumer and the maintainer.** Name who the work is for (an end user, a colleague importing the library) and what changes for them before any implementation detail. Then what the next engineer who owns this code inherits. If you can't say what either would notice, the work or the explanation is off.
- **Never fabricate a link, citation, or transcript reference.** Link only artifacts you produced or read this session.
- **Every claim carries its evidence or its label in the same sentence.** Measured, inferred, or guess. A prediction or an unseen cause is a guess. Never hand the human a check you could run.

## Comments

Comments follow the same rule as the reply. Write them clean as you go. Keep a comment only for a non-obvious *why* the code can't show. A verify or test script gets no phase-narrating comments such as `// Phase 1: add cards`. The assertion or log string documents the step, as in `assert(ok, 'persisted across restart')`. This applies to every file you produce, including the delegate's diff.

## Model roles

This table replaces the pstack `pstack-models.mdc` rule. An imported role line or default model means the role in this table.

| Role | Upstream roles | Claude Code | Codex | T3 |
| --- | --- | --- | --- | --- |
| reasoning | how explainer, why synthesizer | `claude-opus-5-5` | `gpt-6-astra` high | `claudeAgent/claude-opus-5-5` high |
| exploration | how explorer, why investigators | `claude-sonnet-5-5` | `gpt-6.1-sol` high | `codex/gpt-6.1-sol` high |
| investigation | figure-it-out units | `claude-opus-5-5` | `gpt-6.1-sol` xhigh | `codex/gpt-6.1-sol` xhigh |
| adversarial | figure-it-out review, debates | `gpt-6-astra` high, through the Codex CLI | `claude-opus-5-5` high, through the Claude CLI | the other family: `codex/gpt-6-astra` high reviews Claude work, `claudeAgent/claude-opus-5-5` high reviews Codex work |

Find the harness from your tools. `delegate_task` means T3. `spawn_agent` means Codex. The `Agent` tool means Claude Code. In T3, use the native tool when it runs the model in the T3 column, and `delegate_task` otherwise. The Claude Code `Agent` tool sets the model only, so its subagents use the effort of the session.

- Exploration reads and does not edit. Claude Code: the `Explore` agent with model `sonnet`. Codex: `spawn_agent` with agent type `explorer`. T3: `interactionMode: plan`.
- Investigation edits only in its own worktree, and never commits or pushes. Claude Code: `isolation: worktree`. Codex: `spawn_agent` with agent type `worker`. T3: `runtimeMode: auto-accept-edits`. The parent session checks the result.
- Adversarial review uses the first option that works. First, T3 `delegate_task`. Second, the CLI of the other harness, read-only: `codex exec -m gpt-6-astra -c model_reasoning_effort=high -s read-only "<prompt>"` or `claude -p --model claude-opus-5-5 --effort high --permission-mode plan "<prompt>"`. Third, a new subagent of the same family that gets only the artifact and the goal. The reply names the reviewer model and the option used.
- If the harness rejects a model, use the parent model and say so in the reply.

## Cursor terms in how and why

- The `Task` tool and `subagent_type: generalPurpose` mean the spawn tool for the role.
- `readonly: true` means the exploration permissions. `readonly: false` for MCP access means a subagent that has the MCP tools and writes nothing.
- The Cursor environment and its `mcps/` directory mean the MCP tools of the current harness. In Claude Code, these are the `mcp__<server>__<tool>` tools, including deferred tools that ToolSearch lists.

## Sources

This bundle imports selected skills from cursor/plugins (pstack) and mattpocock/skills. Each reference keeps its upstream text. Only this file and `references/figure-it-out.md` hold Flow Copilot text. Upstream metadata, plugin files, and agent UI files are not included.
