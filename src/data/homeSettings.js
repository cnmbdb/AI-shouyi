import { normalizeFocalPosition } from "../lib/focalPosition.js";

export const homeIconOptions = [
  ["GraphicsCard", "GPU 显卡"], ["Cpu", "算力芯片"], ["Circuitry", "计算电路"], ["HardDrives", "服务器"],
  ["DesktopTower", "算力中心"], ["CloudArrowUp", "云端托管"], ["Gauge", "运行效率"], ["ChartLineUp", "收益增长"],
  ["CurrencyCircleDollar", "收益结算"], ["Coins", "Token 产出"], ["Wallet", "资金账户"], ["Handshake", "合作代理"],
  ["ShieldCheck", "安全保障"], ["UsersThree", "用户服务"], ["Leaf", "绿色能源"],
];

const legacyHomeIconAliases = {
  Buildings: "GraphicsCard",
  Mountains: "CloudArrowUp",
  Cube: "Circuitry",
  FlowerLotus: "Cpu",
  Diamond: "GraphicsCard",
  UserFocus: "UsersThree",
  HouseLine: "DesktopTower",
  Medal: "Gauge",
  Heart: "ChartLineUp",
  Sparkle: "Handshake",
};

const normalizeHomeIcon = (icon, fallback = "Cpu") => legacyHomeIconAliases[icon] ?? icon ?? fallback;
const computeHero2k = "/images/home-compute-hero-2k.png";
const legacyComputeHeroUpload = "/site-content/hero-bg/1787422956900-b75ad73a-419e-4860-b5ba-079153679abd.png";
const normalizeComputeHeroAsset = (value) => String(value || "").includes(legacyComputeHeroUpload) ? computeHero2k : value;

