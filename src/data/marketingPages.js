import { normalizeFocalPosition } from "../lib/focalPosition.js";
import { normalizeManagedLink } from "../lib/managedLink.js";

const clone = (value) => structuredClone(value);
const withId = (prefix, item, index) => ({ id: item.id || `${prefix}-${index + 1}`, ...item });
const numberWithin = (value, fallback, min, max) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(max, Math.max(min, numeric)) : fallback;
};

const action = (label, link) => ({ label, link });
const item = (id, title, description, icon, link = "") => ({ id, title, description, icon, link, enabled: true });

export const marketingPageIconOptions = [
  ["Cpu", "GPU 算力"],
  ["HardDrives", "设备托管"],
  ["ShieldCheck", "安全保障"],
  ["ChartLineUp", "收益增长"],
  ["Calculator", "收益测算"],
  ["Coins", "资金收益"],
  ["Clock", "时间周期"],
  ["Handshake", "合作代理"],
  ["UsersThree", "团队服务"],
  ["Headset", "客户支持"],
  ["EnvelopeSimple", "电子邮件"],
  ["Phone", "联系电话"],
  ["MapPin", "服务地点"],
  ["CheckCircle", "完成确认"],
  ["FileText", "资料文档"],
  ["Wrench", "技术运维"],
  ["Storefront", "业务拓展"],
  ["RocketLaunch", "快速启动"],
  ["Question", "常见问题"],
  ["ChatCircleText", "在线沟通"],
  ["UserPlus", "加入平台"],
  ["GlobeHemisphereWest", "全球资源"],
  ["Gauge", "运行效率"],
  ["ArrowsClockwise", "持续续约"],
  ["Lightning", "即时算力"],
  ["Buildings", "基础设施"],
];

export const marketingPageMeta = {
  about: { title: "关于我们页面内容管理", navTitle: "关于我们", description: "管理平台故事、服务原则、运维能力与行动区", icon: "UsersThree" },
  calculator: { title: "收益计算页面内容管理", navTitle: "收益计算", description: "管理测算参数、计算说明、方法与行动区", icon: "Calculator" },
  agency: { title: "我要代理页面内容管理", navTitle: "我要代理", description: "管理代理价值、合作流程、支持标准与申请入口", icon: "Handshake" },
  contact: { title: "联系我们页面内容管理", navTitle: "联系我们", description: "管理联系渠道、服务说明、常见问题与联系表单", icon: "Headset" },
};

