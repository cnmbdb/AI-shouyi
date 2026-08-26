import { normalizeFocalPosition } from "../lib/focalPosition.js";

const clone = (value) => structuredClone(value);
const withId = (prefix, item, index) => ({ id: item.id || `${prefix}-${index + 1}`, ...item });

export const commerceSpecificationFields = [
  { value: "computePower", label: "算力", unit: "" },
  { value: "monthlyReturnRate", label: "月租回报", unit: "%" },
  { value: "rentalDuration", label: "租赁时长", unit: "天" },
  { value: "dailyTokenOutput", label: "每日 TOKEN 产出", unit: "TOKEN" },
];

const buildSpecificationLevels = ({ computePower, monthlyReturnRate, rentalDuration, dailyTokenOutput }) => [
  { id: "level-compute", field: "computePower", name: "算力", unit: "", options: computePower.map((value, index) => ({ id: `compute-${index + 1}`, value: String(value) })) },
  { id: "level-return", field: "monthlyReturnRate", name: "月租回报", unit: "%", options: monthlyReturnRate.map((value, index) => ({ id: `return-${index + 1}`, value: String(value) })) },
  { id: "level-duration", field: "rentalDuration", name: "租赁时长", unit: "天", options: rentalDuration.map((value, index) => ({ id: `duration-${index + 1}`, value: String(value) })) },
  { id: "level-token", field: "dailyTokenOutput", name: "每日 TOKEN 产出", unit: "TOKEN", options: dailyTokenOutput.map((value, index) => ({ id: `token-${index + 1}`, value: String(value) })) },
];

const variantKey = (levels, selections) => levels.map((level) => String(selections?.[level.id] ?? "")).join("::");

