---
name: clerk
description: Add, configure, and operate Clerk authentication. Use when a project uses Clerk or @clerk packages, or the task involves Clerk setup, the Clerk CLI or Backend API, custom sign-in UI, organizations, billing, webhooks, E2E auth testing, React SPA, TanStack Start, or Expo auth.
license: MIT
metadata:
  author: flowcopilot
  upstream: clerk/skills@d01c99c0d8f608d6a51bf5a62c79e30d2395248a
---

<!-- Modified by Flow Copilot from clerk/skills revision d01c99c0d8f608d6a51bf5a62c79e30d2395248a. -->

# Clerk

Detect the installed Clerk SDK version first, then read only the references that match the task. A former `clerk-*` skill name now refers to its file below. Do not expect separate Clerk skills to be installed. Script paths in references are relative to this skill directory.

This bundle imports a subset of Clerk's skills. Not bundled: `clerk-astro-patterns`, `clerk-nuxt-patterns`, `clerk-nextjs-patterns`, `clerk-react-router-patterns`, `clerk-vue-patterns`, `clerk-chrome-extension-patterns`, `clerk-swift`, `clerk-android`. When a reference points to one of these, use the current Clerk documentation for that framework instead.

## Version Detection

Check `package.json` to determine the Clerk SDK version. This determines which patterns to use:

| Package | Core 2 (LTS until Jan 2027) | Current |
|---------|----------------------------|---------|
| `@clerk/nextjs` | v5–v6 | v7+ |
| `@clerk/react` or `@clerk/clerk-react` | v5–v6 | v7+ |
| `@clerk/expo` or `@clerk/clerk-expo` | v1–v2 | v3+ |
| `@clerk/react-router` | v1–v2 | v3+ |
| `@clerk/tanstack-react-start` | < v0.26.0 | v0.26.0+ |

**Default to current** if the version is unclear or the project is new. Core 2 packages use `@clerk/clerk-react` and `@clerk/clerk-expo` (with `clerk-` prefix); current packages use `@clerk/react` and `@clerk/expo`.

All skills are written for the current SDK. When something differs in Core 2, it's noted inline with `> **Core 2 ONLY (skip if current SDK):**` callouts. The exception is [clerk-custom-ui](references/clerk-custom-ui.md), which has separate `core-2/` and `core-3/` directories for custom flow hooks since those APIs are entirely different between versions.

## Workflows

### Core

- [clerk-backend-api](references/clerk-backend-api.md): Clerk Backend REST API explorer and executor. Browse tags, inspect endpoint schemas, and execute authenticated requests. Use when listing users, managing organizations, or calling any Clerk API endpoint.
- [clerk-cli](references/clerk-cli.md): Operate the Clerk CLI (`clerk` binary) for authentication, user/org/session management, impersonation, local webhook testing, deploy verification, instance config, env keys, feature toggles, and any Clerk Backend, Platform, or Frontend API call. Use when the user mentions Clerk management tasks, "list clerk users", "impersonate a user", "test webhooks locally", "enable orgs", "enable billing", "clerk env pull", "clerk doctor", "clerk deploy", "clerk api", or any ad-hoc Clerk API request. Prefer the CLI over raw HTTP: it handles auth, key resolution, app/instance targeting, and formatting automatically.
- [clerk-custom-ui](references/clerk-custom-ui.md): Custom authentication flows and component appearance - hooks (useSignIn, useSignUp), themes, colors, fonts, CSS. Use for custom sign-in/sign-up flows, appearance styling, visual customization, branding.
- [clerk-setup](references/clerk-setup.md): Set up Clerk authentication in any project with the Clerk CLI and official framework quickstarts. Use when adding Clerk, initializing Clerk, scaffolding a new app with Clerk, or migrating an existing authentication system to Clerk.

### Features

- [clerk-billing](references/clerk-billing.md): Clerk Billing for subscription management - render Clerk's PricingTable and in-app checkout drawer, configure subscription plans, seat-limit plans for B2B, feature entitlements with has(), and billing webhooks. Use for SaaS monetization, plan gating, checkout flows, trials, invoicing, and subscription lifecycle management.
- [clerk-orgs](references/clerk-orgs.md): Clerk Organizations for B2B and multi-tenant apps - org switching, roles and permissions, verified domains, and enterprise SSO. Use for team workspaces, RBAC, org-scoped routing, member management. Also load this when a project treats teams, workspaces, tenants, or companies as its customers - shared accounts, inviting teammates, per-seat pricing, per-company data isolation - even when the words "organization" or "B2B" are never used.
- [clerk-testing](references/clerk-testing.md): E2E testing for Clerk apps. Use with Playwright or Cypress for auth flow tests.
- [clerk-webhooks](references/clerk-webhooks.md): Clerk webhooks for real-time events and data syncing. Verify with verifyWebhook from the framework-specific package. Handle user, session, organization, billing, and payment events. Build event-driven features like database sync, notifications, and integrations.

### Frameworks

- [clerk-react-patterns](references/clerk-react-patterns.md): React SPA auth patterns with @clerk/react for Vite/CRA - ClerkProvider setup, useAuth/useUser/useClerk hooks, React Router protected routes, custom sign-in flows. Triggers on: Vite Clerk setup, React Router auth, useAuth hook, protected route, custom sign-in form React.
- [clerk-tanstack-patterns](references/clerk-tanstack-patterns.md): TanStack React Start auth patterns with @clerk/tanstack-react-start - createServerFn, beforeLoad guards, loaders, Vinxi server. Triggers on: TanStack auth, createServerFn clerk, beforeLoad protection, TanStack Start middleware.

### Mobile

- [clerk-expo](references/clerk-expo.md): Add Clerk authentication to Expo and React Native apps using @clerk/expo. Use for Expo setup, prebuilt native components (AuthView, UserButton), custom sign-in/sign-up flows (email, password, SMS/phone OTP, MFA), OAuth/SSO, native Google/Apple sign-in, Expo Router protected routes, biometrics, and push notifications. Do not use for native Swift/iOS, native Android/Kotlin, or web-only framework projects.

## Common rules

- Treat the installed `@clerk/*` packages, their type declarations, and current Clerk documentation as the source of truth when a reference differs.
- Load more than one reference when a task crosses areas. For example, B2B billing needs both the organizations and billing references.
- Confirm before any write to a Clerk instance, and never use production keys for tests.
