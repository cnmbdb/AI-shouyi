import { estateCatalog } from "./estateCatalog.js";
import { normalizeFocalPosition } from "../lib/focalPosition.js";
import { normalizeManagedLink } from "../lib/managedLink.js";

const withId = (prefix, item, index) => ({ id: item.id || `${prefix}-${index + 1}`, ...item });
const clone = (value) => structuredClone(value);
const numberWithin = (value, fallback, min, max) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
};

const legacyNavigationLabels = {
  Home: "首页",
  About: "关于我们",
  Estates: "算力产品",
  Projects: "精选项目",
  Blog: "博客",
  Inquire: "联系我们",
};

const legacyFooterLabels = {
  Navigation: "网站导航",
  Company: "关于平台",
  "Our Story": "品牌故事",
  Careers: "加入我们",
  Media: "媒体中心",
  Blog: "博客",
  Contact: "联系我们",
  "Privacy Policy": "隐私政策",
  "Terms of Service": "服务条款",
};

const legacySharedChromeLabels = { ...legacyNavigationLabels, ...legacyFooterLabels };

const localizeLegacyLabel = (label, translations) => translations[label] ?? label;

const defaultProductHeroCards = Array.from({ length: 5 }, (_, index) => ({
  id: `hero-card-${index + 1}`,
  image: "/images/gpu2.png",
  imagePosition: "50% 50%",
  link: "/estates",
}));

export const defaultNavigationSettings = {
  siteName: "Aether Lane",
  logo: "/images/gpu-logo.svg",
  sticky: true,
  loginLabel: "登录 / 注册",
  items: [
    { id: "nav-home", label: "首页", link: "/", enabled: true },
    { id: "nav-about", label: "关于我们", link: "#about", enabled: true },
    { id: "nav-estates", label: "算力产品", link: "/estates", enabled: true },
    { id: "nav-projects", label: "精选项目", link: "#projects", enabled: true },
    { id: "nav-blog", label: "博客", link: "/blog", enabled: true },
    { id: "nav-inquire", label: "联系我们", link: "#contact", enabled: true },
  ],
};

export const defaultFooterSettings = {
  enabled: true,
  siteName: "Aether Lane",
  logo: "/images/gpu-logo.svg",
  description: "稳定的算力托管，透明的收益管理。\n连接设备、连接需求、连接价值。",
  socials: [
    { id: "social-instagram", icon: "Instagram", label: "Instagram", link: "https://instagram.com" },
    { id: "social-facebook", icon: "Facebook", label: "Facebook", link: "https://facebook.com" },
    { id: "social-youtube", icon: "Youtube", label: "YouTube", link: "https://youtube.com" },
    { id: "social-linkedin", icon: "Linkedin", label: "LinkedIn", link: "https://linkedin.com" },
  ],
  columns: [
    {
      id: "footer-navigation",
      title: "网站导航",
      items: clone(defaultNavigationSettings.items),
    },
    {
      id: "footer-company",
      title: "关于平台",
      items: [
        { id: "company-story", label: "品牌故事", link: "#about", enabled: true },
        { id: "company-careers", label: "加入我们", link: "#contact", enabled: true },
        { id: "company-media", label: "媒体中心", link: "#projects", enabled: true },
        { id: "company-blog", label: "博客", link: "/blog", enabled: true },
        { id: "company-contact", label: "联系我们", link: "#contact", enabled: true },
      ],
    },
  ],
  contact: {
    title: "联系我们",
    phone: "+1 (555) 123-4567",
    email: "hello@aetherlane.com",
    address: "美国加利福尼亚州旧金山\n天际路 123 号，邮编 94107",
  },
  image: "/images/hero-galaxy-home.png",
  imagePosition: "52% 53%",
  copyright: "© 2026 Aether Lane. 保留所有权利。",
  legalLinks: [
    { id: "legal-privacy", label: "隐私政策", link: "#privacy" },
    { id: "legal-terms", label: "服务条款", link: "#terms" },
  ],
};

