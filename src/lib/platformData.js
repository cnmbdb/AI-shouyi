import { requireSupabase } from "./supabase.js";
import { defaultCommerceSettings, normalizeCommerceProducts, normalizePaymentSettings } from "../data/commerceSettings.js";

const currency = (value) => `¥${Number(value || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const transactionLabel = (value) => value === "托管收益" ? "跑算收益" : value;

const throwIfError = (error) => {
  if (error) {
    const wrapped = new Error(error.message || "数据请求失败");
    wrapped.code = error.code;
    wrapped.context = error.context;
    throw wrapped;
  }
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
const isMissingFunction = (error) => error?.context?.status === 404 || /not found|failed to send a request to the edge function/i.test(error?.message ?? "");

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
  const [devicesResult, ordersResult, storeOrdersResult, earningsResult, transactionsResult] = await Promise.all([
    client.from("compute_devices").select("device_code, name, compute, status, daily_yield, expires_at").order("created_at"),
    client.from("rental_orders").select("order_no, product, period_months, amount, status, created_at").order("created_at", { ascending: false }),
    client.from("store_orders").select("order_no, order_type, product_snapshot, period_count, period_unit, total_amount, status, created_at").order("created_at", { ascending: false }),
    client.from("earnings").select("amount, earned_on, status").order("earned_on"),
    client.from("transactions").select("transaction_type, reference, amount, status, occurred_at").order("occurred_at", { ascending: false }).limit(20),
  ]);

  [devicesResult, ordersResult, earningsResult, transactionsResult].forEach(({ error }) => throwIfError(error));
  if (storeOrdersResult.error && !isMissingCommerceTable(storeOrdersResult.error)) throwIfError(storeOrdersResult.error);
  const devices = devicesResult.data ?? [];
  const legacyOrders = ordersResult.data ?? [];
  const storeOrders = storeOrdersResult.error ? [] : storeOrdersResult.data ?? [];
  const orders = [...storeOrders.map((row) => ({
    order_no: row.order_no,
    product: row.product_snapshot?.name ?? "商城商品",
    period_months: row.order_type === "buyout" ? 0 : row.period_count,
    periodLabel: row.order_type === "buyout" ? "买断" : `${row.period_count} ${row.period_unit === "day" ? "天" : row.period_unit === "year" ? "年" : "个月"}`,
    amount: row.total_amount,
    status: ({ pending_payment: "待支付", paid: "已支付", processing: "处理中", completed: "已完成", expired: "已过期", cancelled: "已取消", refunded: "已退款" })[row.status] ?? row.status,
    created_at: row.created_at,
  })), ...legacyOrders].toSorted((a, b) => new Date(b.created_at) - new Date(a.created_at));
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
      period: row.periodLabel ?? `${row.period_months} 个月`,
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

const categoryFromRow = (row) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description,
  enabled: row.enabled,
  sortOrder: String(row.sort_order),
});

const productFromRow = (row) => ({
  id: row.id,
  categoryId: row.category_id ?? "",
  slug: row.slug,
  shareToken: row.share_token,
  sku: row.sku,
  name: row.name,
  summary: row.summary,
  image: row.image_url,
  imagePosition: row.image_position,
  gpuModel: row.gpu_model,
  vram: row.vram,
  hostingTerm: row.hosting_term,
  billingType: row.billing_type,
  rentalPrice: String(row.rental_price),
  rentalPeriodUnit: row.rental_period_unit,
  rentalPeriodCount: String(row.rental_period_count),
  renewable: row.renewable,
  renewalPrice: String(row.renewal_price),
  buyoutPrice: String(row.buyout_price),
  inventory: String(row.inventory),
  details: row.details,
  specs: row.specs ?? [],
  enabled: row.enabled,
  sortOrder: String(row.sort_order),
});

const categoryToRow = (item) => ({
  id: item.id,
  name: item.name.trim(),
  slug: item.slug.trim().toLowerCase(),
  description: item.description ?? "",
  enabled: item.enabled !== false,
  sort_order: Number(item.sortOrder) || 0,
});

const productToRow = (item) => ({
  id: item.id,
  category_id: item.categoryId || null,
  slug: item.slug.trim().toLowerCase(),
  share_token: item.shareToken.trim(),
  sku: item.sku.trim(),
  name: item.name.trim(),
  summary: item.summary ?? "",
  image_url: item.image ?? "",
  image_position: item.imagePosition || "center center",
  gpu_model: item.gpuModel ?? "",
  vram: item.vram ?? "",
  hosting_term: item.hostingTerm ?? "",
  billing_type: item.billingType,
  rental_price: Number(item.rentalPrice) || 0,
  rental_period_unit: item.rentalPeriodUnit,
  rental_period_count: Math.max(1, Number(item.rentalPeriodCount) || 1),
  renewable: item.billingType !== "buyout" && item.renewable !== false,
  renewal_price: Number(item.renewalPrice) || 0,
  buyout_price: Number(item.buyoutPrice) || 0,
  inventory: Math.max(0, Number(item.inventory) || 0),
  details: item.details ?? "",
  specs: item.specs ?? [],
  enabled: item.enabled !== false,
  sort_order: Number(item.sortOrder) || 0,
});

const publicChannelFallback = (channel) => ({
  ...channel,
  secretConfig: {},
  secretConfigured: channel.secretConfigured || Object.values(channel.secretConfig ?? {}).some(Boolean),
});

async function readPaymentChannels(client) {
  const { data, error } = await client.functions.invoke("payment-channels-admin", { body: { action: "list" } });
  if (!error) return normalizePaymentSettings({ channels: data?.channels ?? [] });
  if (!isMissingFunction(error)) throw new Error(error.message || "支付渠道读取失败");
  const fallback = readCommerceFallback().payment ?? defaultCommerceSettings.payment;
  return normalizePaymentSettings(fallback);
}

export async function getCommerceSettings() {
  const client = requireSupabase();
  const [categoriesResult, productsResult] = await Promise.all([
    client.from("store_categories").select("id, name, slug, description, enabled, sort_order").order("sort_order"),
    client.from("store_products").select("id, category_id, slug, share_token, sku, name, summary, image_url, image_position, gpu_model, vram, hosting_term, billing_type, rental_price, rental_period_unit, rental_period_count, renewable, renewal_price, buyout_price, inventory, details, specs, enabled, sort_order").order("sort_order"),
  ]);

  if (isMissingCommerceTable(categoriesResult.error) || isMissingCommerceTable(productsResult.error)) {
    const legacy = await client.from("commerce_settings").select("section_key, value");
    const fallback = isMissingCommerceTable(legacy.error)
      ? readCommerceFallback()
      : Object.fromEntries((legacy.data ?? []).map((row) => [row.section_key, row.value]));
    return {
      settings: {
        products: normalizeCommerceProducts(fallback.products ?? defaultCommerceSettings.products),
        payment: await readPaymentChannels(client),
      },
      storage: "browser",
    };
  }

  throwIfError(categoriesResult.error);
  throwIfError(productsResult.error);
  const databaseProducts = {
    categories: (categoriesResult.data ?? []).map(categoryFromRow),
    items: (productsResult.data ?? []).map(productFromRow),
  };
  return {
    settings: {
      products: normalizeCommerceProducts(databaseProducts.categories.length || databaseProducts.items.length ? databaseProducts : defaultCommerceSettings.products),
      payment: await readPaymentChannels(client),
    },
    storage: "database",
  };
}

async function saveProductCatalog(client, value) {
  const normalized = normalizeCommerceProducts(value);
  const categories = normalized.categories.map(categoryToRow);
  const products = normalized.items.map(productToRow);
  if (categories.length) throwIfError((await client.from("store_categories").upsert(categories, { onConflict: "id" })).error);
  if (products.length) throwIfError((await client.from("store_products").upsert(products, { onConflict: "id" })).error);

  const currentProducts = await client.from("store_products").select("id");
  throwIfError(currentProducts.error);
  const productIds = new Set(products.map((item) => item.id));
  const removedProducts = (currentProducts.data ?? []).map((item) => item.id).filter((id) => !productIds.has(id));
  if (removedProducts.length) throwIfError((await client.from("store_products").delete().in("id", removedProducts)).error);

  const currentCategories = await client.from("store_categories").select("id");
  throwIfError(currentCategories.error);
  const categoryIds = new Set(categories.map((item) => item.id));
  const removedCategories = (currentCategories.data ?? []).map((item) => item.id).filter((id) => !categoryIds.has(id));
  if (removedCategories.length) throwIfError((await client.from("store_categories").delete().in("id", removedCategories)).error);
  return normalized;
}

async function savePaymentChannels(client, value) {
  const normalized = normalizePaymentSettings(value);
  const { data, error } = await client.functions.invoke("payment-channels-admin", { body: { action: "replace", channels: normalized.channels } });
  if (!error) return normalizePaymentSettings({ channels: data?.channels ?? normalized.channels });
  if (!isMissingFunction(error)) throw new Error(error.message || "支付渠道保存失败");
  const safeValue = { channels: normalized.channels.map(publicChannelFallback) };
  writeCommerceFallback("payment", safeValue);
  return safeValue;
}

export async function saveCommerceSetting(section, value) {
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  throwIfError(userError);
  if (!user) throw new Error("请先登录");

  try {
    const saved = section === "products" ? await saveProductCatalog(client, value) : await savePaymentChannels(client, value);
    return { ok: true, section, value: saved, storage: "database" };
  } catch (error) {
    if (!isMissingCommerceTable(error)) throw error;
    const safeValue = section === "payment" ? { channels: normalizePaymentSettings(value).channels.map(publicChannelFallback) } : normalizeCommerceProducts(value);
    writeCommerceFallback(section, safeValue);
    return { ok: true, section, value: safeValue, storage: "browser" };
  }
}

export async function getPublicStoreProduct(categoryId, productId, legacySlug = "") {
  const client = requireSupabase();
  let query = client
    .from("store_products")
    .select("id, category_id, slug, share_token, sku, name, summary, image_url, image_position, gpu_model, vram, hosting_term, billing_type, rental_price, rental_period_unit, rental_period_count, renewable, renewal_price, buyout_price, inventory, details, specs, enabled, sort_order, store_categories(name, slug)")
    .eq("enabled", true);
  if (productId) {
    query = query.eq("id", productId);
    query = categoryId === "uncategorized" ? query.is("category_id", null) : query.eq("category_id", categoryId);
  } else {
    query = query.eq("slug", legacySlug || categoryId);
  }
  const result = await query.maybeSingle();

  if (isMissingCommerceTable(result.error)) {
    const products = normalizeCommerceProducts(readCommerceFallback().products ?? defaultCommerceSettings.products);
    const product = productId
      ? products.items.find((item) => item.id === productId && item.categoryId === categoryId && item.enabled !== false)
      : products.items.find((item) => item.slug === (legacySlug || categoryId) && item.enabled !== false);
    if (!product) return null;
    return { ...product, category: products.categories.find((item) => item.id === product.categoryId) ?? null };
  }
  throwIfError(result.error);
  if (!result.data) return null;
  return { ...productFromRow(result.data), category: result.data.store_categories ?? null };
}

export async function createStorePayment(payload) {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke("payment-order", { body: payload });
  if (error) throw new Error(error.message || "订单创建失败");
  return data;
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
