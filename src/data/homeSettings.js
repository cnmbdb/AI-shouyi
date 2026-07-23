export const homeIconOptions = [
  ["Buildings", "建筑"], ["Mountains", "山峰"], ["Cube", "立方体"], ["FlowerLotus", "莲花"],
  ["Diamond", "钻石"], ["UserFocus", "用户"], ["ShieldCheck", "安全"], ["Leaf", "叶子"],
  ["HouseLine", "房屋"], ["UsersThree", "用户组"], ["Medal", "奖章"], ["Heart", "爱心"],
  ["Sparkle", "闪光"], ["Cpu", "处理器"], ["HardDrives", "服务器"], ["Wallet", "钱包"],
];

export const defaultHomeSettings = {
  version: 2,
  hero: {
    enabled: true,
    backgroundImage: "/images/hero-galaxy-home.png",
    backgroundPosition: "center 46%",
    foregroundImage: "/images/hero-foreground.png",
    foregroundPosition: "center 46%",
    title: "Galaxy Home",
    heading: "Elegance Above the Skyline",
    description: "Aether Lane curates extraordinary homes in the world's most breathtaking places. Where design, nature and innovation exist in perfect harmony.",
    tagline: "Your Dream Residence Starts Here",
  },
  features: {
    enabled: true,
    items: [
      { id: "feature-sky", icon: "Buildings", title: "Sky Villas", description: "Architectural masterpieces floating above the clouds with infinite panoramic views.", image: "/images/hero-galaxy-home.png", imagePosition: "42% 66%", link: "/estates" },
      { id: "feature-view", icon: "Mountains", title: "Panoramic Views", description: "Wake up to endless horizons and golden sunsets from every vantage.", image: "/images/hero-galaxy-home.png", imagePosition: "8% 38%", link: "/estates" },
      { id: "feature-smart", icon: "Cube", title: "Smart Living", description: "Intelligent home systems designed for comfort, security, and effortless living.", image: "/images/estate-coast.png", imagePosition: "50% 63%", link: "/estates" },
      { id: "feature-private", icon: "FlowerLotus", title: "Private Retreat", description: "Secluded sanctuaries designed for peace, privacy and ultimate rejuvenation.", image: "/images/estate-coast.png", imagePosition: "66% 52%", link: "/estates" },
    ],
  },
  about: {
    enabled: true,
    eyebrow: "About Aether Lane",
    title: "Beyond Luxury,\nAbove Everything",
    description: "We believe a home is more than a place — it's a feeling. Aether Lane is dedicated to crafting one-of-a-kind experiences that uplift, inspire and last for generations.",
    image: "/images/estate-coast.png",
    imagePosition: "57% center",
    buttonLabel: "Learn More About Us",
    buttonLink: "#contact",
    benefits: [
      { id: "benefit-curated", icon: "Diamond", title: "Curated Excellence", description: "Handpicked estates in extraordinary locations around the world.", link: "/estates" },
      { id: "benefit-service", icon: "UserFocus", title: "Bespoke Service", description: "Personalized guidance and white-glove service at every step.", link: "#contact" },
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
      { id: "stat-properties", icon: "HouseLine", value: "320+", label: "Properties Sold", link: "/estates" },
      { id: "stat-clients", icon: "UsersThree", value: "1,240+", label: "Premium Clients", link: "#testimonials" },
      { id: "stat-years", icon: "Medal", value: "18+", label: "Years of Expertise", link: "/blog" },
      { id: "stat-satisfaction", icon: "Heart", value: "98%", label: "Client Satisfaction", link: "#testimonials" },
    ],
  },
  testimonials: {
    enabled: true,
    eyebrow: "What Our Clients Say",
    backgroundImage: "/images/estate-coast.png",
    backgroundPosition: "right center",
    items: [
      { id: "testimonial-isabella", rating: 5, text: "Aether Lane turned our dream into reality. The attention to detail and personalized service were beyond anything we expected.", name: "Isabella M.", role: "Entrepreneur", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=face", link: "#contact" },
      { id: "testimonial-julian", rating: 5, text: "From the first viewing to the final handshake, every step was seamless. Our home is more beautiful than we ever imagined.", name: "Julian R.", role: "Investor", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=face", link: "#contact" },
      { id: "testimonial-sophia", rating: 5, text: "Working with Aether Lane felt like we had known them forever. A level of dedication and honesty rarely seen these days.", name: "Sophia L.", role: "Designer", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=face", link: "#contact" },
    ],
  },
  cta: {
    enabled: true,
    icon: "Sparkle",
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
  if (!saved?.version || !saved.hero) return structuredClone(defaultHomeSettings);
  return mergeSettings(defaultHomeSettings, saved);
}

export function createHomeItem(prefix, template = {}) {
  const id = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return { id, ...template };
}
