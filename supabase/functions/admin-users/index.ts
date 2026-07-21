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

const readKeys = () => {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
  const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  return {
    url,
    publishableKey: publishableKeys.default ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    secretKey: secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  };
};

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin") ?? "";
  if (!allowedOrigins.has(origin)) return new Response("Forbidden", { status: 403 });
  if (request.method === "OPTIONS") return json(origin, 200, { ok: true });
  if (request.method !== "POST") return json(origin, 405, { error: "Method not allowed" });

  try {
    const { url, publishableKey, secretKey } = readKeys();
    if (!url || !publishableKey || !secretKey) {
      return json(origin, 500, { error: "管理服务配置不完整" });
    }

    const authorization = request.headers.get("authorization") ?? "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) return json(origin, 401, { error: "请先登录" });

    const authClient = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) return json(origin, 401, { error: "登录状态已失效" });

    const admin = createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: callerProfile, error: callerError } = await admin
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    if (callerError || callerProfile?.role !== "admin") {
      return json(origin, 403, { error: "仅管理员可以管理用户" });
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body.action ?? "list");

    if (action === "list") {
      const page = Math.max(1, Math.min(Number(body.page) || 1, 10_000));
      const perPage = Math.max(1, Math.min(Number(body.perPage) || 100, 200));
      const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({ page, perPage });
      if (usersError) return json(origin, 500, { error: "无法读取用户列表" });

      const ids = usersData.users.map((user) => user.id);
      const profilesResult = ids.length
        ? await admin.from("profiles").select("id, username, display_name, role, created_at").in("id", ids)
        : { data: [], error: null };
      if (profilesResult.error) return json(origin, 500, { error: "无法读取用户资料" });

      const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
      const users = usersData.users.map((user) => {
        const profile = profiles.get(user.id);
        return {
          id: user.id,
          email: user.email ?? "",
          username: profile?.username ?? user.email?.split("@")[0] ?? "user",
          displayName: profile?.display_name ?? profile?.username ?? "",
          role: profile?.role === "admin" ? "admin" : "user",
          emailConfirmed: Boolean(user.email_confirmed_at),
          createdAt: user.created_at,
          lastSignInAt: user.last_sign_in_at ?? null,
        };
      });

      return json(origin, 200, {
        users,
        page,
        perPage,
        total: usersData.total ?? users.length,
      });
    }

    if (action === "update-role") {
      const userId = String(body.userId ?? "");
      const role = String(body.role ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(userId) || !["admin", "user"].includes(role)) {
        return json(origin, 400, { error: "用户或角色参数无效" });
      }
      if (userId === authData.user.id && role !== "admin") {
        return json(origin, 400, { error: "不能取消自己的管理员权限" });
      }

      const { data: profile, error: updateError } = await admin
        .from("profiles")
        .update({ role })
        .eq("id", userId)
        .select("id, username, role")
        .maybeSingle();

      if (updateError) return json(origin, 500, { error: "角色更新失败" });
      if (!profile) return json(origin, 404, { error: "用户不存在" });
      return json(origin, 200, { user: profile });
    }

    return json(origin, 400, { error: "不支持的管理操作" });
  } catch {
    return json(origin, 400, { error: "管理请求格式无效" });
  }
});
