import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.8";
import MD5 from "npm:crypto-js@4.2.0/md5.js";

const allowedOrigins = new Set(["https://ai.suxin.ai", "https://cnmbdb.github.io", "http://localhost:4173", "http://127.0.0.1:4173"]);
const json = (origin: string, status: number, payload: unknown) => new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" } });
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const orderNumber = (prefix: string) => `${prefix}${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
const readKeys = () => { const pub = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}"); const sec = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}"); return { url: Deno.env.get("SUPABASE_URL") ?? "", publishableKey: pub.default ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "", secretKey: sec.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "" }; };

const epayCheckout = (channel: Record<string, any>, paymentNo: string, amount: number, productName: string, fallbackNotifyUrl: string) => {
  const publicConfig = channel.public_config ?? {};
  const secret = channel.secret_config ?? {};
  const gateway = String(publicConfig.gateway_url ?? "").replace(/\/$/, "");
  const pid = String(secret.merchant_id ?? "").trim();
  const merchantKey = String(secret.merchant_key ?? "").trim();
  if (!gateway || !pid || !merchantKey) throw new Error("易支付渠道缺少网关、商户 ID 或商户密钥");
  const params: Record<string, string> = {
    pid,
    type: String(channel.channel_type),
    out_trade_no: paymentNo,
    notify_url: String(publicConfig.notify_url || fallbackNotifyUrl),
    return_url: String(publicConfig.return_url || fallbackNotifyUrl),
    name: productName.slice(0, 120),
    money: amount.toFixed(2),
    device: "pc",
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
    if (!url || !publishableKey || !secretKey) return json(origin, 500, { error: "支付服务配置不完整" });
    const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const auth = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await auth.auth.getUser(token);
    if (authError || !authData.user) return json(origin, 401, { error: "请先登录后创建订单" });
    const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const body = await request.json().catch(() => ({}));
    const orderType = String(body.orderType ?? "rental");
    if (!["rental", "buyout", "renewal"].includes(orderType)) return json(origin, 400, { error: "订单计费方式无效" });
    const quantity = Math.max(1, Math.min(100, Number(body.quantity) || 1));
    const cycles = Math.max(1, Math.min(120, Number(body.cycles) || 1));

    let productQuery = admin.from("store_products").select("*").eq("enabled", true);
    productQuery = body.productId ? productQuery.eq("id", String(body.productId)) : productQuery.eq("slug", String(body.productSlug ?? ""));
    const { data: product, error: productError } = await productQuery.maybeSingle();
    if (productError || !product) return json(origin, 404, { error: "商品不存在或已下架" });
    if (Number(product.inventory) < quantity) return json(origin, 409, { error: "商品库存不足" });
    if (orderType === "rental" && product.billing_type === "buyout") return json(origin, 400, { error: "该商品不支持租用" });
    if (orderType === "buyout" && product.billing_type === "rental") return json(origin, 400, { error: "该商品不支持买断" });
    if (orderType === "renewal" && !product.renewable) return json(origin, 400, { error: "该商品不支持续费" });

    let parentOrderId: string | null = null;
    if (orderType === "renewal") {
      const { data: parent } = await admin.from("store_orders").select("id, product_id, order_type, status, user_id").eq("id", String(body.parentOrderId ?? "")).maybeSingle();
      if (!parent || parent.user_id !== authData.user.id || parent.product_id !== product.id || !["rental", "renewal"].includes(parent.order_type) || !["paid", "processing", "completed"].includes(parent.status)) return json(origin, 400, { error: "原租用订单不能续费" });
      parentOrderId = parent.id;
    }

    const paymentType = orderType === "renewal" ? "renewal" : "order";
    let channelQuery = admin.from("payment_channels").select("*").eq("is_active", true).order("sort_order");
    if (body.channelId) channelQuery = channelQuery.eq("id", String(body.channelId));
    const { data: channelRows, error: channelError } = await channelQuery;
    if (channelError) return json(origin, 500, { error: "支付渠道读取失败" });
    const unitPrice = Number(orderType === "buyout" ? product.buyout_price : orderType === "renewal" ? product.renewal_price : product.rental_price);
    const subtotal = roundMoney(unitPrice * quantity * (orderType === "buyout" ? 1 : cycles));
    const channel = (channelRows ?? []).find((item) => {
      const types = Array.isArray(item.payment_types) ? item.payment_types : [];
      const roles = Array.isArray(item.payment_roles) ? item.payment_roles : [];
      if (!types.includes(paymentType) || (!roles.includes("member") && roles.length)) return false;
      if (Number(item.min_amount) > 0 && subtotal < Number(item.min_amount)) return false;
      if (Number(item.max_amount) > 0 && subtotal > Number(item.max_amount)) return false;
      return true;
    });
    if (!channel) return json(origin, 400, { error: "当前没有适用于该订单金额和场景的支付渠道" });
    if (!["manual", "epay"].includes(channel.provider_type)) return json(origin, 422, { error: `${channel.provider_type} 渠道已配置，但当前部署尚未启用对应支付适配器` });

    const feeAmount = roundMoney(subtotal * (Number(channel.fee_rate) / 100) + Number(channel.fixed_fee));
    const totalAmount = roundMoney(subtotal + feeAmount);
    const orderNo = orderNumber("SO");
    const paymentNo = orderNumber("SP");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const functionBase = `${url}/functions/v1/payment-webhook?channel_id=${encodeURIComponent(channel.id)}`;
    const checkoutUrl = channel.provider_type === "epay" ? epayCheckout(channel, paymentNo, totalAmount, product.name, functionBase) : null;
    const checkoutPayload = channel.provider_type === "manual" ? { kind: "manual", instructions: channel.public_config?.instructions ?? "请联系商务完成付款。" } : { kind: channel.interaction_mode, checkout_url: checkoutUrl };
    const snapshot = { id: product.id, slug: product.slug, sku: product.sku, name: product.name, image: product.image_url, gpuModel: product.gpu_model, vram: product.vram, billingType: product.billing_type };
    const periodCount = orderType === "buyout" ? null : Number(product.rental_period_count) * cycles;
    const { data: order, error: orderError } = await admin.from("store_orders").insert({ order_no: orderNo, user_id: authData.user.id, product_id: product.id, parent_order_id: parentOrderId, order_type: orderType, product_snapshot: snapshot, quantity, period_unit: orderType === "buyout" ? null : product.rental_period_unit, period_count: periodCount, unit_price: unitPrice, subtotal, fee_amount: feeAmount, total_amount: totalAmount, currency: "CNY", expires_at: expiresAt }).select("id, order_no, status").single();
    if (orderError) return json(origin, 500, { error: "订单创建失败" });
    const { data: payment, error: paymentError } = await admin.from("store_payments").insert({ payment_no: paymentNo, order_id: order.id, channel_id: channel.id, amount: totalAmount, currency: "CNY", interaction_mode: channel.interaction_mode, checkout_payload: checkoutPayload, expires_at: expiresAt }).select("id, payment_no, status").single();
    if (paymentError) { await admin.from("store_orders").delete().eq("id", order.id); return json(origin, 500, { error: "支付单创建失败" }); }
    return json(origin, 200, { order, payment, channel: { id: channel.id, name: channel.name, providerType: channel.provider_type, interactionMode: channel.interaction_mode }, amount: { subtotal, fee: feeAmount, total: totalAmount, currency: "CNY" }, checkout: checkoutPayload, expiresAt });
  } catch (error) {
    return json(origin, 400, { error: error instanceof Error ? error.message : "支付请求无效" });
  }
});
