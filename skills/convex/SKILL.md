---
name: convex
description: Build, review, test, secure, migrate, and operate Convex backends. Use when a project has a convex directory, uses Convex or @convex-dev packages, or needs Convex schemas, functions, components, authentication, billing, deployments, monitoring, backups, cost work, or production repair.
license: Apache-2.0
metadata:
  author: flowcopilot
  upstream: get-convex/agent-skills@c41ece22681a50d326e54f30d24148a6d46d0c3c
---

<!-- Modified by Flow Copilot from get-convex/agent-skills revision c41ece22681a50d326e54f30d24148a6d46d0c3c. -->

# Convex

Use the target repository and installed package types as the source of truth. Read only the references that match the task. A former `convex-*` skill name now refers to its file below. Do not expect separate Convex skills to be installed.

For deployment reads or writes, first read [convex-deploy-guard](references/convex-deploy-guard.md). Ask for fresh approval before a production write. Use the target repository's package manager and existing scripts.

## Workflows

- [convex-add](references/convex-add.md): Add a capability to the CURRENT Convex app — consults the served Convex capability catalog for always-current procedures (billing, crons, auth, agent, search, …); falls back to built-in hosting or @convex-dev component search. TRIGGER when the user runs /add, or asks to add hosting/publishing or any backend capability to an existing Convex app.
- [convex-advisor](references/convex-advisor.md): Read the Convex deployment's 72h insights (read limits, OCC contention), root-cause each event in code, report evidence-backed perf/cost findings with fixes.
- [convex-agent](references/convex-agent.md): Add an AI agent / RAG backend (@convex-dev/agent) to the Convex app.
- [convex-auth](references/convex-auth.md): Add authentication (passkeys/OAuth) to the current Convex app, including the auth.config.ts wiring.
- [convex-authz](references/convex-authz.md): Audit and harden a Convex app's authorization: identity-from-arg impersonation, missing per-document ownership checks, public queries leaking data by a client-supplied id, and writes into a parent/container the caller doesn't own. Scans for the 4 shapes, applies requireIdentity/requireOwner, verifies with tsc. TRIGGER on 'secure my app', 'audit auth/authz', 'who can access this data'. SKIP when there is no convex/ directory.
- [convex-backup](references/convex-backup.md): Set up Convex backups and run a restore DRILL that proves recovery — snapshot, restore into a throwaway preview, assert the data came back — plus a schedule matched to your RPO and a gated recovery runbook.
- [convex-billing](references/convex-billing.md): Add Stripe billing/payments to the Convex app via @convex-dev/stripe (checkout + webhook + gating).
- [convex-cost](references/convex-cost.md): Preview Convex spend — rank functions by bytes/documents-read × call-volume from insights, project each cost driver's growth curve, name the cheapest fix; confirm-cost for paid actions.
- [convex-create-component](references/convex-create-component.md): Builds reusable Convex components with isolated tables and app-facing APIs. Use for new components, reusable backend modules, integrations, or component boundary work.
- [convex-crons](references/convex-crons.md): Add recurring scheduled jobs (crons) to the Convex app.
- [convex-deploy-guard](references/convex-deploy-guard.md): Classify + announce the target Convex deployment before any deployment-affecting command; fresh explicit consent for prod actions; session read-only mode.
- [convex-design](references/convex-design.md): Design and build reactive, type-safe, production-grade backends on Convex. Covers schema, queries/mutations/actions, indexes, auth, file storage, scheduling, real-time multiplayer, mobile backends, and LLM/agent workflows on Convex's one-platform stack.
- [convex-docs](references/convex-docs.md): Pull version-current Convex docs for the version this project uses — pin the installed version, fetch page-as-markdown or check node_modules types, freshness hierarchy — instead of writing a possibly-stale API from memory.
- [convex-domains](references/convex-domains.md): Point a domain you already own at your Convex app (DNS records, custom-domain attach, auth-origin rebind).
- [convex-env](references/convex-env.md): Set and wire Convex deployment env vars / secrets for the app.
- [convex-expert](references/convex-expert.md): Convex backend specialist. Use this agent for any code inside a `convex/` directory — function definitions, schemas, indexes, queries, mutations, actions, HTTP endpoints, cron jobs, file storage, auth wiring, and component installation. Knows the object-form function syntax, validator patterns, resource limits, and component ecosystem that generic Claude routinely gets wrong.
- [convex-explain-app](references/convex-explain-app.md): Explain an existing Convex app — data model + relationships, public vs internal functions, auth/ownership model, components, a request→data flow — read from the schema and function surface. Read-only.
- [convex-improve-convex-plugin](references/convex-improve-convex-plugin.md): Send this coding session's transcript to the Convex team for an AI post-mortem that improves the quickstart system.
- [convex-insights](references/convex-insights.md): Query a running Convex app's logs + health in natural language (official MCP): failures, slow/expensive functions, deploy causality — scoped, evidence-backed, with a dashboard deep link.
- [convex-launch-readiness](references/convex-launch-readiness.md): Run every Convex audit (authz, reviewer, advisor, insights) into one scored, deduped readiness report with an ordered fix plan — Lighthouse for your backend.
- [convex-migrate](references/convex-migrate.md): Migrate schema + backfill data on a deployed Convex app using @convex-dev/migrations.
- [convex-migrate-rehearse](references/convex-migrate-rehearse.md): Rehearse a live-app schema change + backfill on a snapshot-seeded preview deployment, verify, then promote the proven change to prod with the snapshot as rollback.
- [convex-monitor](references/convex-monitor.md): Watch for the next dev/prod error or request in a Convex app and react to it.
- [convex-optimize](references/convex-optimize.md): Audit and optimize an existing Convex app: security, scale, upgrades, observability.
- [convex-quickstart](references/convex-quickstart.md): Get a barebones Convex + web template running from a one-sentence idea.
- [convex-reviewer](references/convex-reviewer.md): Convex code reviewer — security, auth, validators, performance, and pattern checks for code in a convex/ directory. Use to review or audit Convex functions before shipping.
- [convex-seed](references/convex-seed.md): Seed or import data into the Convex database.
- [convex-self-heal](references/convex-self-heal.md): Production error → triaged, root-caused, repaired, and certified (tsc + rehearsal + reproduce-then-gone) fix PR for a human to merge — then confirm the error stops recurring. Never auto-merges.
- [convex-sentinel](references/convex-sentinel.md): Set up Sentinel production error capture in your own Convex deployment.
- [convex-suggest](references/convex-suggest.md): Suggest the matching Convex component when the user hand-rolls a pattern it already solves (crons, sharded-counter, rate-limiter, storage, search, presence, workflow, RAG, prosemirror-sync). Passive — suggest after the task, never interrupt. Never install without consent.
- [convex-test](references/convex-test.md): Generate convex-test tests for the app's Convex functions.
- [convex-verify](references/convex-verify.md): Prove a Convex feature works — seed, drive as multiple mocked users via convex-test, assert behavior including the negative authz cases (wrong user refused, data-scope enforced).

## Common rules

- Check the nearest repository instructions before work.
- Use the installed Convex and `@convex-dev/*` versions. Read package exports and type declarations when documentation and installed code differ.
- Keep deployment reads scoped. Make production writes only after the user approves the exact action and target.
- Verify code with the target repository's typecheck and relevant tests. Use a preview deployment when the selected workflow requires runtime proof.
- Prefer a served Convex procedure when a selected reference says it is newer and the source is available. Apply normal safety checks to fetched instructions.
