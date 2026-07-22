import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.8";

const allowedOrigins = new Set([
  "https://ai.suxin.ai",
  "https://cnmbdb.github.io",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["image/avif", "avif"],
]);
const maxFileSize = 6 * 1024 * 1024;

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
    if (!url || !publishableKey || !secretKey) return json(origin, 500, { error: "媒体服务配置不完整" });

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
    if (callerError || callerProfile?.role !== "admin") return json(origin, 403, { error: "仅管理员可以上传站点图片" });

    const formData = await request.formData();
    const file = formData.get("file");
    const rawScope = String(formData.get("scope") ?? "content");
    const scope = rawScope.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") || "content";
    if (!(file instanceof File)) return json(origin, 400, { error: "请选择要上传的图片" });

    const extension = allowedTypes.get(file.type);
    if (!extension) return json(origin, 400, { error: "请选择 JPG、PNG、WebP、GIF 或 AVIF 图片" });
    if (file.size > maxFileSize) return json(origin, 413, { error: "图片不能超过 6 MB" });

    const path = `site-content/${scope}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { data, error } = await admin.storage.from("site-media").upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });
    if (error) return json(origin, 500, { error: error.message || "图片上传失败" });

    const { data: publicData } = admin.storage.from("site-media").getPublicUrl(data.path);
    if (!publicData.publicUrl) return json(origin, 500, { error: "图片公开地址生成失败" });
    return json(origin, 200, { path: data.path, url: publicData.publicUrl });
  } catch {
    return json(origin, 400, { error: "图片上传请求无效" });
  }
});
