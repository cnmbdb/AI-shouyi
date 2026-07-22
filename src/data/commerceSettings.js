const clone = (value) => structuredClone(value);
const withId = (prefix, item, index) => ({ id: item.id || `${prefix}-${index + 1}`, ...item });

export const defaultCommerceProducts = {
  items: [
    {
      id: "commerce-rtx-5090",
      sku: "GPU-RTX5090-24M",
      name: "RTX 5090 跑算计划",
      gpuModel: "NVIDIA GeForce RTX 5090",
      vram: "32 GB",
      hostingTerm: "24 个月",
      price: "128800",
      inventory: "18",
      enabled: true,
    },
    {
      id: "commerce-h100",
      sku: "GPU-H100-24M",
      name: "H100 SXM 企业跑算计划",
      gpuModel: "NVIDIA H100 SXM",
      vram: "80 GB",
      hostingTerm: "24 个月",
      price: "268000",
      inventory: "6",
      enabled: true,
    },
    {
      id: "commerce-l40s",
      sku: "GPU-L40S-12M",
      name: "L40S 跑算计划",
      gpuModel: "NVIDIA L40S",
      vram: "48 GB",
      hostingTerm: "12 个月",
      price: "68600",
      inventory: "24",
      enabled: true,
    },
  ],
};

export const defaultPaymentSettings = {
  enabled: true,
  merchantName: "Aether Lane 算力商城",
  environment: "sandbox",
  currency: "CNY",
  orderTimeoutMinutes: "30",
  settlementCycle: "T+1",
  callbackBaseUrl: "https://api.aetherlane.com/payments/callback",
  minimumAmount: "1000",
  maximumAmount: "500000",
  requireAgreement: true,
  invoiceEnabled: true,
  successMessage: "支付成功，我们将尽快确认设备与托管排期。",
  failureMessage: "支付未完成，请更换支付方式或联系客服。",
  methods: [
    { id: "wechat", label: "微信支付", enabled: true, feeRate: "0.60", displayOrder: "1" },
    { id: "alipay", label: "支付宝", enabled: true, feeRate: "0.60", displayOrder: "2" },
    { id: "bank", label: "对公转账", enabled: true, feeRate: "0", displayOrder: "3" },
  ],
};

export function normalizeCommerceProducts(value) {
  const source = value && typeof value === "object" ? value : {};
  const items = Array.isArray(source.items) ? source.items : clone(defaultCommerceProducts.items);
  return {
    ...clone(defaultCommerceProducts),
    ...source,
    items: items.map((item, index) => withId("commerce-product", {
      sku: "",
      name: "未命名算力商品",
      gpuModel: "GPU 型号",
      vram: "显存",
      hostingTerm: "12 个月",
      price: "0",
      inventory: "0",
      enabled: true,
      ...item,
      price: String(item.price ?? "0"),
      inventory: String(item.inventory ?? "0"),
    }, index)),
  };
}

export function normalizePaymentSettings(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    ...clone(defaultPaymentSettings),
    ...source,
    orderTimeoutMinutes: String(source.orderTimeoutMinutes ?? defaultPaymentSettings.orderTimeoutMinutes),
    minimumAmount: String(source.minimumAmount ?? defaultPaymentSettings.minimumAmount),
    maximumAmount: String(source.maximumAmount ?? defaultPaymentSettings.maximumAmount),
    methods: (Array.isArray(source.methods) ? source.methods : clone(defaultPaymentSettings.methods)).map((item, index) => withId("payment-method", {
      label: "新支付方式",
      enabled: false,
      feeRate: "0",
      displayOrder: String(index + 1),
      ...item,
      feeRate: String(item.feeRate ?? "0"),
      displayOrder: String(item.displayOrder ?? index + 1),
    }, index)),
  };
}

export const commerceSettingNormalizers = {
  products: normalizeCommerceProducts,
  payment: normalizePaymentSettings,
};

export const defaultCommerceSettings = {
  products: defaultCommerceProducts,
  payment: defaultPaymentSettings,
};
