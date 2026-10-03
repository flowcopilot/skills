<!-- Modified by Flow Copilot from cloudflare/skills revision 41e0d19858946d18af9ee2c2feebbe2e11d829ff. -->

# Client SDK

Choose `useAgent` for React state/RPC, `AgentClient` for other WebSocket clients, and `agentFetch` for one-off HTTP requests. Add `useAgentChat` when the UI needs chat messages and streaming. Check installed package versions before adapting current examples.

| Task | Documentation |
|------|---------------|
| Connect, sync state, call RPC, or send HTTP requests | [Client SDK](https://developers.cloudflare.com/agents/communication-channels/chat/client-sdk/index.md) — hooks, vanilla JS, typed calls, streaming callbacks, and connection options |
| Build chat UI | [Chat agents](https://developers.cloudflare.com/agents/communication-channels/chat/chat-agents/index.md) — `useAgentChat`, message rendering, status, and tool interactions |
| Authenticate across origins | [Cross-domain authentication](https://developers.cloudflare.com/agents/runtime/operations/cross-domain-authentication/index.md) — token validation and WebSocket authentication |

Keep client instance selection consistent with server routing. For authentication, account for token refresh on reconnect and query caching. Close manually created `AgentClient` connections when finished; React hooks manage their own cleanup.