export const defaultProductSettings = {
  hero: {
    enabled: true,
    desktopHeight: 737,
    mobileHeight: 520,
    desktopCardWidth: 298,
    mobileCardWidth: 190,
    intervalSeconds: 4.5,
    cards: clone(defaultProductHeroCards),
  },
  browser: {
    enabled: true,
    filterTitle: "筛选算力",
    filterDescription: "按部署区域、GPU、显存和租用周期匹配",
    resultTitle: "找到 {count} 个可用算力产品",
    sortLabel: "排序",
    clearLabel: "清除筛选",
    emptyTitle: "暂无符合条件的算力产品",
    regionLabel: "部署区域",
    allRegionsLabel: "全部区域",
    gpuLabel: "GPU 型号",
    allGpuLabel: "全部型号",
    vramLabel: "显存容量",
    allVramLabel: "全部容量",
    termLabel: "租用周期",
    anyTermLabel: "全部周期",
    priceLabel: "价格上限",
    unlimitedPriceLabel: "不限",
    sortHighLabel: "价格从高到低",
    sortLowLabel: "价格从低到高",
    defaultSort: "high",
    showFilters: true,
    showSort: true,
    showRegionFilter: true,
    showGpuFilter: true,
    showVramFilter: true,
    showTermFilter: true,
    showPriceFilter: true,
  },
  items: estateCatalog.map((item, index) => ({
    id: `product-${index + 1}`,
    ...item,
    imagePosition: item.position,
    link: "/estates",
    enabled: true,
  })),
  cta: {
    enabled: true,
    title: "Can't Find What You're Looking For?",
    description: "Let our experts help you discover your perfect property.",
    primaryButton: { label: "Schedule a Consultation", link: "#contact" },
    secondaryButton: { label: "View Custom Listings", link: "#contact" },
  },
};

export const defaultBlogSettings = {
  hero: {
    enabled: true,
    backgroundImage: "",
    backgroundPosition: "50% 50%",
    title: "Stories Above\nthe Skyline",
    description: "Curated perspectives on design, architecture, luxury living, travel, and the art of extraordinary spaces.",
  },
  featured: {
    enabled: true,
    label: "Featured",
    buttonLabel: "Read Article",
  },
  categories: {
    enabled: true,
    items: [
      { id: "category-all", label: "All", value: "All", icon: "SquaresFour", enabled: true },
      { id: "category-architecture", label: "Architecture", value: "Architecture", icon: "Buildings", enabled: true },
      { id: "category-interiors", label: "Interiors", value: "Interiors", icon: "Armchair", enabled: true },
      { id: "category-lifestyle", label: "Lifestyle", value: "Lifestyle", icon: "FlowerLotus", enabled: true },
      { id: "category-market", label: "Market Insights", value: "Market Insights", icon: "ChartLineUp", enabled: true },
      { id: "category-travel", label: "Travel", value: "Travel", icon: "AirplaneTilt", enabled: true },
    ],
  },
  articles: {
    enabled: true,
    emptyText: "More {category} stories are being curated.",
  },
  editors: {
    enabled: true,
    title: "Editor's Picks",
    description: "Essential reads handpicked by our editorial team.",
    buttonLabel: "View All Articles",
  },
  newsletter: {
    enabled: true,
    title: "Join Our Journal",
    description: "Stay inspired with curated stories, insights, and exclusive updates.",
    placeholder: "Enter your email",
    buttonLabel: "Subscribe",
    privacyText: "No spam. Unsubscribe anytime.",
  },
};

export function normalizeNavigationSettings(value) {
  const source = value && typeof value === "object" ? value : {};
  let items = Array.isArray(source.items) ? source.items : clone(defaultNavigationSettings.items);
  if (!Array.isArray(source.items) && source.showBlog === false) {
    items = items.map((item) => item.id === "nav-blog" ? { ...item, enabled: false } : item);
  }
  return {
    ...clone(defaultNavigationSettings),
    ...source,
    loginLabel: source.loginLabel === "Login / Register" ? defaultNavigationSettings.loginLabel : (source.loginLabel ?? defaultNavigationSettings.loginLabel),
    items: items.map((item, index) => withId("nav", { enabled: true, ...item, label: localizeLegacyLabel(item.label, legacyNavigationLabels) }, index)),
  };
}

