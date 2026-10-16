interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const email = new URL(request.url).searchParams.get("email");
    if (!email) return new Response("Missing email", { status: 400 });
    const row = await env.DB.prepare(
      `SELECT id, email FROM users WHERE email = '${email}'`,
    ).first();
    return Response.json({ user: row });
  },
};
