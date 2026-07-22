const clone = (value) => structuredClone(value);
const withId = (prefix, item, index) => ({ id: item.id || `${prefix}-${index + 1}`, ...item });

export const defaultCommerceProducts = {
  categories: [
    { id: "category-consumer", name: "桌面级 GPU", slug: "desktop-gpu", description: "适合个人开发、渲染与轻量模型推理", enabled: true, sortOrder: "10" },
    { id: "category-enterprise", name: "企业级 GPU", slug: "enterprise-gpu", description: "适合训练、推理集群与长期跑算", enabled: true, sortOrder: "20" },
  ],
  items: [
    {
      id: "commerce-rtx-5090",
      categoryId: "category-consumer",
      slug: "rtx-5090-compute-plan",
      shareToken: "rtx5090",
      sku: "GPU-RTX5090-24M",
      name: "RTX 5090 跑算计划",
      summary: "旗舰桌面级 GPU，适合高性能推理、创作和持续跑算。",
      image: "/images/estate-luna-ridge.png",
      imagePosition: "center center",
      gpuModel: "NVIDIA GeForce RTX 5090",
      vram: "32 GB",
      hostingTerm: "24 个月",
      billingType: "both",
      rentalPrice: "6880",
      rentalPeriodUnit: "month",
      rentalPeriodCount: "1",
      renewable: true,
      renewalPrice: "6880",
      buyoutPrice: "128800",
      inventory: "18",
      details: "设备上架后由平台机房统一托管、运维和调度。租用到期前可按当前续费价续期；买断后设备所有权归购买人，托管服务按订单约定执行。",
      specs: [
        { id: "spec-5090-gpu", name: "GPU", value: "NVIDIA GeForce RTX 5090" },
        { id: "spec-5090-vram", name: "显存", value: "32 GB GDDR7" },
        { id: "spec-5090-power", name: "功耗", value: "575 W" },
      ],
      enabled: true,
      sortOrder: "10",
    },
    {
      id: "commerce-h100",
      categoryId: "category-enterprise",
      slug: "h100-sxm-enterprise",
      shareToken: "h100sxm",
      sku: "GPU-H100-24M",
      name: "H100 SXM 企业跑算计划",
      summary: "面向大模型训练和高吞吐推理的企业级算力设备。",
      image: "/images/estate-coast.png",
      imagePosition: "center center",
      gpuModel: "NVIDIA H100 SXM",
      vram: "80 GB",
      hostingTerm: "24 个月",
      billingType: "rental",
      rentalPrice: "26800",
      rentalPeriodUnit: "month",
      rentalPeriodCount: "1",
      renewable: true,
      renewalPrice: "26800",
      buyoutPrice: "268000",
      inventory: "6",
      details: "企业级独享设备，提供上架验收、运行监控、故障处理和收益结算。续费订单会关联原租用订单并延长服务到期时间。",
      specs: [
        { id: "spec-h100-gpu", name: "GPU", value: "NVIDIA H100 SXM" },
        { id: "spec-h100-vram", name: "显存", value: "80 GB HBM3" },
        { id: "spec-h100-bw", name: "显存带宽", value: "3.35 TB/s" },
      ],
      enabled: true,
      sortOrder: "20",
    },
    {
      id: "commerce-l40s",
      categoryId: "category-enterprise",
      slug: "l40s-buyout",
      shareToken: "l40sbuyout",
      sku: "GPU-L40S-BUYOUT",
      name: "L40S 算力设备",
      summary: "适合图形、视频、生成式 AI 和推理业务的一次性买断设备。",
      image: "/images/estate-vista-mare.png",
      imagePosition: "center center",
      gpuModel: "NVIDIA L40S",
      vram: "48 GB",
      hostingTerm: "买断",
      billingType: "buyout",
      rentalPrice: "0",
      rentalPeriodUnit: "month",
      rentalPeriodCount: "1",
      renewable: false,
      renewalPrice: "0",
      buyoutPrice: "68600",
      inventory: "24",
      details: "一次性买断设备。支付完成后生成设备交付单，后续托管、运输或提货方式按订单确认。",
      specs: [
        { id: "spec-l40s-gpu", name: "GPU", value: "NVIDIA L40S" },
        { id: "spec-l40s-vram", name: "显存", value: "48 GB GDDR6" },
        { id: "spec-l40s-fp32", name: "FP32", value: "91.6 TFLOPS" },
      ],
      enabled: true,
      sortOrder: "30",
    },
  ],
};

export const defaultPaymentSettings = {
  channels: [
    {
      id: "channel-epay-alipay",
      name: "易支付 · 支付宝",
      icon: "",
      providerType: "epay",
      channelType: "alipay",
      interactionMode: "qr",
      feeRate: "0.60",
      fixedFee: "0",
      minAmount: "1",
      maxAmount: "500000",
      hideAmountOutRange: true,
      paymentRoles: ["member"],
      paymentTypes: ["order", "renewal"],
      memberLevels: [],
      isActive: false,
      sortOrder: "10",
      publicConfig: { gateway_url: "", notify_url: "", return_url: "" },
      secretConfig: { merchant_id: "", merchant_key: "" },
      secretConfigured: false,
    },
    {
      id: "channel-manual-bank",
      name: "对公转账",
      icon: "",
      providerType: "manual",
      channelType: "bank",
      interactionMode: "page",
      feeRate: "0",
      fixedFee: "0",
      minAmount: "0",
      maxAmount: "0",
      hideAmountOutRange: false,
      paymentRoles: ["member"],
      paymentTypes: ["order", "renewal"],
      memberLevels: [],
      isActive: true,
      sortOrder: "20",
      publicConfig: { instructions: "请在提交订单后联系商务获取对公账户，并在备注中填写订单号。" },
      secretConfig: {},
      secretConfigured: false,
    },
  ],
};

