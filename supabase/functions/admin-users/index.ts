import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.8";

const allowedOrigins = new Set([
  "https://ai.suxin.ai",
  "https://cnmbdb.github.io",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "http://localhost",
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

      const activeUsers = usersData.users.filter((user) => !user.deleted_at);
      const ids = activeUsers.map((user) => user.id);
      const profilesResult = ids.length
        ? await admin.from("profiles").select("id, username, display_name, role, created_at").in("id", ids)
        : { data: [], error: null };
      if (profilesResult.error) return json(origin, 500, { error: "无法读取用户资料" });

      const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
      const users = activeUsers.map((user) => {
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
        total: users.length,
      });
    }

    if (action === "detail") {
      const userId = String(body.userId ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(userId)) {
        return json(origin, 400, { error: "用户参数无效" });
      }

      const { data: authUserResult, error: authUserError } = await admin.auth.admin.getUserById(userId);
      const authUser = authUserResult?.user;
      if (authUserError || !authUser || authUser.deleted_at) {
        return json(origin, 404, { error: "用户不存在或已删除" });
      }

      const [profileResult, ordersResult, devicesResult, earningsResult, transactionsResult, legacyOrdersResult] = await Promise.all([
        admin.from("profiles").select("id, username, display_name, avatar_url, avatar_color, role, created_at, updated_at").eq("id", userId).maybeSingle(),
        admin.from("store_orders").select("id, order_no, product_id, parent_order_id, order_type, product_snapshot, quantity, period_unit, period_count, unit_price, subtotal, fee_amount, total_amount, currency, status, service_starts_at, service_expires_at, expires_at, paid_at, created_at, updated_at").eq("user_id", userId).order("created_at", { ascending: false }),
        admin.from("compute_devices").select("id, device_code, name, compute, status, daily_yield, expires_at, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
        admin.from("earnings").select("id, device_id, amount, earned_on, status, created_at").eq("user_id", userId).order("earned_on", { ascending: false }),
        admin.from("transactions").select("id, transaction_type, reference, amount, status, occurred_at").eq("user_id", userId).order("occurred_at", { ascending: false }),
        admin.from("rental_orders").select("id, order_no, product, period_months, amount, status, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
      ]);

      const failed = [profileResult, ordersResult, devicesResult, earningsResult, transactionsResult, legacyOrdersResult].find((result) => result.error);
      if (failed?.error) return json(origin, 500, { error: "无法读取用户业务资料" });

      const orders = ordersResult.data ?? [];
      const orderIds = orders.map((order) => order.id);
      const productIds = [...new Set(orders.map((order) => order.product_id).filter(Boolean))];
      const [paymentsResult, productsResult] = await Promise.all([
        orderIds.length
          ? admin.from("store_payments").select("id, payment_no, order_id, channel_id, provider_trade_no, amount, currency, status, interaction_mode, paid_at, expires_at, created_at").in("order_id", orderIds).order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        productIds.length
          ? admin.from("store_products").select("id, category_id, slug, sku, name, image_url, gpu_model, vram, hosting_term, billing_type, enabled").in("id", productIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (paymentsResult.error || productsResult.error) {
        return json(origin, 500, { error: "无法读取用户商城关联资料" });
      }

      const profile = profileResult.data;
      return json(origin, 200, {
        user: {
          id: authUser.id,
          email: authUser.email ?? "",
          phone: authUser.phone ?? "",
          username: profile?.username ?? authUser.email?.split("@")[0] ?? "user",
          displayName: profile?.display_name ?? profile?.username ?? "",
          avatarUrl: profile?.avatar_url ?? "",
          avatarColor: profile?.avatar_color ?? "#525252",
          role: profile?.role === "admin" ? "admin" : "user",
          emailConfirmedAt: authUser.email_confirmed_at ?? null,
          phoneConfirmedAt: authUser.phone_confirmed_at ?? null,
          providers: [...new Set((authUser.identities ?? []).map((identity) => identity.provider).filter(Boolean))],
          createdAt: authUser.created_at,
          updatedAt: profile?.updated_at ?? authUser.updated_at ?? null,
          lastSignInAt: authUser.last_sign_in_at ?? null,
        },
        orders,
        products: productsResult.data ?? [],
        payments: paymentsResult.data ?? [],
        devices: devicesResult.data ?? [],
        earnings: earningsResult.data ?? [],
        transactions: transactionsResult.data ?? [],
        legacyOrders: legacyOrdersResult.data ?? [],
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

    if (action === "delete-users") {
      const rawIds = Array.isArray(body.userIds) ? body.userIds : [];
      const userIds = [...new Set(rawIds.map((value: unknown) => String(value)))];
      if (!userIds.length || userIds.length > 50 || userIds.some((userId) => !/^[0-9a-f-]{36}$/i.test(userId))) {
        return json(origin, 400, { error: "请选择 1 至 50 个有效用户" });
      }
      if (userIds.includes(authData.user.id)) {
        return json(origin, 400, { error: "不能删除当前登录的管理员账号" });
      }

      const deletedIds: string[] = [];
      const failedIds: string[] = [];
      for (const userId of userIds) {
        // Soft deletion removes the login identity while preserving rental,
        // payment and settlement records required for business reconciliation.
        const { error: deleteError } = await admin.auth.admin.deleteUser(userId, true);
        if (deleteError) {
          failedIds.push(userId);
        } else {
          deletedIds.push(userId);
        }
      }

      return json(origin, 200, { deletedIds, failedIds });
    }

    return json(origin, 400, { error: "不支持的管理操作" });
  } catch {
    return json(origin, 400, { error: "管理请求格式无效" });
  }
});