export const defaultMarketingPageSettings = {
  about: {
    hero: {
      id: "hero",
      enabled: true,
      icon: "Buildings",
      title: "让算力资产持续运行，也让每一笔收益看得清楚",
      description: "Aether Lane 为用户连接 GPU 设备、专业托管和真实算力需求，提供从上架到结算的完整服务。",
      image: "/images/about-compute-team.png",
      imagePosition: "68% 50%",
      button: action("了解算力产品", "/estates"),
    },
    sections: [
      {
        id: "story",
        kind: "story",
        enabled: true,
        icon: "Cpu",
        title: "从一台设备开始，建立透明的算力资产运营",
        description: "平台面向希望租用 GPU、托管设备并获得持续跑算收益的用户。我们把设备接入、运行监控、需求调度和收益记录放在同一条可追踪链路中。",
        image: "/images/about-compute-team.png",
        imagePosition: "72% 50%",
        button: action("查看控制台能力", "/auth"),
        items: [
          item("story-device", "设备可追踪", "设备状态、到期时间和跑算记录统一查看。", "HardDrives", "/auth"),
          item("story-income", "收益可核对", "跑算收益、结算和资金明细保留完整记录。", "ChartLineUp", "/auth"),
        ],
      },
      {
        id: "principles",
        kind: "features",
        enabled: true,
        icon: "ShieldCheck",
        title: "平台坚持的服务原则",
        description: "硬件参数说清楚，托管周期说清楚，收益口径也说清楚。",
        image: "/images/yield-calculator-gpu.png",
        imagePosition: "70% 50%",
        button: action("测算预期收益", "/calculator"),
        items: [
          item("principle-real", "真实设备信息", "公开 GPU 型号、显存、库存与托管周期。", "Cpu", "/estates"),
          item("principle-clear", "清晰收益口径", "区分跑算收益、待结算收益和实际到账。", "Coins", "/calculator"),
          item("principle-safe", "可信权限边界", "账户、资产和管理权限按角色严格隔离。", "ShieldCheck", "/auth"),
          item("principle-support", "持续运维支持", "从设备接入到运行异常都有服务团队跟进。", "Wrench", "/contact"),
        ],
      },
      {
        id: "operations",
        kind: "operations",
        enabled: true,
        icon: "Gauge",
        title: "设备接入后的每一步都有对应负责人",
        description: "资产上架、机房托管、需求调度、运行巡检和收益结算形成连续的服务闭环。",
        image: "/images/agency-partners.png",
        imagePosition: "62% 50%",
        button: action("咨询托管方案", "/contact"),
        items: [
          item("operation-onboard", "设备接入", "确认硬件规格、服务周期和资产归属。", "FileText"),
          item("operation-host", "托管运行", "完成部署、联网、巡检和状态跟踪。", "Buildings"),
          item("operation-demand", "需求匹配", "根据硬件能力匹配适合的算力任务。", "Lightning"),
          item("operation-settle", "收益结算", "按实际记录汇总跑算产出和结算状态。", "ChartLineUp"),
        ],
      },
      {
        id: "cta",
        kind: "cta",
        enabled: true,
        icon: "ChatCircleText",
        title: "想进一步了解设备托管和收益模式？",
        description: "告诉我们你的 GPU 型号、设备数量和计划周期，服务团队会给出对应建议。",
        image: "/images/contact-advisor.png",
        imagePosition: "70% 50%",
        button: action("联系服务团队", "/contact"),
        items: [],
      },
    ],
  },
  calculator: {
    hero: {
      id: "hero",
      enabled: true,
      icon: "Calculator",
      title: "先看清 GPU 售价、月回报率与协议周期",
      description: "使用设备售价和月回报率，快速测算每月委托租赁金额与闭口协议期累计回报。",
      image: "/images/yield-calculator-gpu.png",
      imagePosition: "72% 50%",
      button: action("开始测算", "#calculator"),
    },
    sections: [
      {
        id: "calculator",
        kind: "calculator",
        enabled: true,
        icon: "Calculator",
        title: "GPU 跑算收益测算",
        description: "以下为当前委托租赁方案参数，实际权益与结算规则以最终签署协议为准。",
        image: "/images/yield-calculator-gpu.png",
        imagePosition: "72% 50%",
        button: action("查看可用产品", "/estates"),
        calculatorConfig: {
          monthlyLeaseLabel: "每个月委托租赁",
          plans: [
            { id: "rtx-5090", gpuModel: "RTX 5090", unitPrice: 50000, monthlyReturnRate: 8, contractMonths: 24, defaultDeviceCount: 1 },
            { id: "rtx-4090", gpuModel: "RTX 4090", unitPrice: 32000, monthlyReturnRate: 7, contractMonths: 24, defaultDeviceCount: 1 },
            { id: "h100-sxm", gpuModel: "H100 SXM", unitPrice: 180000, monthlyReturnRate: 6, contractMonths: 36, defaultDeviceCount: 1 },
          ],
        },
        items: [],
      },
      {
        id: "assumptions",
        kind: "features",
        enabled: true,
        icon: "ShieldCheck",
        title: "读懂测算结果前，需要确认这些前提",
        description: "测算用于方案比较，不构成保本或固定收益承诺。",
        image: "/images/about-compute-team.png",
        imagePosition: "68% 50%",
        button: action("咨询实际方案", "/contact"),
        items: [
          item("assumption-runtime", "有效运行时间", "维护、故障和任务空档会影响实际运行天数。", "Clock"),
          item("assumption-demand", "任务需求变化", "不同 GPU 型号的需求与单价会随市场变化。", "ArrowsClockwise"),
          item("assumption-cost", "成本口径一致", "比较方案时需使用相同的电力与运维成本口径。", "Coins"),
          item("assumption-tax", "税费另行确认", "测算结果未自动加入个人或企业税费。", "FileText"),
        ],
      },
      {
        id: "method",
        kind: "operations",
        enabled: true,
        icon: "Gauge",
        title: "用同一套口径核对委托租赁方案",
        description: "先确认设备型号与售价，再核对月回报率、每月委托租赁金额和闭口协议期限。",
        image: "/images/agency-partners.png",
        imagePosition: "72% 50%",
        button: action("浏览 GPU 产品", "/estates"),
        items: [
          item("method-input", "确认设备参数", "核对 GPU 型号、设备数量与单台售价。", "FileText"),
          item("method-calc", "核对月度公式", "单台售价乘以月回报率，得到每月委托租赁金额。", "Calculator"),
          item("method-review", "加入风险余量", "为停机、维护和需求波动预留空间。", "ShieldCheck"),
          item("method-decide", "确认托管方案", "结合设备库存和服务周期做最终选择。", "CheckCircle"),
        ],
      },
      {
        id: "cta",
        kind: "cta",
        enabled: true,
        icon: "Headset",
        title: "需要按照你的设备参数重新测算？",
        description: "提交 GPU 型号、数量和计划周期，我们可以协助核对成本口径。",
        image: "/images/contact-advisor.png",
        imagePosition: "70% 50%",
        button: action("联系收益顾问", "/contact"),
        items: [],
      },
    ],
  },
  agency: {
    hero: {
      id: "hero",
      enabled: true,
      icon: "Handshake",
      title: "把可信的 GPU 算力产品带给你的客户",
      description: "面向渠道团队、技术服务商和行业顾问开放合作，共享产品、交付与持续服务能力。",
      image: "/images/agency-partners.png",
      imagePosition: "36% 50%",
      button: action("申请成为代理", "#agency-apply"),
    },
    sections: [
      {
        id: "benefits",
        kind: "features",
        enabled: true,
        icon: "Storefront",
        title: "代理合作不止是一份产品目录",
        description: "你负责连接客户，我们提供产品资料、方案支持、交付协同和售后服务。",
        image: "/images/agency-partners.png",
        imagePosition: "40% 50%",
        button: action("查看算力产品", "/estates"),
        items: [
          item("benefit-catalog", "可用产品与库存", "获取可售 GPU 型号、规格、周期和库存信息。", "Cpu", "/estates"),
          item("benefit-solution", "售前方案支持", "复杂客户需求可由平台协助梳理配置。", "FileText", "/contact"),
          item("benefit-delivery", "交付过程协同", "从下单、部署到设备上线都有明确进度。", "RocketLaunch", "/contact"),
          item("benefit-service", "持续售后服务", "运行、续费和异常处理由服务团队跟进。", "Headset", "/contact"),
        ],
      },
      {
        id: "process",
        kind: "operations",
        enabled: true,
        icon: "Handshake",
        title: "从申请到开展业务，按清晰流程推进",
        description: "确认客户类型和服务能力后，平台会提供对应的合作资料与支持方式。",
        image: "/images/about-compute-team.png",
        imagePosition: "70% 50%",
        button: action("开始合作沟通", "#agency-apply"),
        items: [
          item("process-submit", "提交合作资料", "介绍团队、客户类型和主要服务区域。", "UserPlus"),
          item("process-review", "确认合作范围", "双方核对产品、交付、服务和结算边界。", "FileText"),
          item("process-enable", "开通代理支持", "获取产品资料、咨询渠道和业务协同方式。", "Storefront"),
          item("process-serve", "持续服务客户", "平台协同完成交付、运行和续费支持。", "ArrowsClockwise"),
        ],
      },
      {
        id: "standards",
        kind: "story",
        enabled: true,
        icon: "ShieldCheck",
        title: "我们重视长期服务能力，而不是一次成交",
        description: "适合已经服务企业客户、技术团队或算力需求方，并愿意准确说明产品与收益边界的合作伙伴。",
        image: "/images/contact-advisor.png",
        imagePosition: "70% 50%",
        button: action("咨询合作要求", "/contact"),
        items: [
          item("standard-accurate", "准确传达产品", "不夸大硬件能力，不承诺固定收益。", "ShieldCheck"),
          item("standard-follow", "持续跟进客户", "在购买、部署、运行和续费阶段保持沟通。", "UsersThree"),
        ],
      },
      {
        id: "agency-apply",
        kind: "cta",
        enabled: true,
        icon: "UserPlus",
        title: "准备好介绍你的团队和客户方向了吗？",
        description: "通过联系页面提交合作信息，我们会根据业务范围安排对应人员沟通。",
        image: "/images/agency-partners.png",
        imagePosition: "38% 50%",
        button: action("提交代理申请", "/contact"),
        items: [],
      },
    ],
  },
  contact: {
    hero: {
      id: "hero",
      enabled: true,
      icon: "Headset",
      title: "把你的设备、收益或合作问题直接告诉我们",
      description: "无论是产品选择、GPU 托管、跑算收益还是代理合作，服务团队都会按问题类型跟进。",
      image: "/images/contact-advisor.png",
      imagePosition: "72% 50%",
      button: action("填写联系信息", "#contact-form"),
    },
    sections: [
      {
        id: "channels",
        kind: "features",
        enabled: true,
        icon: "ChatCircleText",
        title: "选择适合你的联系渠道",
        description: "紧急运行问题建议优先电话联系，产品和合作资料可通过邮件提交。",
        image: "/images/contact-advisor.png",
        imagePosition: "72% 50%",
        button: action("发送邮件", "mailto:hello@aetherlane.com"),
        items: [
          item("channel-phone", "+86 400 800 5090", "工作日 09:00-18:00，处理产品与托管咨询。", "Phone", "tel:+864008005090"),
          item("channel-email", "hello@aetherlane.com", "适合提交设备清单、合作资料和详细问题。", "EnvelopeSimple", "mailto:hello@aetherlane.com"),
          item("channel-support", "在线支持工单", "登录控制台后提交资产、订单或运行问题。", "Headset", "/console"),
          item("channel-location", "亚太区远程服务", "支持线上方案沟通与机房交付协同。", "GlobeHemisphereWest", "/about"),
        ],
      },
      {
        id: "service",
        kind: "operations",
        enabled: true,
        icon: "Clock",
        title: "问题会进入对应的服务流程",
        description: "收到信息后，我们先确认问题类型，再由产品、运维、结算或合作人员接手。",
        image: "/images/about-compute-team.png",
        imagePosition: "72% 50%",
        button: action("了解平台服务", "/about"),
        items: [
          item("service-product", "产品与库存", "确认 GPU 规格、库存、周期和购买方式。", "Cpu"),
          item("service-hosting", "托管与运行", "处理部署、网络、巡检和设备异常。", "Wrench"),
          item("service-income", "收益与结算", "核对跑算记录、待结算金额和资金流水。", "Coins"),
          item("service-agency", "代理与合作", "确认渠道方向、客户类型和合作支持。", "Handshake"),
        ],
      },
      {
        id: "faq",
        kind: "faq",
        enabled: true,
        icon: "Question",
        title: "联系前可以先查看这些常见问题",
        description: "页面信息可由管理员随时修改，并为每个问题配置进一步跳转。",
        image: "/images/yield-calculator-gpu.png",
        imagePosition: "72% 50%",
        button: action("查看收益测算", "/calculator"),
        items: [
          item("faq-device", "我已经有 GPU，可以只使用托管服务吗？", "可以。请提交型号、数量、所在区域和计划周期，服务团队会确认可接入条件。", "HardDrives", "/contact#contact-form"),
          item("faq-income", "页面显示的收益是固定收益吗？", "不是。收益会受到任务需求、运行时间、设备状态和成本变化影响。", "ChartLineUp", "/calculator"),
          item("faq-order", "购买后多久可以看到设备？", "具体时间取决于库存、交付和部署状态，订单进度会在控制台中更新。", "Clock", "/console/orders"),
          item("faq-agency", "个人也可以申请代理吗？", "可以提交申请。平台会根据客户资源、服务能力和业务方向评估合作方式。", "Handshake", "/agency"),
        ],
      },
      {
        id: "contact-form",
        kind: "form",
        enabled: true,
        icon: "EnvelopeSimple",
        title: "留下信息，方便我们安排对应人员回复",
        description: "请不要在表单中填写密码、支付密钥或其他敏感凭证。",
        image: "/images/contact-advisor.png",
        imagePosition: "72% 50%",
        button: action("发送联系邮件", "mailto:hello@aetherlane.com"),
        items: [
          { ...item("name", "称呼", "请输入你的称呼", "UserPlus"), fieldType: "text" },
          { ...item("contact", "联系方式", "请输入邮箱或手机号", "Phone"), fieldType: "text" },
          { ...item("subject", "咨询主题", "例如：RTX 4090 托管方案", "FileText"), fieldType: "text" },
          { ...item("message", "详细说明", "请描述设备型号、数量、计划周期或合作需求", "ChatCircleText"), fieldType: "textarea" },
        ],
      },
    ],
  },
};

