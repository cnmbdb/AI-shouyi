import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.8";

const allowedOrigins = new Set([
  "https://ai.suxin.ai",
  "https://cnmbdb.github.io",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

const json = (origin: string, status: number, payload: unknown) => new Response(
  JSON.stringify(payload),
  {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin",
    },
  },
);

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin") ?? "";
  if (!allowedOrigins.has(origin)) return new Response("Forbidden", { status: 403 });
  if (request.method === "OPTIONS") return json(origin, 200, { ok: true });
  if (request.method !== "POST") return json(origin, 405, { error: "Method not allowed" });

  try {
    const body = await request.json();
    const identifier = String(body.identifier ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (identifier.length < 2 || identifier.length > 254 || password.length < 6 || password.length > 200) {
      return json(origin, 400, { error: "请输入有效的用户名或邮箱和密码" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    const publishableKey = publishableKeys.default ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const secretKey = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !publishableKey || !secretKey) {
      return json(origin, 500, { error: "认证服务配置不完整" });
    }

    const admin = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let email = identifier;
    if (!identifier.includes("@")) {
      const { data: alias } = await admin
        .from("login_aliases")
        .select("email_normalized")
        .eq("username_normalized", identifier)
        .maybeSingle();
      email = alias?.email_normalized ?? "";
    }

    if (!email) return json(origin, 401, { error: "用户名、邮箱或密码不正确" });

    const authClient = createClient(supabaseUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await authClient.auth.signInWithPassword({ email, password });

    if (error || !data.session || !data.user) {
      return json(origin, 401, { error: "用户名、邮箱或密码不正确" });
    }

    return json(origin, 200, {
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
      user: { id: data.user.id },
    });
  } catch {
    return json(origin, 400, { error: "登录请求格式无效" });
  }
});
