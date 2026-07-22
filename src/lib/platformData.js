import { requireSupabase } from "./supabase.js";

const currency = (value) => `¥${Number(value || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const transactionLabel = (value) => value === "托管收益" ? "跑算收益" : value;

const throwIfError = (error) => {
  if (error) throw new Error(error.message || "数据请求失败");
};

const siteImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const siteImageExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};
const siteImageLimit = 6 * 1024 * 1024;
const commerceFallbackKey = "aether-commerce-settings:v1";

const isMissingCommerceTable = (error) => error?.code === "42P01" || error?.code === "PGRST205";

const readCommerceFallback = () => {
  if (typeof window === "undefined") return {};
  try {
    const value = JSON.parse(window.localStorage.getItem(commerceFallbackKey) || "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
};

const writeCommerceFallback = (section, value) => {
  if (typeof window === "undefined") return;
  const current = readCommerceFallback();
  window.localStorage.setItem(commerceFallbackKey, JSON.stringify({ ...current, [section]: value }));
};

export async function getPlatformOverview() {
  const client = requireSupabase();
  const [devicesResult, ordersResult, earningsResult, transactionsResult] = await Promise.all([
    client.from("compute_devices").select("device_code, name, compute, status, daily_yield, expires_at").order("created_at"),
    client.from("rental_orders").select("order_no, product, period_months, amount, status, created_at").order("created_at", { ascending: false }),
    client.from("earnings").select("amount, earned_on, status").order("earned_on"),
    client.from("transactions").select("transaction_type, reference, amount, status, occurred_at").order("occurred_at", { ascending: false }).limit(20),
  ]);

  [devicesResult, ordersResult, earningsResult, transactionsResult].forEach(({ error }) => throwIfError(error));
  const devices = devicesResult.data ?? [];
  const orders = ordersResult.data ?? [];
  const earnings = earningsResult.data ?? [];
  const transactions = transactionsResult.data ?? [];
  const totalAssets = orders.reduce((sum, row) => sum + Number(row.amount), 0);
  const monthEarnings = earnings.reduce((sum, row) => sum + Number(row.amount), 0);
  const onlineRate = devices.length ? (devices.filter((row) => row.status === "运行中").length / devices.length) * 100 : 0;

  return {
    metrics: [
      { value: currency(totalAssets), change: "+12.6%" },
      { value: currency(monthEarnings), change: "+8.2%" },
      { value: `${onlineRate.toFixed(2)}%`, change: "+0.14%" },
      { value: currency(monthEarnings * 0.26), change: "-3.4%" },
    ],
    earnings: earnings.map((row) => Number(row.amount)),
    devices: devices.map((row) => ({
      id: row.device_code,
      name: row.name,
      compute: row.compute,
      status: row.status,
      today: currency(row.daily_yield),
      expires: row.expires_at,
    })),
    orders: orders.map((row) => ({
      id: row.order_no,
      product: row.product,
      period: `${row.period_months} 个月`,
      amount: currency(row.amount),
      status: row.status,
      created: new Date(row.created_at).toLocaleString("zh-CN", { hour12: false }),
    })),
    activity: transactions.slice(0, 4).map((row) => ({
      title: `${row.reference} ${transactionLabel(row.transaction_type)}`,
      time: new Date(row.occurred_at).toLocaleString("zh-CN", { hour12: false }),
      value: `${Number(row.amount) >= 0 ? "+" : "-"}${currency(Math.abs(Number(row.amount)))}`,
    })),
    transactions: transactions.map((row) => ({
      time: new Date(row.occurred_at).toLocaleString("zh-CN", { hour12: false }),
      type: transactionLabel(row.transaction_type),
      reference: row.reference,
      amount: `${Number(row.amount) >= 0 ? "+" : "-"}${currency(Math.abs(Number(row.amount)))}`,
      status: row.status,
    })),
  };
}

export async function getSiteSettings() {
  const { data, error } = await requireSupabase().from("site_settings").select("section_key, value");
  throwIfError(error);
  return { settings: Object.fromEntries((data ?? []).map((row) => [row.section_key, row.value])) };
}

export async function saveSiteSetting(section, value) {
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  throwIfError(userError);
  if (!user) throw new Error("请先登录");
  const { error } = await client.from("site_settings").upsert({ user_id: user.id, section_key: section, value }, { onConflict: "section_key" });
  throwIfError(error);
  return { ok: true, section, value };
}

export async function getCommerceSettings() {
  const { data, error } = await requireSupabase().from("commerce_settings").select("section_key, value");
  if (isMissingCommerceTable(error)) return { settings: readCommerceFallback(), storage: "browser" };
  throwIfError(error);
  return { settings: Object.fromEntries((data ?? []).map((row) => [row.section_key, row.value])), storage: "database" };
}

export async function saveCommerceSetting(section, value) {
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  throwIfError(userError);
  if (!user) throw new Error("请先登录");
  const { error } = await client.from("commerce_settings").upsert({ user_id: user.id, section_key: section, value }, { onConflict: "section_key" });
  if (isMissingCommerceTable(error)) {
    writeCommerceFallback(section, value);
    return { ok: true, section, value, storage: "browser" };
  }
  throwIfError(error);
  return { ok: true, section, value, storage: "database" };
}

export async function uploadSiteImage(file, scope = "content") {
  if (!file || !siteImageTypes.has(file.type)) throw new Error("请选择 JPG、PNG、WebP、GIF 或 AVIF 图片");
  if (file.size > siteImageLimit) throw new Error("图片不能超过 6 MB");

  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  throwIfError(userError);
  if (!user) throw new Error("请先登录");

  const safeScope = String(scope).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") || "content";
  const formData = new FormData();
  formData.append("file", file, `upload.${siteImageExtensions[file.type]}`);
  formData.append("scope", safeScope);

  const { data, error } = await client.functions.invoke("site-media-upload", { body: formData });
  if (error) {
    let message = error.message || "图片上传失败";
    try {
      const payload = await error.context?.json?.();
      message = payload?.error || message;
    } catch {
      // Keep the transport error when the response has no JSON body.
    }
    throw new Error(message);
  }
  if (!data?.url) throw new Error("图片公开地址生成失败");
  return data;
}

export async function getBlogPosts() {
  const { data, error } = await requireSupabase()
    .from("blog_posts")
    .select("slug, title, excerpt, category, author_name, author_avatar, image_url, image_position, published_at, read_time_minutes, featured, editors_pick, display_order")
    .eq("published", true)
    .order("display_order")
    .order("published_at", { ascending: false });
  throwIfError(error);
  return data ?? [];
}

export async function subscribeNewsletter(email) {
  const { error } = await requireSupabase().from("newsletter_subscriptions").insert({ email: email.trim().toLowerCase(), source: "blog" });
  if (error?.code === "23505") return { alreadySubscribed: true };
  throwIfError(error);
  return { alreadySubscribed: false };
}