const normalizeCategory = (item, index) => withId("category", {
  name: "新分类",
  slug: `category-${index + 1}`,
  description: "",
  enabled: true,
  sortOrder: String((index + 1) * 10),
  ...item,
  sortOrder: String(item?.sortOrder ?? (index + 1) * 10),
}, index);

const normalizeProduct = (item, index, categories) => {
  const normalized = withId("commerce-product", {
  categoryId: categories[0]?.id ?? "",
  slug: `product-${index + 1}`,
  shareToken: "",
  sku: "",
  name: "未命名算力商品",
  summary: "",
  image: "/images/estate-luna-ridge.png",
  imagePosition: "center center",
  gpuModel: "NVIDIA GPU",
  vram: "24 GB",
  hostingTerm: "12 个月",
  billingType: "rental",
  rentalPrice: "0",
  rentalPeriodUnit: "month",
  rentalPeriodCount: "1",
  renewable: true,
  renewalPrice: "0",
  buyoutPrice: "0",
  inventory: "0",
  details: "",
  specs: [],
  enabled: true,
  sortOrder: String((index + 1) * 10),
  ...item,
  rentalPrice: String(item?.rentalPrice ?? item?.price ?? "0"),
  rentalPeriodCount: String(item?.rentalPeriodCount ?? "1"),
  renewalPrice: String(item?.renewalPrice ?? item?.rentalPrice ?? item?.price ?? "0"),
  buyoutPrice: String(item?.buyoutPrice ?? item?.price ?? "0"),
  inventory: String(item?.inventory ?? "0"),
  sortOrder: String(item?.sortOrder ?? (index + 1) * 10),
    specs: (Array.isArray(item?.specs) ? item.specs : []).map((spec, specIndex) => withId("spec", { name: "规格", value: "", ...spec }, specIndex)),
  }, index);
  normalized.slug = slugifyCommerce(item?.slug || item?.name, `product-${index + 1}`);
  normalized.shareToken = String(item?.shareToken || normalized.slug || normalized.id).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || `share-${index + 1}`;
  return normalized;
};

const slugifyCommerce = (value, fallback) => String(value || fallback).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || fallback;

export function normalizeCommerceProducts(value) {
  const source = value && typeof value === "object" ? value : {};
  const categories = (Array.isArray(source.categories) ? source.categories : clone(defaultCommerceProducts.categories)).map(normalizeCategory);
  const items = Array.isArray(source.items) ? source.items : clone(defaultCommerceProducts.items);
  return { categories, items: items.map((item, index) => normalizeProduct(item, index, categories)) };
}

const normalizeChannel = (item, index) => withId("payment-channel", {
  name: "新支付渠道",
  icon: "",
  providerType: "epay",
  channelType: "alipay",
  interactionMode: "qr",
  feeRate: "0",
  fixedFee: "0",
  minAmount: "0",
  maxAmount: "0",
  hideAmountOutRange: false,
  paymentRoles: ["member"],
  paymentTypes: ["order", "renewal"],
  memberLevels: [],
  isActive: false,
  sortOrder: String((index + 1) * 10),
  publicConfig: {},
  secretConfig: {},
  secretConfigured: false,
  ...item,
  feeRate: String(item?.feeRate ?? "0"),
  fixedFee: String(item?.fixedFee ?? "0"),
  minAmount: String(item?.minAmount ?? "0"),
  maxAmount: String(item?.maxAmount ?? "0"),
  sortOrder: String(item?.sortOrder ?? (index + 1) * 10),
  paymentRoles: Array.isArray(item?.paymentRoles) ? item.paymentRoles : ["member"],
  paymentTypes: Array.isArray(item?.paymentTypes) ? item.paymentTypes : ["order", "renewal"],
  memberLevels: Array.isArray(item?.memberLevels) ? item.memberLevels : [],
  publicConfig: item?.publicConfig && typeof item.publicConfig === "object" ? item.publicConfig : {},
  secretConfig: item?.secretConfig && typeof item.secretConfig === "object" ? item.secretConfig : {},
}, index);

export function normalizePaymentSettings(value) {
  const source = value && typeof value === "object" ? value : {};
  const channels = Array.isArray(source.channels) ? source.channels : Array.isArray(source.methods) ? source.methods : clone(defaultPaymentSettings.channels);
  return { channels: channels.map(normalizeChannel) };
}

export const commerceSettingNormalizers = { products: normalizeCommerceProducts, payment: normalizePaymentSettings };
export const defaultCommerceSettings = { products: defaultCommerceProducts, payment: defaultPaymentSettings };
