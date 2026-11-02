---
name: pr
description: Load this skill before you write or edit a pull request body, for example before gh pr create or gh pr edit, or when the task names a PR description. Covers the why, one before-and-after diagram, UI screenshots and recordings of user flows, the risk of a change that a revert can't undo, and steps after merge.
license: MIT
metadata:
  author: flowcopilot
  upstream: mattpocock/skills@4ae2317ddb22b046e26455e4f9c9b3aaaf62212d
---

<!-- Modified by Flow Copilot from mattpocock/skills revision 4ae2317ddb22b046e26455e4f9c9b3aaaf62212d. -->

Use this template for writing the PR body:

```markdown
## Why

<One or two sentences: the problem or the goal. Link the issue.>

## What changes

<One diagram with a Before and an After:
- a state diagram when the system waits for something outside it (a user
  action, a reply from a service or device, a webhook, a timer, a cancel);
  draw the bad events too: timeout, error, cancel, retry
- a call tree for control flow inside the code
- a flowchart for data flow and how components interact
- a table or a diff when no diagram fits>

<Up to three bullets for what the diagram misses.>

## Before and after

<UI changes only: before-and-after screenshots side by side. A short
recording for user flows and animations, so the reviewer sees the flow end
to end.>

## Risk

<Only when a revert can't undo the change, or the change touches auth, data,
secrets, or production. One or two plain sentences: what breaks, and for whom.>

## After merge

<Manual steps in order. Delete if none.>
```

## Sections

Skip all preambles and keep prose brief. Use the user's domain language from `GLOSSARY.md`. Delete a section when it has no job in this PR.

### Why

One or two sentences: the problem or the goal. Link the issue when there is one.

### What changes

Show one Before and one After. Pick the smallest view that makes the key point clear. First ask: does the next step wait for something outside the system, which can come late, come wrong, or not come? Outside inputs are a user action, a reply from a service or a device, a webhook, a timer, or a cancel.

- If yes, show it as a Mermaid state diagram. A state is a place where the system waits. An arrow is the event that moves it on. Draw the bad events too: timeout, error, cancel, retry.

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Saving: user saves
    Saving --> Saved: server confirms
    Saving --> Failed: timeout or error
    Failed --> Saving: retry
```

If no, pick one of the views below.

- Show logic or an algorithm as pseudocode:

```text
on(save)
  if content is unchanged
    return cached result
  write new content
  return fresh result
```

- Show runtime control flow as a call tree:

```text
submitForm
  createSession
    persistPrompt
    launchAgent
  navigateToSession
```

- Show UI structure as a component tree, including state and module boundaries that matter:

```text
<SessionPage> (apps/example/src/routes/session.tsx)
  useSessionEvents()
  <SessionToolbar>
    <RunSkillButton> (packages/ui)
```

- Show file responsibility or a broad refactor as a shallow file tree:

```text
src/
├── commands/       # parses user actions
├── sessions/       # owns session state
└── transport/      # sends API requests
```

- Show data flow or how components interact with a Mermaid flowchart or sequence diagram:

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Daemon
    User->>UI: choose command
    UI->>Daemon: send expanded prompt
    Daemon-->>UI: stream result
```

- Use `diff` when the point is what changes and the surrounding shape already exists. Match the diff shape to the topic.

For a component change:

```diff
 <SessionPage>
   useSessionEvents()
   <SessionToolbar>
+    <RunSkillButton />
   <SessionTimeline>
+    <SkillResultCard />
```

For a file-layout change:

```diff
 src/
 ├── commands/
+│   └── show-me.ts       # expands the slash command
 ├── sessions/
-└── transport.ts
+└── transport/
+    ├── client.ts
+    └── stream.ts
```

For a call-tree or call-stack change:

```diff
 submitForm
   createSession
     persistPrompt
+    expandSkillMention
     launchAgent
-  navigateToSession
+  navigateToSession
+    subscribeToEvents
```

For a state or control-flow change:

```diff
 on(save)
-  write content
+  if content is unchanged
+    return cached result
+  write new content
+  invalidate cache
```

- Show the whole block when most of it is new, when omitted context would hide ownership or order, or when the user needs a copyable target shape:

```ts
function expandSkill(command: string): string {
  const skillName = command.slice(1);
  return `use the ${skillName} skill`;
}
```

#### Guidance

Place each visual next to the short text it supports. Keep only the calls, files, props, states, and boundaries needed to answer the user's current question or the options to resolve the current discussion point.

You may use one of these, you may use several, it is unlikely you will use all of them. Use your judgement and don't overwhelm the user.

### Before and after

For UI changes only. Put before-and-after screenshots side by side, cropped to the changed area. For user flows and animations, add a short recording, so the reviewer sees the flow end to end. If you cannot capture a "before", say why.

### Risk

Only when a revert can't undo the change, for example a data migration, deleted data, or a published package, or when the change touches auth, data, secrets, or production. Write one or two plain sentences: what breaks, and for whom. Leave the section out otherwise, so that a Risk section always means a real risk.

### After merge

Manual steps in order, such as an env var, a migration, or an infra change. Delete the section if there are none.
