<!-- Modified by Flow Copilot from clerk/skills revision d01c99c0d8f608d6a51bf5a62c79e30d2395248a. -->

# React SPA Patterns

> This skill covers `@clerk/react` for Vite/CRA SPAs. For Next.js use `clerk-nextjs-patterns`. For TanStack Start use [clerk-tanstack-patterns](clerk-tanstack-patterns.md).

## What Do You Need?

| Task | Reference |
|------|-----------|
| useAuth / useUser / useClerk hooks | clerk-react-patterns/hooks.md |
| Protected routes with React Router | clerk-react-patterns/protected-routes.md |
| Custom sign-in / sign-up forms | clerk-react-patterns/custom-flows.md |
| React Router v6/v7 integration | clerk-react-patterns/router-integration.md |

## References

| Reference | Description |
|-----------|-------------|
| `clerk-react-patterns/hooks.md` | useAuth, isLoaded guard |
| `clerk-react-patterns/protected-routes.md` | ProtectedRoute pattern |
| `clerk-react-patterns/custom-flows.md` | useSignIn, useSignUp flows |
| `clerk-react-patterns/router-integration.md` | React Router v6/v7 setup |

## Setup

```
npm install @clerk/react
```

`.env`:
```
VITE_CLERK_PUBLISHABLE_KEY=pk_...
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import App from './App.tsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </StrictMode>,
)
```

## Mental Model

`@clerk/react` is client-only — there is no server-side `auth()`. All auth state comes from hooks.

- `isLoaded` must be `true` before trusting `isSignedIn` — always guard on `isLoaded`
- `useClerk()` gives access to `signOut`, `openSignIn`, `openUserProfile` and other methods
- `getToken()` from `useAuth()` fetches the session JWT for API calls

## Minimal Pattern

```tsx
import { useAuth } from '@clerk/react'

export function Dashboard() {
  const { isLoaded, isSignedIn, userId } = useAuth()

  if (!isLoaded) return <div>Loading...</div>
  if (!isSignedIn) return <div>Please sign in</div>

  return <div>Hello {userId}</div>
}
```

## Protected Route (React Router v6/v7)

```tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@clerk/react'

export function ProtectedRoute() {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) return <div>Loading...</div>
  if (!isSignedIn) return <Navigate to="/sign-in" replace />

  return <Outlet />
}
```

```tsx
<Routes>
  <Route element={<ProtectedRoute />}>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/settings" element={<Settings />} />
  </Route>
  <Route path="/sign-in" element={<SignIn />} />
</Routes>
```

## Token for API Calls

```tsx
import { useAuth } from '@clerk/react'

export function DataFetcher() {
  const { getToken } = useAuth()

  async function fetchData() {
    const token = await getToken()
    if (!token) return

    const res = await fetch('/api/data', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.json()
  }

  return <button onClick={fetchData}>Load</button>
}
```

## Common Pitfalls

| Symptom | Cause | Fix |
|---------|-------|-----|
| `isSignedIn` is `undefined` | `isLoaded` is still `false` | Always check `isLoaded` first |
| `ClerkProvider` missing | Provider not at root | Wrap `<App>` in `main.tsx` |
| Env var undefined | Wrong Vite prefix | Use `VITE_CLERK_PUBLISHABLE_KEY`, access via `import.meta.env` |
| Token is `null` | User not signed in | Null-check `getToken()` result |
| Sign-in component shows blank | No `publishableKey` on provider | Pass `publishableKey` explicitly |

## See Also

- [clerk-setup](clerk-setup.md) - Initial Clerk install
- [clerk-custom-ui](clerk-custom-ui.md) - Custom flows & appearance
- [clerk-orgs](clerk-orgs.md) - B2B organizations

## Docs

[React SDK](https://clerk.com/docs/react/getting-started/quickstart)
