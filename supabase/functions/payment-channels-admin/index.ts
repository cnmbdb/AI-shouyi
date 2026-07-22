import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.8";

const allowedOrigins = new Set(["https://ai.suxin.ai", "https://cnmbdb.github.io", "http://localhost:4173", "http://127.0.0.1:4173"]);
const providers = new Set(["manual", "official", "epay", "bepusdt", "epusdt", "okpay", "tokenpay"]);
const interactions = new Set(["qr", "redirect", "wap", "page"]);
const json = (origin: string, status: number, payload: unknown) => new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" } });

const readKeys = () => {
  const publishable = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
  const secrets = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  return { url: Deno.env.get("SUPABASE_URL") ?? "", publishableKey: publishable.default ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "", secretKey: secrets.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "" };
};

const responseChannel = (row: Record<string, unknown>) => ({
  id: row.id, name: row.name, icon: row.icon, providerType: row.provider_type, channelType: row.channel_type,
  interactionMode: row.interaction_mode, feeRate: String(row.fee_rate), fixedFee: String(row.fixed_fee),
  minAmount: String(row.min_amount), maxAmount: String(row.max_amount), hideAmountOutRange: row.hide_amount_out_range,
  paymentRoles: row.payment_roles, paymentTypes: row.payment_types, memberLevels: row.member_levels, publicConfig: row.public_config,
  secretConfig: {}, secretConfigured: Object.values((row.secret_config as Record<string, unknown>) ?? {}).some((value) => Boolean(value)),
  isActive: row.is_active, sortOrder: String(row.sort_order),
});

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin") ?? "";
  if (!allowedOrigins.has(origin)) return new Response("Forbidden", { status: 403 });
  if (request.method === "OPTIONS") return json(origin, 200, { ok: true });
  if (request.method !== "POST") return json(origin, 405, { error: "Method not allowed" });

  try {
    const { url, publishableKey, secretKey } = readKeys();
    if (!url || !publishableKey || !secretKey) return json(origin, 500, { error: "支付管理服务配置不完整" });
    const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const auth = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await auth.auth.getUser(token);
    if (authError || !authData.user) return json(origin, 401, { error: "登录状态已失效" });
    const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile } = await admin.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    if (profile?.role !== "admin") return json(origin, 403, { error: "仅管理员可以管理支付渠道" });

    const body = await request.json().catch(() => ({}));
    const action = String(body.action ?? "list");
    if (action === "list") {
      const { data, error } = await admin.from("payment_channels").select("*").order("sort_order");
      if (error) return json(origin, 500, { error: error.message });
      return json(origin, 200, { channels: (data ?? []).map(responseChannel) });
    }
    if (action !== "replace" || !Array.isArray(body.channels)) return json(origin, 400, { error: "不支持的管理操作" });

    const incomingIds = body.channels.map((item: Record<string, unknown>) => String(item.id ?? ""));
    if (incomingIds.some((id: string) => !/^[a-zA-Z0-9_-]{3,100}$/.test(id))) return json(origin, 400, { error: "渠道 ID 格式无效" });
    const { data: currentRows, error: currentError } = incomingIds.length ? await admin.from("payment_channels").select("id, secret_config").in("id", incomingIds) : { data: [], error: null };
    if (currentError) return json(origin, 500, { error: currentError.message });
    const currentSecrets = new Map((currentRows ?? []).map((row) => [row.id, row.secret_config ?? {}]));

    const rows = body.channels.map((item: Record<string, any>, index: number) => {
      if (!providers.has(String(item.providerType)) || !interactions.has(String(item.interactionMode))) throw new Error("渠道提供方或交互方式无效");
      const previous = currentSecrets.get(String(item.id)) ?? {};
      const submitted = item.secretConfig && typeof item.secretConfig === "object" ? item.secretConfig : {};
      const mergedSecret = { ...previous } as Record<string, unknown>;
      Object.entries(submitted).forEach(([key, value]) => { if (String(value ?? "").trim()) mergedSecret[key] = value; });
      return {
        id: String(item.id), name: String(item.name ?? "").trim(), icon: String(item.icon ?? ""), provider_type: String(item.providerType), channel_type: String(item.channelType), interaction_mode: String(item.interactionMode),
        fee_rate: Math.max(0, Number(item.feeRate) || 0), fixed_fee: Math.max(0, Number(item.fixedFee) || 0), min_amount: Math.max(0, Number(item.minAmount) || 0), max_amount: Math.max(0, Number(item.maxAmount) || 0), hide_amount_out_range: Boolean(item.hideAmountOutRange),
        payment_roles: Array.isArray(item.paymentRoles) ? item.paymentRoles : ["member"], payment_types: Array.isArray(item.paymentTypes) ? item.paymentTypes : ["order", "renewal"], member_levels: Array.isArray(item.memberLevels) ? item.memberLevels : [],
        public_config: item.publicConfig && typeof item.publicConfig === "object" ? item.publicConfig : {}, secret_config: mergedSecret,
        is_active: Boolean(item.isActive), sort_order: Number(item.sortOrder) || (index + 1) * 10,
      };
    });
    if (rows.some((row: Record<string, any>) => !row.name)) return json(origin, 400, { error: "渠道名称不能为空" });
    if (rows.length) {
      const { error } = await admin.from("payment_channels").upsert(rows, { onConflict: "id" });
      if (error) return json(origin, 500, { error: error.message });
    }
    const { data: allRows, error: allError } = await admin.from("payment_channels").select("id");
    if (allError) return json(origin, 500, { error: allError.message });
    const staleIds = (allRows ?? []).map((item) => item.id).filter((id) => !incomingIds.includes(id));
    if (staleIds.length) {
      const { error } = await admin.from("payment_channels").delete().in("id", staleIds);
      if (error) return json(origin, 409, { error: "已产生支付记录的渠道不能删除，请改为停用" });
    }
    const { data: saved, error: savedError } = await admin.from("payment_channels").select("*").order("sort_order");
    if (savedError) return json(origin, 500, { error: savedError.message });
    return json(origin, 200, { channels: (saved ?? []).map(responseChannel) });
  } catch (error) {
    return json(origin, 400, { error: error instanceof Error ? error.message : "支付渠道请求无效" });
  }
});