const normalizeButton = (source, fallback) => ({
  ...clone(fallback),
  ...(source && typeof source === "object" ? source : {}),
  link: normalizeManagedLink(source?.link ?? fallback.link),
});

const normalizeItem = (source, fallback, index, prefix) => withId(prefix, {
  ...clone(fallback ?? {}),
  ...(source && typeof source === "object" ? source : {}),
  enabled: source?.enabled ?? fallback?.enabled ?? true,
  link: normalizeManagedLink(source?.link ?? fallback?.link ?? ""),
}, index);

const normalizeCalculatorPlan = (source, fallback, index, usedIds) => {
  const saved = source && typeof source === "object" ? source : {};
  const defaultPlan = fallback && typeof fallback === "object" ? fallback : defaultMarketingPageSettings.calculator.sections[0].calculatorConfig.plans[0];
  const baseId = String(saved.id ?? defaultPlan.id ?? `gpu-plan-${index + 1}`).trim() || `gpu-plan-${index + 1}`;
  let id = baseId;
  let duplicateIndex = 2;
  while (usedIds.has(id)) id = `${baseId}-${duplicateIndex++}`;
  usedIds.add(id);
  return {
    id,
    gpuModel: String(saved.gpuModel ?? defaultPlan.gpuModel).trim() || defaultPlan.gpuModel,
    unitPrice: numberWithin(saved.unitPrice, defaultPlan.unitPrice, 0, 100000000),
    monthlyReturnRate: numberWithin(saved.monthlyReturnRate, defaultPlan.monthlyReturnRate, 0, 100),
    contractMonths: numberWithin(saved.contractMonths, defaultPlan.contractMonths, 1, 120),
    defaultDeviceCount: numberWithin(saved.defaultDeviceCount, defaultPlan.defaultDeviceCount, 1, 1000),
  };
};

