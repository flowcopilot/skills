<!-- Modified by Flow Copilot from clerk/skills revision d01c99c0d8f608d6a51bf5a62c79e30d2395248a. -->

# TanStack React Start Patterns

## What Do You Need?

| Task | Reference |
|------|-----------|
| Protect routes with beforeLoad | clerk-tanstack-patterns/router-guards.md |
| Auth in createServerFn | clerk-tanstack-patterns/server-functions.md |
| Pass auth to loaders | clerk-tanstack-patterns/loaders.md |
| Configure Vinxi + clerkMiddleware | clerk-tanstack-patterns/vinxi-server.md |

## References

| Reference | Description |
|-----------|-------------|
| `clerk-tanstack-patterns/router-guards.md` | beforeLoad auth redirect |
| `clerk-tanstack-patterns/server-functions.md` | createServerFn with auth() |
| `clerk-tanstack-patterns/loaders.md` | Auth context in loaders |
| `clerk-tanstack-patterns/vinxi-server.md` | clerkMiddleware() setup |

## Setup

```
npm install @clerk/tanstack-react-start
```

`.env`:
```
CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
```

`src/start.ts` (Vinxi entry):
```typescript
import { clerkMiddleware } from '@clerk/tanstack-react-start/server'
import { createStart } from '@tanstack/react-start'

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [clerkMiddleware()],
  }
})
```

`src/routes/__root.tsx` — wrap with `<ClerkProvider>`:
```tsx
import { ClerkProvider } from '@clerk/tanstack-react-start'

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>
          {children}
        </ClerkProvider>
      </body>
    </html>
  )
}
```

## Mental Model

TanStack Start runs on Vinxi. Auth flows through two layers:

1. **Server layer** — `createServerFn` + `auth()` from `@clerk/tanstack-react-start/server`
2. **Router layer** — `beforeLoad` on route definitions, throws `redirect` for unauthenticated

Both layers are server-executed. Client hooks (`useAuth`, `useUser`) are React hooks for the browser side.

## Minimal Pattern

```typescript
import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { auth } from '@clerk/tanstack-react-start/server'

const authStateFn = createServerFn().handler(async () => {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated) {
    throw redirect({ to: '/sign-in' })
  }
  return { userId }
})

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => await authStateFn(),
})
```

## Common Pitfalls

| Symptom | Cause | Fix |
|---------|-------|-----|
| `auth()` returns empty | Missing `clerkMiddleware` in start.ts | Add to `requestMiddleware` array |
| `redirect` not thrown | Using `return` instead of `throw` | `throw redirect(...)` in TanStack |
| Wrong import for `auth` | Mixing client/server imports | Server: `@clerk/tanstack-react-start/server` |
| Loader context missing userId | Not passing from beforeLoad | Return from beforeLoad, access via `context` |
| `ClerkProvider` missing | Forgot root wrapping | Add to `__root.tsx` shell component |

## See Also

- [clerk-setup](clerk-setup.md) - Initial Clerk install
- [clerk-custom-ui](clerk-custom-ui.md) - Custom flows & appearance
- [clerk-orgs](clerk-orgs.md) - B2B organizations

## Docs

[TanStack React Start SDK](https://clerk.com/docs/tanstack-react-start/getting-started/quickstart)
