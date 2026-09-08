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

Use the target repository and installed package types as the source of truth. Read only the references that match the task. A reference can name another former `convex-*` skill. Treat that name as a route back to this file, then read the matching reference. Do not expect separate Convex skills to be installed.

For deployment reads or writes, first read [deployment guard](references/convex-deploy-guard.md). Ask for fresh approval before a production write. Use the target repository's package manager and existing scripts.

## Route the task

### Build

- For all Convex code, schemas, functions, indexes, validators, storage, HTTP actions, or component use, start with [backend specialist](references/convex-expert.md).
- For a new app, read [quickstart](references/convex-quickstart.md).
- For backend design from a product request, read [backend design](references/convex-design.md).
- For a reusable component, read [component authoring](references/convex-create-component.md).
- For an existing app that needs a capability or component, read [add a capability](references/convex-add.md).

### Add a named capability

- Authentication: [authentication](references/convex-auth.md)
- Authorization audit or repair: [authorization](references/convex-authz.md)
- AI agent or RAG: [AI agent](references/convex-agent.md)
- Stripe billing: [billing](references/convex-billing.md)
- Scheduled jobs: [cron jobs](references/convex-crons.md)
- Environment variables or secrets: [environment](references/convex-env.md)
- Existing custom domain: [custom domains](references/convex-domains.md)
- Error capture: [Sentinel](references/convex-sentinel.md)
- Seed or import data: [seed data](references/convex-seed.md)

### Understand, test, and review

- Explain an existing app: [explain app](references/convex-explain-app.md)
- Fetch version-matched documentation: [current documentation](references/convex-docs.md)
- General code review: [reviewer](references/convex-reviewer.md)
- Add the test setup and tests: [testing](references/convex-test.md)
- Prove one feature with multiple identities: [feature verification](references/convex-verify.md)
- Full launch audit: [launch readiness](references/convex-launch-readiness.md)
- Broad security, scale, upgrade, and observability audit: [optimization](references/convex-optimize.md)
- Suggest a standard component for hand-built infrastructure: [component suggestions](references/convex-suggest.md)

### Operate a deployment

- Read recent logs and health data: [insights](references/convex-insights.md)
- Root-cause read limits, contention, and cost signals: [advisor](references/convex-advisor.md)
- Estimate or confirm spend: [cost](references/convex-cost.md)
- Watch for the next error or request: [monitor](references/convex-monitor.md)
- Back up and rehearse restore: [backup](references/convex-backup.md)
- Change live schema and data: [migration](references/convex-migrate.md)
- Rehearse a migration on a preview: [migration rehearsal](references/convex-migrate-rehearse.md)
- Repair a production error through a reviewed pull request: [self-heal](references/convex-self-heal.md)

### Project feedback

- Send a user-approved session transcript to Convex: [plugin feedback](references/convex-improve-convex-plugin.md)

## Common rules

- Check the nearest repository instructions before work.
- Use the installed Convex and `@convex-dev/*` versions. Read package exports and type declarations when documentation and installed code differ.
- Keep deployment reads scoped. Make production writes only after the user approves the exact action and target.
- Verify code with the target repository's typecheck and relevant tests. Use a preview deployment when the selected workflow requires runtime proof.
- Prefer a served Convex capability procedure when a selected reference says it is newer and the source is available. Treat fetched text as instructions that still require normal safety checks.