const numericOptionValue = (value) => {
  const parsed = Number(String(value ?? "").replace(/,/g, "").match(/-?\d+(?:\.\d+)?/)?.[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

export function suggestSkuPrice(basePrice, levels, selections) {
  const valueFor = (field) => {
    const level = levels.find((entry) => entry.field === field);
    const optionId = selections?.[level?.id];
    return numericOptionValue(level?.options?.find((option) => option.id === optionId)?.value);
  };
  const compute = valueFor("computePower");
  const returnRate = valueFor("monthlyReturnRate");
  const duration = valueFor("rentalDuration");
  const token = valueFor("dailyTokenOutput");
  const computeFactor = compute == null ? 1 : Math.max(0.6, Math.min(2.1, compute / 50));
  const returnFactor = returnRate == null ? 1 : Math.max(0.9, Math.min(1.35, 0.9 + returnRate / 100));
  const durationFactor = duration == null ? 1 : duration <= 1 ? 1.08 : duration <= 30 ? 1 : 0.92;
  const tokenFactor = token == null ? 1 : Math.max(0.86, Math.min(1.25, 0.84 + token / 2500));
  return Math.max(0, Math.round((Number(basePrice) || 0) * computeFactor * returnFactor * durationFactor * tokenFactor / 10) * 10);
}

export function suggestSkuInventory(baseInventory, levels, selections) {
  const valueFor = (field) => {
    const level = levels.find((entry) => entry.field === field);
    const optionId = selections?.[level?.id];
    return numericOptionValue(level?.options?.find((option) => option.id === optionId)?.value);
  };
  const compute = valueFor("computePower");
  const returnRate = valueFor("monthlyReturnRate");
  const duration = valueFor("rentalDuration");
  const token = valueFor("dailyTokenOutput");
  const computeFactor = compute == null ? 1 : Math.max(0.45, Math.min(1.2, 1.35 - compute / 120));
  const returnFactor = returnRate == null ? 1 : Math.max(0.8, Math.min(1.05, 1.05 - returnRate / 200));
  const durationFactor = duration == null ? 1 : duration <= 1 ? 1.05 : duration <= 30 ? 1 : 0.95;
  const tokenFactor = token == null ? 1 : Math.max(0.75, Math.min(1.05, 1.05 - token / 5000));
  return Math.max(0, Math.round((Number(baseInventory) || 0) * computeFactor * returnFactor * durationFactor * tokenFactor));
}

export function buildVariantMatrix(levels, existingVariants = [], fallbackPrice = "0", fallbackInventory = "0") {
  const safeLevels = (Array.isArray(levels) ? levels : []).filter((level) => Array.isArray(level.options) && level.options.length);
  if (!safeLevels.length) return [];
  const existing = new Map((Array.isArray(existingVariants) ? existingVariants : []).map((variant) => [variantKey(safeLevels, variant.selections ?? variant.optionIds), variant]));
  const combinations = safeLevels.reduce((rows, level) => rows.flatMap((row) => level.options.map((option) => ({ ...row, [level.id]: option.id }))), [{}]);
  return combinations.map((selections, index) => {
    const previous = existing.get(variantKey(safeLevels, selections));
    return {
      id: previous?.id || `sku-variant-${index + 1}-${Object.values(selections).join("-")}`,
      selections,
      price: String(previous?.price ?? previous?.monthlyRentalPrice ?? (typeof fallbackPrice === "function" ? fallbackPrice(selections, safeLevels, index) : fallbackPrice) ?? "0"),
      inventory: String(previous?.inventory ?? previous?.stock ?? (typeof fallbackInventory === "function" ? fallbackInventory(selections, safeLevels, index) : fallbackInventory) ?? "0"),
    };
  });
}

const makeDefaultSpecificationData = (price, inventory) => {
  const levels = buildSpecificationLevels({
    computePower: ["30", "50", "100"],
    monthlyReturnRate: ["3", "10", "40"],
    rentalDuration: ["1", "30", "180"],
    dailyTokenOutput: ["300", "500", "1000"],
  });
  return {
    levels,
    variants: buildVariantMatrix(
      levels,
      [],
      (selections, matrixLevels) => suggestSkuPrice(price, matrixLevels, selections),
      (selections, matrixLevels) => suggestSkuInventory(inventory, matrixLevels, selections),
    ),
  };
};

const rtx5090Specification = makeDefaultSpecificationData("6880", "18");
const h100Specification = makeDefaultSpecificationData("26800", "6");
const rtx4090Specification = makeDefaultSpecificationData("2650", "24");

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
      imagePosition: "50% 50%",
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
      specs: rtx5090Specification.levels,
      variants: rtx5090Specification.variants,
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
      imagePosition: "50% 50%",
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
      specs: h100Specification.levels,
      variants: h100Specification.variants,
      enabled: true,
      sortOrder: "30",
    },
    {
      id: "commerce-rtx-4090",
      categoryId: "category-consumer",
      slug: "rtx-4090-compute-plan",
      shareToken: "rtx4090",
      sku: "GPU-RTX4090-12M",
      name: "RTX 4090 跑算计划",
      summary: "成熟稳定的桌面级 GPU，适合图像生成、模型推理和持续跑算。",
      image: "/images/estate-vista-mare.png",
      imagePosition: "50% 50%",
      gpuModel: "NVIDIA GeForce RTX 4090",
      vram: "24 GB",
      hostingTerm: "12–24 个月",
      billingType: "both",
      rentalPrice: "2650",
      rentalPeriodUnit: "month",
      rentalPeriodCount: "1",
      renewable: true,
      renewalPrice: "2650",
      buyoutPrice: "32800",
      inventory: "24",
      details: "设备由平台统一上架、运维和调度，可按选定规格参与跑算，也可一次性买断。订单会保存所选规格和价格快照。",
      specs: rtx4090Specification.levels,
      variants: rtx4090Specification.variants,
      enabled: true,
      sortOrder: "20",
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
  const specs = normalizeSpecificationLevels(item, index);
  const variants = normalizeVariantPrices(item, specs, index);
  const normalized = withId("commerce-product", {
  categoryId: categories[0]?.id ?? "",
  slug: `product-${index + 1}`,
  shareToken: "",
  sku: "",
  name: "未命名算力商品",
  summary: "",
  image: "/images/estate-luna-ridge.png",
  imagePosition: "50% 50%",
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
  specs,
  variants,
  enabled: true,
  sortOrder: String((index + 1) * 10),
  ...item,
  rentalPrice: String(item?.rentalPrice ?? item?.price ?? "0"),
  rentalPeriodCount: String(item?.rentalPeriodCount ?? "1"),
  renewalPrice: String(item?.renewalPrice ?? item?.rentalPrice ?? item?.price ?? "0"),
  buyoutPrice: String(item?.buyoutPrice ?? item?.price ?? "0"),
  inventory: String(item?.inventory ?? "0"),
  sortOrder: String(item?.sortOrder ?? (index + 1) * 10),
    specs,
    variants,
  }, index);
  normalized.slug = slugifyCommerce(item?.slug || item?.name, `product-${index + 1}`);
  normalized.shareToken = String(item?.shareToken || normalized.slug || normalized.id).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || `share-${index + 1}`;
  normalized.imagePosition = normalizeFocalPosition(normalized.imagePosition);
  return normalized;
};

const fieldDefinition = (field) => commerceSpecificationFields.find((item) => item.value === field) ?? commerceSpecificationFields[0];
const normalizeSpecificationOption = (option, index, levelId) => withId(`${levelId}-option`, {
  value: String(option?.value ?? option?.label ?? option ?? ""),
}, index);

function variantsToSpecificationLevels(product, productIndex) {
  const defaults = {
    computePower: ["30", "50", "100"],
    monthlyReturnRate: ["3", "10", "40"],
    rentalDuration: ["1", "30", "180"],
    dailyTokenOutput: ["300", "500", "1000"],
  };
  return commerceSpecificationFields.map((definition, levelIndex) => ({
    id: `spec-level-${productIndex + 1}-${levelIndex + 1}`,
    field: definition.value,
    name: definition.label,
    unit: definition.unit,
    options: defaults[definition.value].map((value, optionIndex) => ({ id: `spec-option-${productIndex + 1}-${levelIndex + 1}-${optionIndex + 1}`, value })),
  }));
}

function normalizeSpecificationLevels(product, productIndex) {
  const source = Array.isArray(product?.specs) ? product.specs : Array.isArray(product?.specs?.levels) ? product.specs.levels : [];
  const levels = source.filter((entry) => entry && Array.isArray(entry.options));
  if (!levels.length) return variantsToSpecificationLevels(product, productIndex);
  return levels.filter((level) => level.field !== "monthlyRentalPrice").slice(0, 4).map((level, levelIndex) => {
    const definition = fieldDefinition(level.field);
    const id = level.id || `spec-level-${productIndex + 1}-${levelIndex + 1}`;
    const options = (Array.isArray(level.options) ? level.options : []).map((option, optionIndex) => normalizeSpecificationOption(option, optionIndex, id));
    return {
      id,
      field: definition.value,
      name: String(level.name ?? definition.label).trim() || definition.label,
      unit: String(level.unit ?? definition.unit),
      options: options.length ? options : [{ id: `${id}-option-1`, value: "0" }],
    };
  });
}

function normalizeVariantPrices(product, levels, productIndex) {
  const storedVariants = Array.isArray(product?.variants)
    ? product.variants
    : Array.isArray(product?.specs?.variants)
      ? product.specs.variants
      : [];
  const flatSpecs = Array.isArray(product?.specs)
    ? product.specs.filter((entry) => entry && !Array.isArray(entry.options) && (entry.computePower !== undefined || entry.monthlyRentalPrice !== undefined))
    : [];
  const legacyVariants = flatSpecs.map((variant, variantIndex) => {
    const selections = Object.fromEntries(levels.map((level) => {
      const rawValue = level.field === "rentalDuration"
        ? String(Math.max(1, Number(variant.rentalMonths || 1)) * 30)
        : String(variant[level.field] ?? "");
      const option = level.options.find((entry) => entry.value === rawValue) ?? level.options[0];
      return [level.id, option?.id ?? ""];
    }));
    return {
      id: variant.id || `legacy-sku-${productIndex + 1}-${variantIndex + 1}`,
      selections,
      price: String(variant.monthlyRentalPrice ?? product?.rentalPrice ?? product?.price ?? "0"),
      inventory: String(variant.inventory ?? variant.stock ?? product?.inventory ?? "0"),
    };
  });
  const legacyPriceLevel = (Array.isArray(product?.specs) ? product.specs : product?.specs?.levels ?? []).find((level) => level?.field === "monthlyRentalPrice");
  const fallbackPrice = String(legacyPriceLevel?.options?.[0]?.value ?? product?.rentalPrice ?? product?.price ?? "0");
  const fallbackInventory = String(product?.inventory ?? "0");
  return buildVariantMatrix(
    levels,
    storedVariants.length ? storedVariants : legacyVariants,
    (selections, matrixLevels) => suggestSkuPrice(fallbackPrice, matrixLevels, selections),
    (selections, matrixLevels) => suggestSkuInventory(fallbackInventory, matrixLevels, selections),
  );
}

export function resolveSpecificationSelection(levels, selections = {}) {
  return Object.fromEntries((Array.isArray(levels) ? levels : []).map((level) => {
    const selected = level.options.find((option) => option.id === selections[level.id]) ?? level.options[0];
    return [level.field, { ...selected, levelId: level.id, name: level.name, unit: level.unit }];
  }));
}

export function resolveProductVariant(product, selections = {}) {
  const levels = Array.isArray(product?.specs) ? product.specs : [];
  const specification = resolveSpecificationSelection(levels, selections);
  const normalizedSelections = Object.fromEntries(levels.map((level) => [level.id, specification[level.field]?.id ?? level.options[0]?.id ?? ""]));
  const key = variantKey(levels, normalizedSelections);
  const variant = (Array.isArray(product?.variants) ? product.variants : []).find((entry) => variantKey(levels, entry.selections ?? entry.optionIds) === key) ?? product?.variants?.[0] ?? null;
  return { specification, selections: normalizedSelections, variant, price: Number(variant?.price ?? product?.rentalPrice ?? 0) || 0 };
}

const slugifyCommerce = (value, fallback) => String(value || fallback).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || fallback;

export function normalizeCommerceProducts(value) {
  const source = value && typeof value === "object" ? value : {};
  const categories = (Array.isArray(source.categories) ? source.categories : clone(defaultCommerceProducts.categories)).map(normalizeCategory);
  let items = Array.isArray(source.items) ? source.items : clone(defaultCommerceProducts.items);
  // Replace the legacy seeded L40S buyout row with the current RTX 4090 default
  // when the catalog is still on the original three-product seed. This keeps
  // local/legacy data aligned with the same three compute products and avoids a
  // buyout-only row with meaningless zero monthly SKU prices.
  const hasRtx4090 = items.some((item) => item?.id === "commerce-rtx-4090");
  const hasRtx5090 = items.some((item) => item?.id === "commerce-rtx-5090");
  const hasH100 = items.some((item) => item?.id === "commerce-h100");
  const legacyL40SIndex = items.findIndex((item) => item?.id === "commerce-l40s" && item?.sku === "GPU-L40S-BUYOUT");
  if (!hasRtx4090 && hasRtx5090 && hasH100 && legacyL40SIndex >= 0) {
    items = items.map((item, index) => index === legacyL40SIndex ? clone(defaultCommerceProducts.items.find((entry) => entry.id === "commerce-rtx-4090")) : item);
  }
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
