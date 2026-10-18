import { useState } from "react";

type Props = { onSubscribe: (email: string) => Promise<void> };

export function SubscribeForm({ onSubscribe }: Props) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  async function submit() {
    if (!email.includes("@")) { setError("Enter a valid email address."); return; }
    try { await onSubscribe(email); } catch { setError("Subscription failed. Try again."); setEmail(""); }
  }
  return <div>
    <input placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} style={{ outline: "none" }} />
    {error && <p style={{ color: "red" }}>{error}</p>}
    <div onClick={() => void submit()} aria-disabled={!email}>Subscribe</div>
  </div>;
}
