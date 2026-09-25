---
name: design-engineering
description: Design, build, and review polished web and React Native interfaces with Emil Kowalski and Jakub Krehel guidance. Use for animation and motion, UI polish, typography, color systems, layout, accessibility, product copy, mobile web feel, interface reviews, and UI variants.
license: MIT
metadata:
  author: flowcopilot
  upstream: emilkowalski/skills@d16ebe60d09a5ba2afcb7054ede9d0a10c9f6128
  upstream_jakub_krehel: "jakubkrehel/skills@267330e1adfc66a718fb65fa6918c1f06d0a689e"
---

<!-- Modified by Flow Copilot from emilkowalski/skills revision d16ebe60d09a5ba2afcb7054ede9d0a10c9f6128. -->

# Design Engineering

Use the target project's stack, design tokens, and installed libraries to select references. Read only the relevant workflow and its supporting files.

## Choose a source

- For motion — building, reviewing, auditing, or naming animations, gestures, and transitions on the web or in Expo — start with Emil Kowalski's workflows. [emil-design-eng](references/emil-kowalski/emil-design-eng/index.md) holds the shared philosophy.
- For static interface quality — UI polish, typography, color, layout, accessibility, and product copy — use the matching Jakub Krehel `better-*` workflow. [better-interface](references/jakub-krehel/better-interface/index.md) combines them into one review.
- When both sources cover a topic, such as animation in `better-ui` or typography in `apple-design`, prefer the source whose focus matches the task and keep the project's existing tokens.

A former upstream skill name, such as `review-animations` or `better-colors`, now refers to its index.md reference in the same source directory. Those workflows are available whenever this skill is installed; load them when an imported instruction asks for another skill. Relative paths remain relative to the imported file.

Upstream instructions that describe a first response for an invocation without a question apply when the user selected that workflow explicitly. Workflows listed as explicit-only were user-invoked upstream; do not start them unprompted.

This bundle imports the skills directories of both repositories. Plugin metadata, agent UI metadata, and root-level files are not included.

## Emil Kowalski

- [animate-expo](references/emil-kowalski/animate-expo/index.md): Build animations in React Native and Expo, making the decisions in the order that determines whether they feel right — should it animate, which thread it runs on, which properties, spring or timing, how the gesture hands off, how it degrades.
- [animate](references/emil-kowalski/animate/index.md): Build an animation from scratch, making the decisions in the order that determines whether it feels right — should it animate at all, what purpose, which tool, which properties, which curve and duration, how it interrupts, how it exits.
- [animation-vocabulary](references/emil-kowalski/animation-vocabulary/index.md): Reverse-lookup glossary that turns a vague description of a web animation or motion effect into its exact term ("the bouncy thing when a popover opens" → Pop in; "the iOS rubber-band scroll" → Rubber-banding).
- [apple-design](references/emil-kowalski/apple-design/index.md): Apple's approach to interface design and fluid, physical motion, translated for the web.
- [ask-sonner](references/emil-kowalski/ask-sonner/index.md): Guide to Sonner, the React toast library — install and wire up the Toaster, pick the right toast() call, promise and loading toasts, updating, dismissing and persisting toasts, styling, theming and icons, positioning and multiple toasters.
- [emil-design-eng](references/emil-kowalski/emil-design-eng/index.md): This skill encodes Emil Kowalski's philosophy on UI polish, component design, animation decisions, and the invisible details that make software feel great.
- [find-animation-opportunities](references/emil-kowalski/find-animation-opportunities/index.md): Search a codebase or UI for places that don't animate but should, and reject everything that shouldn't.
- [improve-animations](references/emil-kowalski/improve-animations/index.md): Survey a codebase's animation and motion code as a senior motion advisor, then produce a prioritized audit and self-contained implementation plans for other agents (or cheaper models) to execute.
- [mobile-native](references/emil-kowalski/mobile-native/index.md): Make a web app feel native on a phone — the small CSS and meta-tag fixes that separate "a website in a browser" from something that feels installed.
- [write-swift](references/emil-kowalski/write-swift/index.md): How to write modern Swift well — modeling with value types, Swift 6 data-race safety and approachable concurrency (@concurrent, main-actor-by-default, actors, task groups), protocols and generics (some vs any), API design, performance and ARC, Swift Testing, macros, and the modern language features agents don't know about yet.

Only when the user explicitly asks for them by name or purpose:

- [pick-ui-library](references/emil-kowalski/pick-ui-library/index.md): Pick the right library for a given frontend task from a curated, opinionated list — numbers, OTP inputs, charts, command menus, virtualization, drag and drop, toasts, state, styling, and more.
- [prototype](references/emil-kowalski/prototype/index.md): Build multiple genuinely different versions of a UI piece you describe, rendered behind a visual picker so you can flip through them live and promote the one that feels right.
- [review-animations](references/emil-kowalski/review-animations/index.md): Reviews animation and motion code against a high craft bar derived from Emil Kowalski's design engineering philosophy.

## Jakub Krehel

- [better-accessibility](references/jakub-krehel/better-accessibility/index.md): Helps your project comply with accessibility standards and best practices.
- [better-colors](references/jakub-krehel/better-colors/index.md): Helps you build a color system and answer anything about color in your project.
- [better-interface](references/jakub-krehel/better-interface/index.md): Combines all of the `better-*` skills into a single review across accessibility, layout, writing, typography, color and UI polish.
- [better-layout](references/jakub-krehel/better-layout/index.md): Helps with grouping, alignment, reading order, progressive disclosure and other details that make a good layout.
- [better-typography](references/jakub-krehel/better-typography/index.md): Focuses on type scale, spacing, sizing, variable fonts, OpenType features, wrapping, truncation and other details that make typography feel great across your product.
- [better-ui](references/jakub-krehel/better-ui/index.md): Polishes and improves the UI in your project.
- [better-writing](references/jakub-krehel/better-writing/index.md): Focuses on improving product copy in your project.

Only when the user explicitly asks for them by name or purpose:

- [break](references/jakub-krehel/break/index.md): Renders a component you choose in every state and scenario on a temporary page and stress tests it.
- [explain-interface](references/jakub-krehel/explain-interface/index.md): Helps you figure out how something was built on the web.
- [interface-review](references/jakub-krehel/interface-review/index.md): Reviews your work across multiple categories like UI, typography, layout, color, writing and accessibility and gives you a detailed analysis of the findings.
- [variant](references/jakub-krehel/variant/index.md): Builds multiple variants of a component you're working on and helps you iterate and pick one.