const normalizeSection = (source, fallback, index, pageKey) => {
  const saved = source && typeof source === "object" ? source : {};
  const fallbackItems = Array.isArray(fallback.items) ? fallback.items : [];
  const savedItems = Array.isArray(saved.items) ? saved.items : fallbackItems;
  const fallbackById = new Map(fallbackItems.map((entry) => [entry.id, entry]));
  const normalized = withId(`${pageKey}-section`, {
    ...clone(fallback),
    ...saved,
    kind: fallback.kind,
    enabled: saved.enabled ?? fallback.enabled ?? true,
    imagePosition: normalizeFocalPosition(saved.imagePosition ?? fallback.imagePosition),
    button: normalizeButton(saved.button, fallback.button),
    items: savedItems.map((entry, itemIndex) => normalizeItem(entry, fallbackById.get(entry.id) ?? fallbackItems[itemIndex], itemIndex, `${pageKey}-${fallback.id}-item`)),
  }, index);
  if (pageKey === "calculator" && fallback.id === "calculator") {
    const legacyById = new Map(savedItems.map((entry) => [entry.id, entry]));
    const config = saved.calculatorConfig && typeof saved.calculatorConfig === "object" ? saved.calculatorConfig : {};
    const fallbackPlans = fallback.calculatorConfig.plans;
    const firstFallback = fallbackPlans[0];
    const legacyPrice = numberWithin(legacyById.get("hardwareCost")?.value, firstFallback.unitPrice, 0, 100000000);
    const legacyMonths = numberWithin(legacyById.get("termMonths")?.value, firstFallback.contractMonths, 1, 120);
    const hasSavedPlans = Array.isArray(config.plans) && config.plans.length > 0;
    const planSources = hasSavedPlans
      ? config.plans
      : fallbackPlans.map((plan, planIndex) => (planIndex === 0 ? {
        ...plan,
        gpuModel: config.gpuModel ?? plan.gpuModel,
        defaultDeviceCount: config.defaultDeviceCount ?? legacyById.get("deviceCount")?.value ?? plan.defaultDeviceCount,
        unitPrice: config.unitPrice ?? (legacyPrice === 29800 ? plan.unitPrice : legacyPrice),
        monthlyReturnRate: config.monthlyReturnRate ?? plan.monthlyReturnRate,
        contractMonths: config.contractMonths ?? (legacyMonths === 12 ? plan.contractMonths : legacyMonths),
      } : plan));
    const fallbackById = new Map(fallbackPlans.map((plan) => [plan.id, plan]));
    const usedIds = new Set();
    normalized.calculatorConfig = {
      monthlyLeaseLabel: String(config.monthlyLeaseLabel ?? fallback.calculatorConfig.monthlyLeaseLabel).trim() || fallback.calculatorConfig.monthlyLeaseLabel,
      plans: planSources.map((plan, planIndex) => normalizeCalculatorPlan(plan, fallbackById.get(plan?.id) ?? fallbackPlans[planIndex] ?? firstFallback, planIndex, usedIds)),
    };
    normalized.items = [];
  }
  return normalized;
};

export function normalizeMarketingPageSettings(pageKey, value) {
  const fallback = defaultMarketingPageSettings[pageKey];
  if (!fallback) return value && typeof value === "object" ? clone(value) : {};
  const source = value && typeof value === "object" ? value : {};
  const savedSections = Array.isArray(source.sections) ? source.sections : [];
  const savedById = new Map(savedSections.map((section) => [section.id, section]));
  return {
    ...clone(fallback),
    ...source,
    hero: {
      ...clone(fallback.hero),
      ...(source.hero && typeof source.hero === "object" ? source.hero : {}),
      enabled: source.hero?.enabled ?? fallback.hero.enabled,
      imagePosition: normalizeFocalPosition(source.hero?.imagePosition ?? fallback.hero.imagePosition),
      button: normalizeButton(source.hero?.button, fallback.hero.button),
    },
    sections: fallback.sections.map((section, index) => normalizeSection(savedById.get(section.id), section, index, pageKey)),
  };
}

export const marketingPageNormalizers = Object.fromEntries(
  Object.keys(defaultMarketingPageSettings).map((pageKey) => [pageKey, (value) => normalizeMarketingPageSettings(pageKey, value)]),
);
