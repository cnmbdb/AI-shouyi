import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.8";
import MD5 from "npm:crypto-js@4.2.0/md5.js";

const allowedOrigins = new Set(["https://ai.suxin.ai", "https://cnmbdb.github.io", "http://localhost:4173", "http://127.0.0.1:4173"]);
const json = (origin: string, status: number, payload: unknown) => new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" } });
const readKeys = () => { const pub = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}"); const sec = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}"); return { url: Deno.env.get("SUPABASE_URL") ?? "", publishableKey: pub.default ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "", secretKey: sec.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "" }; };
const orderNumber = (prefix: string) => `${prefix}${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
const epayTypes: Record<string, string> = { wechat: "wxpay", alipay: "alipay", qqpay: "qqpay" };
const absoluteUrl = (value: unknown, fallback: string) => { try { const parsed = new URL(String(value ?? "")); return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : fallback; } catch { return fallback; } };

const epayCheckout = (channel: Record<string, any>, paymentNo: string, amount: number, notifyUrl: string) => {
  const publicConfig = channel.public_config ?? {};
  const secret = channel.secret_config ?? {};
  const gateway = String(publicConfig.gateway_url ?? "").replace(/\/$/, "");
  const pid = String(publicConfig.merchant_id ?? secret.merchant_id ?? "").trim();
  const merchantKey = String(secret.merchant_key ?? "").trim();
  if (!gateway || !pid || !merchantKey) throw new Error("易支付渠道缺少网关、商户 ID 或商户密钥");
  const params: Record<string, string> = {
    pid, type: epayTypes[String(channel.channel_type)] ?? String(channel.channel_type), out_trade_no: paymentNo,
    notify_url: absoluteUrl(publicConfig.notify_url, notifyUrl), return_url: absoluteUrl(publicConfig.return_url, "https://ai.suxin.ai/console/transactions"),
    name: "速芯算力账户充值", money: amount.toFixed(2), device: "pc",
  };
  const signSource = Object.keys(params).sort().map((key) => `${key}=${params[key]}`).join("&");
  params.sign = MD5(`${signSource}${merchantKey}`).toString();
  params.sign_type = "MD5";
  const endpoint = /\.php(?:\?|$)/.test(gateway) ? gateway : `${gateway}/submit.php`;
  return `${endpoint}${endpoint.includes("?") ? "&" : "?"}${new URLSearchParams(params).toString()}`;
};

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin") ?? "";
  if (!allowedOrigins.has(origin)) return new Response("Forbidden", { status: 403 });
  if (request.method === "OPTIONS") return json(origin, 200, { ok: true });
  if (request.method !== "POST") return json(origin, 405, { error: "Method not allowed" });
  try {
    const { url, publishableKey, secretKey } = readKeys();
    if (!url || !publishableKey || !secretKey) return json(origin, 500, { error: "充值服务配置不完整" });
    const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const auth = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await auth.auth.getUser(token);
    if (authError || !authData.user) return json(origin, 401, { error: "请先登录后充值" });
    const body = await request.json().catch(() => ({}));
    const amount = Math.round(Number(body.amount) * 100) / 100;
    if (!Number.isFinite(amount) || amount < 10 || amount > 1000000) return json(origin, 400, { error: "充值金额须在 10 至 1,000,000 元之间" });

    const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
    let channelQuery = admin.from("payment_channels").select("*").eq("is_active", true).order("sort_order");
    if (body.channelId) channelQuery = channelQuery.eq("id", String(body.channelId));
    const { data: channels, error: channelError } = await channelQuery;
    if (channelError) return json(origin, 500, { error: "支付渠道读取失败" });
    const channel = (channels ?? []).find((item) => {
      const types = Array.isArray(item.payment_types) ? item.payment_types : [];
      const roles = Array.isArray(item.payment_roles) ? item.payment_roles : [];
      return types.includes("wallet") && (!roles.length || roles.includes("member")) && !(Number(item.min_amount) > amount) && !(Number(item.max_amount) > 0 && Number(item.max_amount) < amount);
    });
    if (!channel) return json(origin, 400, { error: "当前没有适用于该金额的钱包充值渠道" });
    if (!["manual", "epay"].includes(channel.provider_type)) return json(origin, 422, { error: `${channel.provider_type} 充值渠道尚未启用` });

    const feeAmount = Math.round((amount * Number(channel.fee_rate) / 100 + Number(channel.fixed_fee)) * 100) / 100;
    const totalAmount = Math.round((amount + feeAmount) * 100) / 100;
    const rechargeNo = orderNumber("WR");
    const paymentNo = orderNumber("WP");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const notifyUrl = `${url}/functions/v1/payment-webhook?channel_id=${encodeURIComponent(channel.id)}`;
    const checkout = channel.provider_type === "epay"
      ? { kind: channel.interaction_mode, checkout_url: epayCheckout(channel, paymentNo, totalAmount, notifyUrl) }
      : { kind: "manual", instructions: channel.public_config?.instructions ?? "请联系商务完成充值。" };
    const { data: recharge, error: rechargeError } = await admin.from("wallet_recharges").insert({ recharge_no: rechargeNo, user_id: authData.user.id, amount, fee_amount: feeAmount, total_amount: totalAmount, expires_at: expiresAt }).select("id, recharge_no, status").single();
    if (rechargeError) return json(origin, 500, { error: "充值单创建失败" });
    const { data: payment, error: paymentError } = await admin.from("wallet_payments").insert({ payment_no: paymentNo, recharge_id: recharge.id, channel_id: channel.id, amount: totalAmount, interaction_mode: channel.interaction_mode, checkout_payload: checkout, expires_at: expiresAt }).select("id, payment_no, status").single();
    if (paymentError) { await admin.from("wallet_recharges").delete().eq("id", recharge.id); return json(origin, 500, { error: "充值支付单创建失败" }); }
    return json(origin, 200, { recharge, payment, amount: { recharge: amount, fee: feeAmount, total: totalAmount }, checkout, expiresAt });
  } catch (error) {
    return json(origin, 400, { error: error instanceof Error ? error.message : "充值请求无效" });
  }
});