export function normalizeFooterSettings(value) {
  const source = value && typeof value === "object" ? value : {};
  const legacyDescription = "Elegance above the skyline.\nExtraordinary homes for\nextraordinary lives.";
  const legacyAddress = "123 Celestial Way,\nSan Francisco, CA 94107";
  const sourceContact = source.contact ?? {};
  return {
    ...clone(defaultFooterSettings),
    ...source,
    description: source.description === legacyDescription ? defaultFooterSettings.description : (source.description ?? defaultFooterSettings.description),
    copyright: source.copyright === "© 2026 Aether Lane. All rights reserved." ? defaultFooterSettings.copyright : (source.copyright ?? defaultFooterSettings.copyright),
    contact: {
      ...clone(defaultFooterSettings.contact),
      ...sourceContact,
      title: localizeLegacyLabel(sourceContact.title ?? defaultFooterSettings.contact.title, legacyFooterLabels),
      phone: source.phone ?? sourceContact.phone ?? defaultFooterSettings.contact.phone,
      email: source.email ?? sourceContact.email ?? defaultFooterSettings.contact.email,
      address: sourceContact.address === legacyAddress ? defaultFooterSettings.contact.address : (sourceContact.address ?? defaultFooterSettings.contact.address),
    },
    socials: (Array.isArray(source.socials) ? source.socials : clone(defaultFooterSettings.socials)).map((item, index) => withId("social", item, index)),
    columns: (Array.isArray(source.columns) ? source.columns : clone(defaultFooterSettings.columns)).map((column, columnIndex) => withId("footer-column", {
      ...column,
      title: localizeLegacyLabel(column.title, legacyFooterLabels),
      items: (Array.isArray(column.items) ? column.items : []).map((item, itemIndex) => withId(`footer-${columnIndex}`, { enabled: true, ...item, label: localizeLegacyLabel(item.label, legacySharedChromeLabels) }, itemIndex)),
    }, columnIndex)),
    legalLinks: (Array.isArray(source.legalLinks) ? source.legalLinks : clone(defaultFooterSettings.legalLinks)).map((item, index) => withId("legal", { ...item, label: localizeLegacyLabel(item.label, legacyFooterLabels) }, index)),
    imagePosition: normalizeFocalPosition(source.imagePosition ?? defaultFooterSettings.imagePosition),
  };
}

export function normalizeProductSettings(value) {
  const source = value && typeof value === "object" ? value : {};
  const normalizedSource = clone(source);
  delete normalizedSource.title;
  delete normalizedSource.subtitle;
  const normalizedHero = normalizedSource.hero && typeof normalizedSource.hero === "object" ? normalizedSource.hero : {};
  delete normalizedHero.title;
  delete normalizedHero.description;
  delete normalizedHero.homeLabel;
  delete normalizedHero.currentLabel;
  const legacyLightImage = normalizedHero.lightImage ?? defaultProductHeroCards[0].image;
  const legacyLightImagePosition = normalizedHero.lightImagePosition ?? defaultProductHeroCards[0].imagePosition;
  const savedLegacyDarkImage = normalizedHero.image;
  const legacySharedImage = normalizedHero.lightImage ?? (["/images/estates-hero.png", "/images/estates-hero-game-cards.png", "/images/gpu-carousel-card.png"].includes(savedLegacyDarkImage)
    ? defaultProductHeroCards[0].image
    : savedLegacyDarkImage ?? legacyLightImage);
  const legacySharedImagePosition = normalizedHero.lightImagePosition ?? normalizedHero.imagePosition ?? legacyLightImagePosition;
  const savedHeroCards = Array.isArray(normalizedHero.cards) ? normalizedHero.cards : [];
  const normalizedHeroCards = defaultProductHeroCards.map((fallback, index) => {
    const savedCard = savedHeroCards[index] ?? {};
    return {
      id: savedCard.id || fallback.id,
      image: savedCard.image ?? savedCard.lightImage ?? legacySharedImage,
      imagePosition: normalizeFocalPosition(savedCard.imagePosition ?? savedCard.lightImagePosition ?? legacySharedImagePosition),
      link: normalizeManagedLink(savedCard.link ?? fallback.link),
    };
  });
  delete normalizedHero.image;
  delete normalizedHero.imagePosition;
  delete normalizedHero.lightImage;
  delete normalizedHero.lightImagePosition;
  const productDefaults = new Map(defaultProductSettings.items.map((item) => [item.id, item]));
  return {
    ...clone(defaultProductSettings),
    ...normalizedSource,
    hero: {
      ...clone(defaultProductSettings.hero),
      ...normalizedHero,
      desktopHeight: numberWithin(normalizedHero.desktopHeight, defaultProductSettings.hero.desktopHeight, 520, 960),
      mobileHeight: numberWithin(normalizedHero.mobileHeight, defaultProductSettings.hero.mobileHeight, 420, 760),
      desktopCardWidth: numberWithin(normalizedHero.desktopCardWidth, defaultProductSettings.hero.desktopCardWidth, 180, 420),
      mobileCardWidth: numberWithin(normalizedHero.mobileCardWidth, defaultProductSettings.hero.mobileCardWidth, 140, 280),
      intervalSeconds: numberWithin(normalizedHero.intervalSeconds, defaultProductSettings.hero.intervalSeconds, 2, 15),
      cards: normalizedHeroCards,
    },
    browser: (() => {
      const savedBrowser = source.browser && typeof source.browser === "object" ? source.browser : {};
      const legacyCopy = {
        filterTitle: savedBrowser.filterTitle === "Filter Estates" ? defaultProductSettings.browser.filterTitle : savedBrowser.filterTitle,
        resultTitle: savedBrowser.resultTitle === "Found {count} Exceptional Estates" ? defaultProductSettings.browser.resultTitle : savedBrowser.resultTitle,
        sortLabel: savedBrowser.sortLabel === "Sort by:" ? defaultProductSettings.browser.sortLabel : savedBrowser.sortLabel,
        clearLabel: savedBrowser.clearLabel === "Clear Filters" ? defaultProductSettings.browser.clearLabel : savedBrowser.clearLabel,
        emptyTitle: savedBrowser.emptyTitle === "No estates match these filters." ? defaultProductSettings.browser.emptyTitle : savedBrowser.emptyTitle,
      };
      return {
        ...clone(defaultProductSettings.browser),
        ...savedBrowser,
        ...Object.fromEntries(Object.entries(legacyCopy).filter(([, value]) => value !== undefined)),
        defaultSort: ["high", "low"].includes(source.defaultSort) ? source.defaultSort : savedBrowser.defaultSort ?? defaultProductSettings.browser.defaultSort,
      };
    })(),
    items: (Array.isArray(source.items) ? source.items : clone(defaultProductSettings.items)).map((item, index) => {
      const fallback = productDefaults.get(item.id) ?? {};
      return withId("product", {
        enabled: true,
        ...item,
        gpuModel: item.gpuModel ?? fallback.gpuModel ?? String(item.beds ?? "GPU 型号"),
        vram: item.vram ?? fallback.vram ?? String(item.baths ?? "显存"),
        hostingTerm: item.hostingTerm ?? fallback.hostingTerm ?? String(item.area ?? "12 个月"),
        imagePosition: normalizeFocalPosition(item.imagePosition ?? item.position),
        link: normalizeManagedLink(item.link ?? fallback.link ?? "/estates"),
      }, index);
    }),
    cta: {
      ...clone(defaultProductSettings.cta),
      ...(source.cta ?? {}),
      primaryButton: {
        ...clone(defaultProductSettings.cta.primaryButton),
        ...(source.cta?.primaryButton ?? {}),
        link: normalizeManagedLink(source.cta?.primaryButton?.link ?? defaultProductSettings.cta.primaryButton.link),
      },
      secondaryButton: {
        ...clone(defaultProductSettings.cta.secondaryButton),
        ...(source.cta?.secondaryButton ?? {}),
        link: normalizeManagedLink(source.cta?.secondaryButton?.link ?? defaultProductSettings.cta.secondaryButton.link),
      },
    },
  };
}