export const defaultHomeSettings = {
  version: 7,
  hero: {
    enabled: true,
    desktopHeight: 690,
    desktopBackgroundFit: "cover",
    desktopBackgroundZoom: 100,
    mobileHeight: 560,
    mobileWidthPercent: 100,
    mobileAspectRatio: 75,
    mobileBackgroundFit: "cover",
    mobileBackgroundZoom: 100,
    backgroundImage: computeHero2k,
    backgroundPosition: "50% 46%",
    mobileBackgroundImage: "",
    mobileBackgroundPosition: "50% 46%",
    foregroundImage: "/images/hero-foreground.png",
    foregroundPosition: "50% 46%",
    title: "Galaxy Home",
    heading: "Elegance Above the Skyline",
    description: "Aether Lane curates extraordinary homes in the world's most breathtaking places. Where design, nature and innovation exist in perfect harmony.",
    tagline: "Your Dream Residence Starts Here",
  },
  features: {
    enabled: true,
    mobileColumns: 2,
    mobileCardHeight: 250,
    mobileWidthPercent: 92,
    mobileCardAspectRatio: 142,
    items: [
      { id: "feature-sky", icon: "GraphicsCard", title: "Sky Villas", description: "Architectural masterpieces floating above the clouds with infinite panoramic views.", image: "/images/hero-galaxy-home.png", imagePosition: "42% 66%", link: "/estates" },
      { id: "feature-view", icon: "CloudArrowUp", title: "Panoramic Views", description: "Wake up to endless horizons and golden sunsets from every vantage.", image: "/images/hero-galaxy-home.png", imagePosition: "8% 38%", link: "/estates" },
      { id: "feature-smart", icon: "Circuitry", title: "Smart Living", description: "Intelligent home systems designed for comfort, security, and effortless living.", image: "/images/estate-coast.png", imagePosition: "50% 63%", link: "/estates" },
      { id: "feature-private", icon: "Cpu", title: "Private Retreat", description: "Secluded sanctuaries designed for peace, privacy and ultimate rejuvenation.", image: "/images/estate-coast.png", imagePosition: "66% 52%", link: "/estates" },
    ],
  },
  about: {
    enabled: true,
    eyebrow: "About Aether Lane",
    title: "Beyond Luxury,\nAbove Everything",
    description: "We believe a home is more than a place — it's a feeling. Aether Lane is dedicated to crafting one-of-a-kind experiences that uplift, inspire and last for generations.",
    image: "/images/estate-coast.png",
    imagePosition: "57% 50%",
    buttonLabel: "Learn More About Us",
    buttonLink: "#contact",
    benefits: [
      { id: "benefit-curated", icon: "GraphicsCard", title: "Curated Excellence", description: "Handpicked estates in extraordinary locations around the world.", link: "/estates" },
      { id: "benefit-service", icon: "UsersThree", title: "Bespoke Service", description: "Personalized guidance and white-glove service at every step.", link: "#contact" },
      { id: "benefit-secure", icon: "ShieldCheck", title: "Trusted & Secure", description: "Transparent processes and complete peace of mind for your investment.", link: "#contact" },
      { id: "benefit-green", icon: "Leaf", title: "Sustainable Living", description: "Eco-conscious design that supports a better future generation.", link: "/blog" },
    ],
  },
  featured: {
    enabled: true,
    eyebrow: "Featured Estates",
    title: "Exceptional Homes. Extraordinary Places.",
    buttonLabel: "View All Estates",
    buttonLink: "/estates",
    items: [
      { id: "estate-celestia", tag: "Sky Villa", title: "Celestia Peak", location: "Woning Heights", price: "$12.8M", image: "/images/hero-galaxy-home.png", imagePosition: "50% 57%", link: "/estates" },
      { id: "estate-azure", tag: "Coast Estate", title: "Azure Horizon", location: "Malibu, California", price: "$9.4M", image: "/images/estate-coast.png", imagePosition: "50% 55%", link: "/estates" },
      { id: "estate-luna", tag: "Mountain Retreat", title: "Luna Ridge", location: "Rocky Alps", price: "$7.6M", image: "/images/hero-galaxy-home.png", imagePosition: "62% 45%", link: "/estates" },
    ],
  },
  stats: {
    enabled: true,
    items: [
      { id: "stat-properties", icon: "DesktopTower", value: "320+", label: "Properties Sold", link: "/estates" },
      { id: "stat-clients", icon: "UsersThree", value: "1,240+", label: "Premium Clients", link: "#testimonials" },
      { id: "stat-years", icon: "Gauge", value: "18+", label: "Years of Expertise", link: "/blog" },
      { id: "stat-satisfaction", icon: "ChartLineUp", value: "98%", label: "Client Satisfaction", link: "#testimonials" },
    ],
  },
  testimonials: {
    enabled: true,
    eyebrow: "What Our Clients Say",
    backgroundImage: "/images/estate-coast.png",
    backgroundPosition: "100% 50%",
    items: [
      { id: "testimonial-isabella", rating: 5, text: "Aether Lane turned our dream into reality. The attention to detail and personalized service were beyond anything we expected.", name: "Isabella M.", role: "Entrepreneur", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=face", avatarPosition: "50% 50%", link: "#contact" },
      { id: "testimonial-julian", rating: 5, text: "From the first viewing to the final handshake, every step was seamless. Our home is more beautiful than we ever imagined.", name: "Julian R.", role: "Investor", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=face", avatarPosition: "50% 50%", link: "#contact" },
      { id: "testimonial-sophia", rating: 5, text: "Working with Aether Lane felt like we had known them forever. A level of dedication and honesty rarely seen these days.", name: "Sophia L.", role: "Designer", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=face", avatarPosition: "50% 50%", link: "#contact" },
    ],
  },
  cta: {
    enabled: true,
    icon: "Handshake",
    title: "Ready to Find Your Galaxy Home?",
    description: "Book a private viewing or explore our exclusive estates.",
    primaryButton: { label: "Book a Private Viewing", link: "#contact" },
    secondaryButton: { label: "Explore Estates", link: "/estates" },
  },
};

const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);

function mergeSettings(defaults, saved) {
  if (!isObject(saved)) return structuredClone(defaults);
  return Object.fromEntries(Object.entries(defaults).map(([key, value]) => {
    if (Array.isArray(value)) return [key, Array.isArray(saved[key]) ? saved[key] : structuredClone(value)];
    if (isObject(value)) return [key, mergeSettings(value, saved[key])];
    return [key, saved[key] ?? value];
  }));
}

export function normalizeHomeSettings(saved) {
  const normalized = !saved?.version || !saved.hero ? structuredClone(defaultHomeSettings) : mergeSettings(defaultHomeSettings, saved);
  const savedVersion = Number(saved?.version) || 0;
  const hadPreviousMobileHeroDefaults = Number(saved?.hero?.mobileHeight) === 760 && saved?.hero?.mobileBackgroundFit === "contain";
  if (!saved?.hero?.mobileHeight || hadPreviousMobileHeroDefaults) normalized.hero.mobileHeight = defaultHomeSettings.hero.mobileHeight;
  if (!saved?.hero?.mobileBackgroundFit || hadPreviousMobileHeroDefaults) normalized.hero.mobileBackgroundFit = defaultHomeSettings.hero.mobileBackgroundFit;
  if (!saved?.hero?.mobileBackgroundPosition) normalized.hero.mobileBackgroundPosition = normalized.hero.backgroundPosition;
  normalized.hero.backgroundImage = normalizeComputeHeroAsset(normalized.hero.backgroundImage);
  normalized.hero.mobileBackgroundImage = normalizeComputeHeroAsset(normalized.hero.mobileBackgroundImage);
  normalized.hero.desktopHeight = Math.max(480, Math.min(960, Number(normalized.hero.desktopHeight) || 690));
  normalized.hero.mobileHeight = Math.max(320, Math.min(900, Number(normalized.hero.mobileHeight) || 560));
  normalized.hero.mobileWidthPercent = Math.max(70, Math.min(100, Number(normalized.hero.mobileWidthPercent) || 100));
  const savedMobileAspectRatio = Number(saved?.hero?.mobileAspectRatio);
  const migratedComputeHeroRatio = normalized.hero.mobileBackgroundFit === "contain"
    && savedMobileAspectRatio === 90
    && (savedVersion < 7 || Number(saved?.hero?.mobileHeight) === 350);
  if (migratedComputeHeroRatio) normalized.hero.mobileHeight = defaultHomeSettings.hero.mobileHeight;
  normalized.hero.mobileAspectRatio = Math.max(60, Math.min(260, migratedComputeHeroRatio
    ? 75
    : savedMobileAspectRatio || Math.round((normalized.hero.mobileHeight / 390) * 100)));
  normalized.hero.desktopBackgroundFit = ["cover", "contain"].includes(normalized.hero.desktopBackgroundFit) ? normalized.hero.desktopBackgroundFit : "cover";
  normalized.hero.mobileBackgroundFit = ["cover", "contain"].includes(normalized.hero.mobileBackgroundFit) ? normalized.hero.mobileBackgroundFit : "cover";
  normalized.hero.desktopBackgroundZoom = Math.max(100, Math.min(250, Number(normalized.hero.desktopBackgroundZoom) || 100));
  normalized.hero.mobileBackgroundZoom = Math.max(100, Math.min(250, Number(normalized.hero.mobileBackgroundZoom) || 100));
  normalized.hero.mobileBackgroundImage = String(normalized.hero.mobileBackgroundImage || "").trim();
  normalized.version = defaultHomeSettings.version;
  normalized.features.mobileColumns = Math.max(1, Math.min(2, Number(normalized.features.mobileColumns) || 2));
  normalized.features.mobileCardHeight = Math.max(180, Math.min(420, Number(normalized.features.mobileCardHeight) || 250));
  normalized.features.mobileWidthPercent = Math.max(70, Math.min(100, Number(normalized.features.mobileWidthPercent) || 92));
  const referenceCardWidth = (360 - (normalized.features.mobileColumns - 1) * 8) / normalized.features.mobileColumns;
  normalized.features.mobileCardAspectRatio = Math.max(80, Math.min(260, Number(saved?.features?.mobileCardAspectRatio) || Math.round((normalized.features.mobileCardHeight / referenceCardWidth) * 100)));
  normalized.hero.backgroundPosition = normalizeFocalPosition(normalized.hero.backgroundPosition);
  normalized.hero.mobileBackgroundPosition = normalizeFocalPosition(normalized.hero.mobileBackgroundPosition);
  normalized.hero.foregroundPosition = normalizeFocalPosition(normalized.hero.foregroundPosition);
  normalized.features.items = normalized.features.items.map((item) => ({ ...item, icon: normalizeHomeIcon(item.icon, "GraphicsCard"), imagePosition: normalizeFocalPosition(item.imagePosition) }));
  normalized.about.imagePosition = normalizeFocalPosition(normalized.about.imagePosition);
  normalized.about.benefits = normalized.about.benefits.map((item) => ({ ...item, icon: normalizeHomeIcon(item.icon, "ShieldCheck") }));
  normalized.featured.items = normalized.featured.items.map((item) => ({ ...item, imagePosition: normalizeFocalPosition(item.imagePosition) }));
  normalized.stats.items = normalized.stats.items.map((item) => ({ ...item, icon: normalizeHomeIcon(item.icon, "ChartLineUp") }));
  normalized.testimonials.backgroundPosition = normalizeFocalPosition(normalized.testimonials.backgroundPosition);
  normalized.testimonials.items = normalized.testimonials.items.map((item) => ({ ...item, avatarPosition: normalizeFocalPosition(item.avatarPosition) }));
  normalized.cta.icon = normalizeHomeIcon(normalized.cta.icon, "Handshake");
  return normalized;
}

export function createHomeItem(prefix, template = {}) {
  const id = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return { id, ...template };
}
