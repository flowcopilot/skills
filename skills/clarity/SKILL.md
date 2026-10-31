---
name: clarity
description: Load this skill before you write or rewrite prose for people or agents, such as docs, READMEs, announcements, PR descriptions, commit messages, product copy, skills, AGENTS.md, or CLAUDE.md, or before you explain how or why code works. Also load it when the user says to figure it out yourself. Covers plain-language rules, technical writing, writing for agents, and explanations of how code works. Do not load it for code-only changes.
license: MIT
metadata:
  author: flowcopilot
  upstream: cursor/plugins@4dd1d05818d19792e7cd6e818f1667f95f7e1dbe
  upstream_matt_pocock: "mattpocock/skills@4ae2317ddb22b046e26455e4f9c9b3aaaf62212d"
---

<!-- Modified by Flow Copilot from cursor/plugins revision 4dd1d05818d19792e7cd6e818f1667f95f7e1dbe. -->

# Clarity

Write every text so that its reader understands it on the first read. Answer how and why questions with evidence. Read only the references that the task needs.

## Pick the rules by reader

- Prose that a person reads: chat replies, PR bodies, commit messages, docs, issues, code comments, and product or marketing copy. Read [unslop](references/pstack/unslop/index.md) before you write the first sentence, and again when its rules are no longer in your context. Write the prose clean as you draft, to the unslop rules and the reply rules below.
- Technical text that a person reads: apply [technical-writing](references/pstack/technical-writing/index.md) to docs, READMEs, RFCs, PR descriptions, and commit messages. For technical explanations in chat, apply its sentence rules and use the reply rules below to choose length and structure.
- Text that an agent reads: skills, `AGENTS.md`, `CLAUDE.md`, files under `docs/agents/`, and prompts for subagents. Apply [writing-for-agents](references/matt-pocock/writing-for-agents/index.md) and the sentence rules of technical-writing. Leading words from writing-for-agents are correct here, although unslop rules 26 and 32 remove metaphors from text for people.

## Workflows

- Answer a how or why question directly from the relevant evidence. The question's wording alone does not require delegation or a report.
- [figure-it-out](references/figure-it-out.md): use only when the user says "figure it out yourself", or hands off a large task to finish alone.

Imported text names upstream skills. `unslop` and `technical-writing` mean the references above. Other pstack skills, such as `how`, `why`, `poteto-mode`, `show-me-your-work`, `teach`, `architect`, and `arena`, are not in this bundle. Continue without them. Relative paths stay relative to the imported file.

## Writing the reply

Answer the current question first. For a routine question or completion update, default to one short paragraph or up to three short bullets. Expand when the user asks for depth or the task needs more detail.

- Include the facts needed to understand the answer, make a decision, or use the result safely. Explain any distinction that the reader needs to connect the evidence to your answer. Preserve requested deliverables, material risks, unresolved decisions, and verification limits.
- Choose sections for the current request. Chat does not need a section template or separate consumer and maintainer framing. These chat rules take precedence over presentation templates in this skill's imported references.
- Summarize worker findings once. Report the conclusion, relevant verification, and unresolved issues. Link a detailed artifact when useful. Include a full plan or worker report when the user requests it.
- Cite evidence where it supports a material claim. Distinguish observation from inference when the difference matters. Routine statements need no repeated confidence labels. Link only artifacts you produced or read this session.
- Write complete, plain sentences with one thought each. Follow unslop as you draft. Use periods instead of long dashes. A colon before a list is fine.

## Comments

Comments follow the same rule as the reply. Write them clean as you go. Keep a comment only for a non-obvious *why* the code can't show. A verify or test script gets no phase-narrating comments such as `// Phase 1: add cards`. The assertion or log string documents the step, as in `assert(ok, 'persisted across restart')`. This applies to every file you produce, including the delegate's diff.

## Model roles

This table sets the models for the figure-it-out workflow.

| Role | Used by | Claude Code | Codex | T3 |
| --- | --- | --- | --- | --- |
| investigation | figure-it-out units | `claude-opus-5-5` | `gpt-6.1-sol` xhigh | `codex/gpt-6.1-sol` xhigh |
| adversarial | figure-it-out review, debates | `gpt-6-astra` high, through the Codex CLI | `claude-opus-5-5` high, through the Claude CLI | the other family: `codex/gpt-6-astra` high reviews Claude work, `claudeAgent/claude-opus-5-5` high reviews Codex work |

Find the harness from your tools. `delegate_task` means T3. `spawn_agent` means Codex. The `Agent` tool means Claude Code. In T3, use the native tool when it runs the model in the T3 column, and `delegate_task` otherwise. The Claude Code `Agent` tool sets the model only, so its subagents use the effort of the session.

- Investigation edits only in its own worktree, and never commits or pushes. Claude Code: `isolation: worktree`. Codex: `spawn_agent` with agent type `worker`. T3: `runtimeMode: auto-accept-edits`. The parent session checks the result.
- Adversarial review uses the first option that works. First, T3 `delegate_task`. Second, the CLI of the other harness, read-only: `codex exec -m gpt-6-astra -c model_reasoning_effort=high -s read-only "<prompt>"` or `claude -p --model claude-opus-5-5 --effort high --permission-mode plan "<prompt>"`. Third, a new subagent of the same family that gets only the artifact and the goal. The reply names the reviewer model and the option used.
- If the harness rejects a model, use the parent model and say so in the reply.

## Sources

This bundle imports selected skills from cursor/plugins (pstack) and mattpocock/skills. Each reference keeps its upstream text. Only this file and `references/figure-it-out.md` hold Flow Copilot text. Upstream metadata, plugin files, and agent UI files are not included.
