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

const uuidPattern = /^[0-9a-f-]{36}$/i;
const orderNumber = () => `ADM${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}${crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;

const requireReason = (value: unknown) => {
  const reason = String(value ?? "").trim();
  if (reason.length < 2 || reason.length > 500) throw new Error("请填写 2 至 500 字的调整原因");
  return reason;
};

const writeAudit = async (
  admin: ReturnType<typeof createClient>,
  payload: Record<string, unknown>,
) => {
  const { error } = await admin.from("admin_user_audit_logs").insert(payload);
  if (error) throw new Error("业务数据已处理，但审计记录写入失败，请立即联系技术人员核对");
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

      const [profileResult, ordersResult, devicesResult, earningsResult, transactionsResult, legacyOrdersResult, verificationResult, auditResult, catalogResult] = await Promise.all([
        admin.from("profiles").select("id, username, display_name, avatar_url, avatar_color, role, created_at, updated_at").eq("id", userId).maybeSingle(),
        admin.from("store_orders").select("id, order_no, product_id, parent_order_id, order_type, product_snapshot, quantity, period_unit, period_count, unit_price, subtotal, fee_amount, total_amount, currency, status, service_starts_at, service_expires_at, expires_at, paid_at, created_at, updated_at").eq("user_id", userId).order("created_at", { ascending: false }),
        admin.from("compute_devices").select("id, device_code, name, compute, status, daily_yield, expires_at, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
        admin.from("earnings").select("id, device_id, amount, earned_on, status, created_at").eq("user_id", userId).order("earned_on", { ascending: false }),
        admin.from("transactions").select("id, transaction_type, reference, amount, status, occurred_at").eq("user_id", userId).order("occurred_at", { ascending: false }),
        admin.from("rental_orders").select("id, order_no, product, period_months, amount, status, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
        admin.from("user_verifications").select("user_id, identity_status, funds_status, identity_note, funds_note, updated_by, created_at, updated_at").eq("user_id", userId).maybeSingle(),
        admin.from("admin_user_audit_logs").select("id, admin_id, action, target_kind, target_id, before_value, after_value, reason, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
        admin.from("store_products").select("id, category_id, slug, sku, name, image_url, gpu_model, vram, hosting_term, billing_type, rental_price, rental_period_unit, rental_period_count, buyout_price, inventory, enabled").order("sort_order"),
      ]);

      const failed = [profileResult, ordersResult, devicesResult, earningsResult, transactionsResult, legacyOrdersResult, verificationResult, auditResult, catalogResult].find((result) => result.error);
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
        verification: verificationResult.data ?? null,
        auditLogs: auditResult.data ?? [],
        catalogProducts: catalogResult.data ?? [],
      });
    }

    if (action === "manage-record") {
      const userId = String(body.userId ?? "");
      const resource = String(body.resource ?? "");
      const operation = String(body.operation ?? "");
      const reason = requireReason(body.reason);
      if (!uuidPattern.test(userId) || !["order", "device", "transaction", "verification"].includes(resource) || !["create", "update", "delete"].includes(operation)) {
        return json(origin, 400, { error: "管理操作参数无效" });
      }
      const { data: managedUser } = await admin.auth.admin.getUserById(userId);
      if (!managedUser?.user || managedUser.user.deleted_at) return json(origin, 404, { error: "用户不存在或已删除" });

      let targetId = String(body.targetId ?? "");
      let beforeValue: Record<string, unknown> | null = null;
      let afterValue: Record<string, unknown> | null = null;

      if (resource === "order") {
        const legacy = Boolean(body.legacy);
        if (legacy) {
          if (operation === "create") throw new Error("新增订单请关联商城商品，不再创建旧版租赁订单");
          if (!uuidPattern.test(targetId)) throw new Error("订单参数无效");
          const { data: existing, error: readError } = await admin.from("rental_orders").select("*").eq("id", targetId).eq("user_id", userId).maybeSingle();
          if (readError || !existing) throw new Error("旧版订单不存在");
          beforeValue = existing;
          if (operation === "delete") {
            const { error } = await admin.from("rental_orders").delete().eq("id", targetId).eq("user_id", userId);
            if (error) throw new Error("旧版订单删除失败");
          } else {
            const update = {
              product: String(body.product ?? existing.product).trim().slice(0, 160),
              period_months: Math.max(1, Math.min(120, Number(body.periodCount) || existing.period_months)),
              amount: Math.max(0, Number(body.totalAmount) || 0),
              status: String(body.status ?? existing.status).trim().slice(0, 40),
            };
            const { data, error } = await admin.from("rental_orders").update(update).eq("id", targetId).eq("user_id", userId).select().single();
            if (error) throw new Error("旧版订单更新失败");
            afterValue = data;
          }
        } else if (operation === "create") {
          const productId = String(body.productId ?? "");
          const { data: product, error: productError } = await admin.from("store_products").select("*").eq("id", productId).maybeSingle();
          if (productError || !product) throw new Error("请选择有效的商城商品");
          const orderType = String(body.orderType ?? "rental");
          if (!["rental", "buyout"].includes(orderType)) throw new Error("订单类型无效");
          if (orderType === "rental" && product.billing_type === "buyout") throw new Error("该商品不支持租用");
          if (orderType === "buyout" && product.billing_type === "rental") throw new Error("该商品不支持买断");
          const quantity = Math.max(1, Math.min(100, Number(body.quantity) || 1));
          const periodCount = orderType === "buyout" ? null : Math.max(1, Math.min(120, Number(body.periodCount) || product.rental_period_count));
          const unitPrice = Math.max(0, Number(body.unitPrice) || Number(orderType === "buyout" ? product.buyout_price : product.rental_price));
          const totalAmount = Math.max(0, Number(body.totalAmount) || unitPrice * quantity);
          const status = String(body.status ?? "completed");
          if (!["pending_payment", "paid", "processing", "completed", "expired", "cancelled", "refunded"].includes(status)) throw new Error("订单状态无效");
          const snapshot = { id: product.id, slug: product.slug, sku: product.sku, name: product.name, image: product.image_url, gpuModel: product.gpu_model, vram: product.vram, billingType: product.billing_type };
          const now = new Date().toISOString();
          const payload = {
            order_no: orderNumber(), user_id: userId, product_id: product.id, order_type: orderType, product_snapshot: snapshot,
            quantity, period_unit: orderType === "buyout" ? null : product.rental_period_unit, period_count: periodCount,
            unit_price: unitPrice, subtotal: totalAmount, fee_amount: 0, total_amount: totalAmount, status,
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            paid_at: ["paid", "processing", "completed"].includes(status) ? now : null,
            service_starts_at: ["paid", "processing", "completed"].includes(status) ? now : null,
            service_expires_at: body.serviceExpiresAt || null,
          };
          const { data, error } = await admin.from("store_orders").insert(payload).select().single();
          if (error) throw new Error(error.code === "23505" ? "订单号冲突，请重试" : "商城订单创建失败");
          targetId = data.id;
          afterValue = data;
        } else {
          if (!uuidPattern.test(targetId)) throw new Error("订单参数无效");
          const { data: existing, error: readError } = await admin.from("store_orders").select("*").eq("id", targetId).eq("user_id", userId).maybeSingle();
          if (readError || !existing) throw new Error("商城订单不存在");
          beforeValue = existing;
          if (operation === "delete") {
            const [{ count: paymentCount }, { count: renewalCount }] = await Promise.all([
              admin.from("store_payments").select("id", { count: "exact", head: true }).eq("order_id", targetId),
              admin.from("store_orders").select("id", { count: "exact", head: true }).eq("parent_order_id", targetId),
            ]);
            if ((paymentCount ?? 0) > 0 || (renewalCount ?? 0) > 0) throw new Error("订单已有支付或续费记录，不能删除；请改为取消或退款状态");
            const { error } = await admin.from("store_orders").delete().eq("id", targetId).eq("user_id", userId);
            if (error) throw new Error("商城订单删除失败");
          } else {
            const status = String(body.status ?? existing.status);
            if (!["pending_payment", "paid", "processing", "completed", "expired", "cancelled", "refunded"].includes(status)) throw new Error("订单状态无效");
            const update = {
              status,
              total_amount: Math.max(0, Number(body.totalAmount) || 0),
              period_count: existing.order_type === "buyout" ? null : Math.max(1, Math.min(120, Number(body.periodCount) || existing.period_count || 1)),
              service_expires_at: body.serviceExpiresAt || null,
            };
            const { data, error } = await admin.from("store_orders").update(update).eq("id", targetId).eq("user_id", userId).select().single();
            if (error) throw new Error("商城订单更新失败");
            afterValue = data;
          }
        }
      }

      if (resource === "device") {
        if (operation === "create") {
          const payload = {
            user_id: userId,
            device_code: String(body.deviceCode ?? "").trim().slice(0, 80),
            name: String(body.name ?? "").trim().slice(0, 160),
            compute: String(body.compute ?? "").trim().slice(0, 120),
            status: String(body.status ?? "待交付").trim().slice(0, 40),
            daily_yield: Math.max(0, Number(body.dailyYield) || 0),
            expires_at: body.expiresAt || null,
          };
          if (!payload.device_code || !payload.name || !payload.compute) throw new Error("请完整填写设备编号、名称和算力");
          const { data, error } = await admin.from("compute_devices").insert(payload).select().single();
          if (error) throw new Error(error.code === "23505" ? "该用户已存在相同设备编号" : "设备添加失败");
          targetId = data.id;
          afterValue = data;
        } else {
          if (!uuidPattern.test(targetId)) throw new Error("设备参数无效");
          const { data: existing, error: readError } = await admin.from("compute_devices").select("*").eq("id", targetId).eq("user_id", userId).maybeSingle();
          if (readError || !existing) throw new Error("设备不存在");
          beforeValue = existing;
          if (operation === "delete") {
            const { error } = await admin.from("compute_devices").delete().eq("id", targetId).eq("user_id", userId);
            if (error) throw new Error("设备删除失败");
          } else {
            const update = {
              device_code: String(body.deviceCode ?? existing.device_code).trim().slice(0, 80),
              name: String(body.name ?? existing.name).trim().slice(0, 160),
              compute: String(body.compute ?? existing.compute).trim().slice(0, 120),
              status: String(body.status ?? existing.status).trim().slice(0, 40),
              daily_yield: Math.max(0, Number(body.dailyYield) || 0),
              expires_at: body.expiresAt || null,
            };
            const { data, error } = await admin.from("compute_devices").update(update).eq("id", targetId).eq("user_id", userId).select().single();
            if (error) throw new Error("设备更新失败");
            afterValue = data;
          }
        }
      }

      if (resource === "transaction") {
        if (operation === "create") {
          const amount = Number(body.amount);
          if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 100000000) throw new Error("资金金额必须是有效的非零数值");
          const payload = {
            user_id: userId,
            transaction_type: String(body.transactionType ?? "管理员调整").trim().slice(0, 80),
            reference: String(body.reference ?? `ADJ-${Date.now()}`).trim().slice(0, 120),
            amount,
            status: String(body.status ?? "已入账").trim().slice(0, 40),
          };
          const { data, error } = await admin.from("transactions").insert(payload).select().single();
          if (error) throw new Error("资金调整失败");
          targetId = data.id;
          afterValue = data;
        } else {
          if (!uuidPattern.test(targetId)) throw new Error("资金记录参数无效");
          const { data: existing, error: readError } = await admin.from("transactions").select("*").eq("id", targetId).eq("user_id", userId).maybeSingle();
          if (readError || !existing) throw new Error("资金记录不存在");
          beforeValue = existing;
          if (operation === "delete") {
            const { error } = await admin.from("transactions").delete().eq("id", targetId).eq("user_id", userId);
            if (error) throw new Error("资金记录删除失败");
          } else {
            const amount = Number(body.amount);
            if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 100000000) throw new Error("资金金额必须是有效的非零数值");
            const update = {
              transaction_type: String(body.transactionType ?? existing.transaction_type).trim().slice(0, 80),
              reference: String(body.reference ?? existing.reference).trim().slice(0, 120),
              amount,
              status: String(body.status ?? existing.status).trim().slice(0, 40),
            };
            const { data, error } = await admin.from("transactions").update(update).eq("id", targetId).eq("user_id", userId).select().single();
            if (error) throw new Error("资金记录更新失败");
            afterValue = data;
          }
        }
      }

      if (resource === "verification") {
        targetId = userId;
        const { data: existing } = await admin.from("user_verifications").select("*").eq("user_id", userId).maybeSingle();
        beforeValue = existing;
        if (operation === "delete") {
          const { error } = await admin.from("user_verifications").delete().eq("user_id", userId);
          if (error) throw new Error("认证记录清除失败");
        } else {
          const identityStatus = String(body.identityStatus ?? existing?.identity_status ?? "pending");
          const fundsStatus = String(body.fundsStatus ?? existing?.funds_status ?? "pending");
          if (!["pending", "verified", "rejected"].includes(identityStatus) || !["pending", "verified", "rejected"].includes(fundsStatus)) throw new Error("认证状态无效");
          const payload = {
            user_id: userId,
            identity_status: identityStatus,
            funds_status: fundsStatus,
            identity_note: String(body.identityNote ?? "").trim().slice(0, 1000),
            funds_note: String(body.fundsNote ?? "").trim().slice(0, 1000),
            updated_by: authData.user.id,
          };
          const { data, error } = await admin.from("user_verifications").upsert(payload, { onConflict: "user_id" }).select().single();
          if (error) throw new Error("认证状态保存失败");
          afterValue = data;
        }
      }

      await writeAudit(admin, {
        admin_id: authData.user.id,
        user_id: userId,
        action: `${operation}-${resource}`,
        target_kind: resource,
        target_id: targetId || null,
        before_value: beforeValue,
        after_value: afterValue,
        reason,
      });
      return json(origin, 200, { ok: true, resource, operation, targetId });
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
  } catch (error) {
    return json(origin, 400, { error: error instanceof Error ? error.message : "管理请求格式无效" });
  }
});
