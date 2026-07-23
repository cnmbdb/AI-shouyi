import { estateCatalog } from "./estateCatalog.js";

const withId = (prefix, item, index) => ({ id: item.id || `${prefix}-${index + 1}`, ...item });
const clone = (value) => structuredClone(value);

export const defaultNavigationSettings = {
  siteName: "Aether Lane",
  logo: "/images/gpu-logo.svg",
  sticky: true,
  loginLabel: "登录 / 注册",
  items: [
    { id: "nav-home", label: "Home", link: "/", enabled: true },
    { id: "nav-about", label: "About", link: "#about", enabled: true },
    { id: "nav-estates", label: "Estates", link: "/estates", enabled: true },
    { id: "nav-projects", label: "Projects", link: "#projects", enabled: true },
    { id: "nav-blog", label: "Blog", link: "/blog", enabled: true },
    { id: "nav-inquire", label: "Inquire", link: "#contact", enabled: true },
  ],
};

export const defaultFooterSettings = {
  enabled: true,
  siteName: "Aether Lane",
  logo: "/images/gpu-logo.svg",
  description: "Elegance above the skyline.\nExtraordinary homes for\nextraordinary lives.",
  socials: [
    { id: "social-instagram", icon: "Instagram", label: "Instagram", link: "https://instagram.com" },
    { id: "social-facebook", icon: "Facebook", label: "Facebook", link: "https://facebook.com" },
    { id: "social-youtube", icon: "Youtube", label: "YouTube", link: "https://youtube.com" },
    { id: "social-linkedin", icon: "Linkedin", label: "LinkedIn", link: "https://linkedin.com" },
  ],
  columns: [
    {
      id: "footer-navigation",
      title: "Navigation",
      items: clone(defaultNavigationSettings.items),
    },
    {
      id: "footer-company",
      title: "Company",
      items: [
        { id: "company-story", label: "Our Story", link: "#about", enabled: true },
        { id: "company-careers", label: "Careers", link: "#contact", enabled: true },
        { id: "company-media", label: "Media", link: "#projects", enabled: true },
        { id: "company-blog", label: "Blog", link: "/blog", enabled: true },
        { id: "company-contact", label: "Contact", link: "#contact", enabled: true },
      ],
    },
  ],
  contact: {
    title: "Contact",
    phone: "+1 (555) 123-4567",
    email: "hello@aetherlane.com",
    address: "123 Celestial Way,\nSan Francisco, CA 94107",
  },
  image: "/images/hero-galaxy-home.png",
  imagePosition: "52% 53%",
  copyright: "© 2026 Aether Lane. All rights reserved.",
  legalLinks: [
    { id: "legal-privacy", label: "Privacy Policy", link: "#privacy" },
    { id: "legal-terms", label: "Terms of Service", link: "#terms" },
  ],
};

export const defaultProductSettings = {
  hero: {
    enabled: true,
    image: "/images/gpu-carousel-card.png",
    imagePosition: "center center",
    title: "Explore Our Estates",
    description: "Discover extraordinary properties in the world's most breathtaking locations.",
    homeLabel: "Home",
    currentLabel: "Estates",
  },
  browser: {
    enabled: true,
    filterTitle: "Filter Estates",
    resultTitle: "Found {count} Exceptional Estates",
    sortLabel: "Sort by:",
    clearLabel: "Clear Filters",
    emptyTitle: "No estates match these filters.",
    defaultSort: "high",
    showFilters: true,
    showSort: true,
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
    backgroundPosition: "center center",
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
    items: items.map((item, index) => withId("nav", { enabled: true, ...item }, index)),
  };
}

export function normalizeFooterSettings(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    ...clone(defaultFooterSettings),
    ...source,
    contact: { ...clone(defaultFooterSettings.contact), ...(source.contact ?? {}), phone: source.phone ?? source.contact?.phone ?? defaultFooterSettings.contact.phone, email: source.email ?? source.contact?.email ?? defaultFooterSettings.contact.email },
    socials: (Array.isArray(source.socials) ? source.socials : clone(defaultFooterSettings.socials)).map((item, index) => withId("social", item, index)),
    columns: (Array.isArray(source.columns) ? source.columns : clone(defaultFooterSettings.columns)).map((column, columnIndex) => withId("footer-column", {
      ...column,
      items: (Array.isArray(column.items) ? column.items : []).map((item, itemIndex) => withId(`footer-${columnIndex}`, { enabled: true, ...item }, itemIndex)),
    }, columnIndex)),
    legalLinks: (Array.isArray(source.legalLinks) ? source.legalLinks : clone(defaultFooterSettings.legalLinks)).map((item, index) => withId("legal", item, index)),
  };
}

export function normalizeProductSettings(value) {
  const source = value && typeof value === "object" ? value : {};
  const productDefaults = new Map(defaultProductSettings.items.map((item) => [item.id, item]));
  const savedHeroImage = source.hero?.image;
  const normalizedHeroImage = ["/images/estates-hero.png", "/images/estates-hero-game-cards.png"].includes(savedHeroImage) ? defaultProductSettings.hero.image : savedHeroImage;
  return {
    ...clone(defaultProductSettings),
    ...source,
    hero: { ...clone(defaultProductSettings.hero), ...(source.hero ?? {}), image: normalizedHeroImage ?? defaultProductSettings.hero.image, title: source.title ?? source.hero?.title ?? defaultProductSettings.hero.title, description: source.subtitle ?? source.hero?.description ?? defaultProductSettings.hero.description },
    browser: { ...clone(defaultProductSettings.browser), ...(source.browser ?? {}), defaultSort: ["high", "low"].includes(source.defaultSort) ? source.defaultSort : source.browser?.defaultSort ?? defaultProductSettings.browser.defaultSort },
    items: (Array.isArray(source.items) ? source.items : clone(defaultProductSettings.items)).map((item, index) => {
      const fallback = productDefaults.get(item.id) ?? {};
      return withId("product", {
        enabled: true,
        ...item,
        gpuModel: item.gpuModel ?? fallback.gpuModel ?? String(item.beds ?? "GPU 型号"),
        vram: item.vram ?? fallback.vram ?? String(item.baths ?? "显存"),
        hostingTerm: item.hostingTerm ?? fallback.hostingTerm ?? String(item.area ?? "12 个月"),
        imagePosition: item.imagePosition ?? item.position ?? "center center",
      }, index);
    }),
    cta: {
      ...clone(defaultProductSettings.cta),
      ...(source.cta ?? {}),
      primaryButton: { ...clone(defaultProductSettings.cta.primaryButton), ...(source.cta?.primaryButton ?? {}) },
      secondaryButton: { ...clone(defaultProductSettings.cta.secondaryButton), ...(source.cta?.secondaryButton ?? {}) },
    },
  };
}

export function normalizeBlogSettings(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    ...clone(defaultBlogSettings),
    ...source,
    hero: { ...clone(defaultBlogSettings.hero), ...(source.hero ?? {}), title: source.title ?? source.hero?.title ?? defaultBlogSettings.hero.title, description: source.subtitle ?? source.hero?.description ?? defaultBlogSettings.hero.description },
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
