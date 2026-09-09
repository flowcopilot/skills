---
name: ax
description: Build, review, debug, and optimize TypeScript LLM applications with @ax-llm/ax. Use for Ax signatures, model providers, structured generation, agents, context, memory, MCP, workflows, events, audio, observability, GEPA, refinement, or playbooks.
license: Apache-2.0
metadata:
  author: flowcopilot
  upstream: ax-llm/ax@259bccfd8f681969a3d134ea4f5920757f22278f
  upstream_version: "24.0.18"
---

<!-- Modified by Flow Copilot from ax-llm/ax revision 259bccfd8f681969a3d134ea4f5920757f22278f. -->

# Ax

Use the installed `@ax-llm/ax` package and its types as the source of truth. Read only the references that match the task. A former `ax-*` skill name now refers to its file below. Do not expect separate Ax skills to be installed.

## Workflows

- [ax-agent](references/ax-agent.md): This skill helps an LLM generate correct core AxAgent code using @ax-llm/ax. Use when the user asks about agent(), child agents, namespaced functions, discovery mode, clarification, bubbleErrors, host-side final/clarification protocol, or ordinary agent runtime behavior. For MCP clients, native runtime modules, subscriptions, tasks, or authentication use ax-mcp alongside this skill. For RLM/code-runtime work use ax-agent-rlm; for callbacks and telemetry use ax-agent-observability; for recall/memory/skill loading use ax-agent-memory-skills; for agent.optimize(...) use ax-agent-optimize.
- [ax-agent-context](references/ax-agent-context.md): This skill helps an LLM pick the right AxAgent context tool for a job - contextMap for recurring corpora, contextPolicy presets for within-run trajectory compaction, agent.optimize for offline GEPA instruction/demo tuning, agent.playbook for an evolving context playbook (offline evolve + online update), and recall/memories + skills for per-turn retrieval. Use when the user asks "which context feature should I use", confuses contextMap with contextPolicy or memory, or wants a decision guide for long-context agents. For contextPolicy/contextMap codegen use ax-agent-rlm; for recall/skills use ax-agent-memory-skills; for agent.optimize or agent.playbook use ax-agent-optimize.
- [ax-agent-memory-skills](references/ax-agent-memory-skills.md): This skill helps an LLM generate correct AxAgent memory retrieval, context-map, and dynamic skill-loading code using @ax-llm/ax. Use when the user asks about contextMap, AxAgentContextMap, onMemoriesSearch, memoriesCatalog, recall(...), inputs.memories, onLoadedMemories, onUsedMemories, onSkillsSearch, skillsCatalog, AxAgentCatalogSkill, discover({ skills }), onLoadedSkills, onUsedSkills, preloaded skills, preloading memories at forward time, relevanceRanking hints, loaded memory/skill IDs, or carrying memories across forward() calls.
- [ax-agent-observability](references/ax-agent-observability.md): This skill helps an LLM generate correct AxAgent observability code using @ax-llm/ax. Use when the user asks about axGlobals.onUsage, usageContext, centralized or multi-tenant usage accounting, actorTurnCallback, onContextEvent, agentStatusCallback, onFunctionCall, reportSuccess, reportFailure, getChatLog(), getUsage(), resetUsage(), debug traces, progress updates, or telemetry for AxAgent runs.
- [ax-agent-optimize](references/ax-agent-optimize.md): This skill helps an LLM generate correct AxAgent tuning and evaluation code using @ax-llm/ax. Use when the user asks about agent.optimize(...), judgeOptions, eval datasets, optimization targets, saved optimizedProgram artifacts, or agent optimization guidance.
- [ax-agent-rlm](references/ax-agent-rlm.md): This skill helps an LLM generate correct AxAgent RLM/runtime code using @ax-llm/ax. Use when the user asks about RLM code execution, AxJSRuntime, contextFields, contextPolicy, liveRuntimeState, promptLevel, stage prompt controls, executorModelPolicy, maxRuntimeChars, agent.test(...), llmQuery(...), recursionOptions, or long-running agent runtime behavior.
- [ax-ai](references/ax-ai.md): This skill helps an LLM generate correct AI provider setup and configuration code using @ax-llm/ax. Use when the user asks about ai(), providers, models, routing, adaptive balancing, presets, embeddings, batch audio with ai.transcribe() or ai.speak(), extended thinking, context caching, or mentions OpenAI/Anthropic/Google/Azure/DeepSeek/Meta/Mistral/Cohere/Reka/Grok with @ax-llm/ax.
- [ax-audio](references/ax-audio.md): This skill helps an LLM generate correct audio code with @ax-llm/ax. Use when the user asks about ai.transcribe(), ai.speak(), signature audio inputs or outputs, agent audio behavior, .chat() conversational audio, OpenAI audio or realtime models, Gemini Live native audio, Grok Voice Agent models, voices, formats, transcripts, or how audio fits with structured outputs.
- [ax-event-runtime](references/ax-event-runtime.md): Use AxEventRuntime to ingest events, explicitly wake or resume AxGen, AxAgent, and AxFlow, persist state and results, and route outputs safely.
- [ax-flow](references/ax-flow.md): This skill helps an LLM generate correct AxFlow workflow code using @ax-llm/ax. Use when the user asks about flow(), AxFlow, workflow orchestration, parallel execution, DAG workflows, conditional routing, map/reduce patterns, or multi-node AI pipelines.
- [ax-gen](references/ax-gen.md): This skill helps an LLM generate correct AxGen code using @ax-llm/ax. Use when the user asks about ax(), AxGen, generators, forward(), streamingForward(), validation, assertions, streaming assertions, field processors, step hooks, self-tuning, or structured outputs. For MCP clients, transports, prompts, resources, tasks, subscriptions, or authentication use ax-mcp alongside this skill.
- [ax-gepa](references/ax-gepa.md): This skill helps an LLM generate correct AxGEPA optimization code using @ax-llm/ax. Use when the user asks about AxGEPA, GEPA, Pareto optimization, multi-objective prompt tuning, reflective prompt evolution, validationExamples, maxMetricCalls, or optimizing a generator, flow, or agent tree.
- [ax-llm](references/ax-llm.md): This skill helps with using the @ax-llm/ax TypeScript library for building LLM applications. Use when the user asks about ax(), ai(), f(), s(), agent(), flow(), AxGen, AxAgent, AxFlow, signatures, streaming, or mentions @ax-llm/ax.
- [ax-mcp](references/ax-mcp.md): This skill helps an LLM build correct native Model Context Protocol integrations with @ax-llm/ax. Use when the user asks about AxMCPClient, MCP transports, tools, prompts, resources, subscriptions, tasks, sampling, elicitation, roots, authentication, OAuth, MCP Apps, recording/replay, or MCP integration with AxGen, AxAgent, AxFlow, chat, optimization, and AxEventRuntime.
- [ax-playbook](references/ax-playbook.md): This skill helps an LLM generate correct playbook code using @ax-llm/ax. Use when the user asks about playbook(), AxPlaybook, context playbooks, evolving context, ACE / Agentic Context Engineering, agent.playbook(), or growing/applying task knowledge offline and online with evolve() and update().
- [ax-refine](references/ax-refine.md): Use this skill when writing or reviewing Ax bestOfN/refine code, reward functions, thresholds, native sample selection, serial attempts, generated advice, and attempt diagnostics.
- [ax-signature](references/ax-signature.md): This skill helps an LLM generate correct DSPy signature code using @ax-llm/ax. Use when the user asks about signatures, s(), f(), field types, string syntax, fluent builder API, validation constraints, or type-safe inputs/outputs.

## Common rules

- Prefer the factory APIs used by the selected reference.
- Match examples to the installed package version. Check package exports and type declarations when they differ from a reference.
- Load more than one reference when a task crosses Ax subsystems. For example, an agent with MCP tools needs both the agent and MCP references.
- Verify code with the target repository's typecheck and relevant tests.
