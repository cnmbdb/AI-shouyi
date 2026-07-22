import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.8";
import MD5 from "npm:crypto-js@4.2.0/md5.js";

const readKeys = () => { const sec = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}"); return { url: Deno.env.get("SUPABASE_URL") ?? "", secretKey: sec.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "" }; };
const safeEqual = (left: string, right: string) => { if (left.length !== right.length) return false; let diff = 0; for (let index = 0; index < left.length; index += 1) diff |= left.charCodeAt(index) ^ right.charCodeAt(index); return diff === 0; };
const plain = (status: number, body: string) => new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

Deno.serve(async (request: Request) => {
  if (!["POST", "GET"].includes(request.method)) return plain(405, "fail");
  try {
    const { url, secretKey } = readKeys();
    if (!url || !secretKey) return plain(500, "fail");
    const requestUrl = new URL(request.url);
    const channelId = requestUrl.searchParams.get("channel_id") ?? "";
    if (!channelId) return plain(400, "fail");
    const contentType = request.headers.get("content-type") ?? "";
    const payload: Record<string, string> = request.method === "GET"
      ? Object.fromEntries(requestUrl.searchParams.entries())
      : contentType.includes("application/json")
        ? await request.json()
        : Object.fromEntries(Array.from((await request.formData()).entries(), ([key, value]) => [key, String(value)]));
    delete payload.channel_id;
    const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: channel } = await admin.from("payment_channels").select("*").eq("id", channelId).eq("is_active", true).maybeSingle();
    if (!channel || channel.provider_type !== "epay") return plain(404, "fail");
    const receivedSign = String(payload.sign ?? "").toLowerCase();
    const merchantKey = String(channel.secret_config?.merchant_key ?? "");
    const signSource = Object.keys(payload).filter((key) => !["sign", "sign_type"].includes(key) && payload[key] !== "").sort().map((key) => `${key}=${payload[key]}`).join("&");
    const expectedSign = MD5(`${signSource}${merchantKey}`).toString().toLowerCase();
    if (!merchantKey || !receivedSign || !safeEqual(receivedSign, expectedSign)) return plain(401, "fail");
    if (!["TRADE_SUCCESS", "TRADE_FINISHED"].includes(String(payload.trade_status ?? ""))) return plain(200, "success");
    const paymentNo = String(payload.out_trade_no ?? "");
    const { data: payment } = await admin.from("store_payments").select("payment_no, amount, status").eq("payment_no", paymentNo).eq("channel_id", channelId).maybeSingle();
    if (!payment || Math.abs(Number(payment.amount) - Number(payload.money)) > 0.001) return plain(400, "fail");
    if (payment.status === "paid") return plain(200, "success");
    const { error } = await admin.rpc("complete_store_payment", { p_payment_no: paymentNo, p_provider_trade_no: String(payload.trade_no ?? ""), p_callback_payload: payload });
    if (error) return plain(500, "fail");
    return plain(200, "success");
  } catch {
    return plain(400, "fail");
  }
});