export function normalizeBlogSettings(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    ...clone(defaultBlogSettings),
    ...source,
    hero: { ...clone(defaultBlogSettings.hero), ...(source.hero ?? {}), backgroundPosition: normalizeFocalPosition(source.hero?.backgroundPosition ?? defaultBlogSettings.hero.backgroundPosition), title: source.title ?? source.hero?.title ?? defaultBlogSettings.hero.title, description: source.subtitle ?? source.hero?.description ?? defaultBlogSettings.hero.description },
    featured: { ...clone(defaultBlogSettings.featured), ...(source.featured ?? {}), label: source.featuredLabel ?? source.featured?.label ?? defaultBlogSettings.featured.label },
    categories: {
      ...clone(defaultBlogSettings.categories),
      ...(source.categories ?? {}),
      items: (Array.isArray(source.categories?.items) ? source.categories.items : clone(defaultBlogSettings.categories.items)).map((item, index) => withId("category", { enabled: true, ...item }, index)),
    },
    articles: { ...clone(defaultBlogSettings.articles), ...(source.articles ?? {}) },
    editors: { ...clone(defaultBlogSettings.editors), ...(source.editors ?? {}) },
    newsletter: { ...clone(defaultBlogSettings.newsletter), ...(source.newsletter ?? {}), enabled: source.showNewsletter ?? source.newsletter?.enabled ?? defaultBlogSettings.newsletter.enabled, title: source.newsletterTitle ?? source.newsletter?.title ?? defaultBlogSettings.newsletter.title },
  };
}

export const defaultSiteSettings = {
  navigation: defaultNavigationSettings,
  footer: defaultFooterSettings,
  products: defaultProductSettings,
  blog: defaultBlogSettings,
};

export const siteSettingNormalizers = {
  navigation: normalizeNavigationSettings,
  footer: normalizeFooterSettings,
  products: normalizeProductSettings,
  blog: normalizeBlogSettings,
};
