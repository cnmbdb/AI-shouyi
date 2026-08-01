import { preload } from "react-dom";
import {
  ArrowRight,
  ArrowsClockwise,
  Buildings,
  Calculator,
  ChartLineUp,
  ChatCircleText,
  CheckCircle,
  Clock,
  Coins,
  Cpu,
  EnvelopeSimple,
  FileText,
  Gauge,
  GlobeHemisphereWest,
  Handshake,
  HardDrives,
  Headset,
  Lightning,
  MapPin,
  Phone,
  Question,
  RocketLaunch,
  ShieldCheck,
  Storefront,
  UserPlus,
  UsersThree,
  Wrench,
} from "@phosphor-icons/react";
import { assetUrl, preloadImageUrl, responsiveImageProps } from "../lib/assets.js";
import { resolveManagedLink } from "../lib/managedLink.js";

const iconMap = {
  ArrowsClockwise,
  Buildings,
  Calculator,
  ChartLineUp,
  ChatCircleText,
  CheckCircle,
  Clock,
  Coins,
  Cpu,
  EnvelopeSimple,
  FileText,
  Gauge,
  GlobeHemisphereWest,
  Handshake,
  HardDrives,
  Headset,
  Lightning,
  MapPin,
  Phone,
  Question,
  RocketLaunch,
  ShieldCheck,
  Storefront,
  UserPlus,
  UsersThree,
  Wrench,
};

export const PageIcon = ({ name, ...props }) => {
  const Icon = iconMap[name] ?? Cpu;
  return <Icon {...props} />;
};

export const getMarketingSection = (settings, id) => settings.sections.find((section) => section.id === id);

export function openMarketingLink(link, onNavigate, onNotice) {
  const resolved = resolveManagedLink(link);
  if (resolved.kind === "empty") return;
  if (resolved.kind === "section") {
    document.querySelector(resolved.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (resolved.kind === "internal") {
    onNavigate(resolved.target);
    return;
  }
  if (resolved.kind === "external") {
    window.location.assign(resolved.target);
    return;
  }
  onNotice("链接格式不正确，仅支持站内路径、邮件、电话或完整 HTTPS 地址");
}

export function MarketingAction({ button, onNavigate, onNotice, variant = "primary", className = "" }) {
  if (!button?.label) return null;
  return (
    <button className={`managed-action managed-action-${variant} ${className}`.trim()} type="button" onClick={() => openMarketingLink(button.link, onNavigate, onNotice)}>
      <span>{button.label}</span>
      <ArrowRight weight="bold" />
    </button>
  );
}
export function MarketingImage({ section, eager = false, sizes = "(max-width: 760px) 100vw, 50vw", className = "" }) {
  if (!section?.image) return <div className={`managed-image-placeholder ${className}`}><PageIcon name={section?.icon} weight="thin" /></div>;
  return (
    <div className={`managed-image ${className}`.trim()}>
      <img
        {...responsiveImageProps(section.image, sizes)}
        alt=""
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={eager ? "high" : "auto"}
        style={{ objectPosition: section.imagePosition }}
      />
    </div>
  );
}

export function MarketingHero({ hero, pageName, onNavigate, onNotice }) {
  if (!hero?.enabled) return null;
  if (hero.image) preload(preloadImageUrl(hero.image), { as: "image", fetchPriority: "high" });
  return (
    <section className="managed-hero shell" aria-labelledby={`${pageName}-title`}>
      <div className="managed-hero-copy">
        <span className="managed-hero-icon"><PageIcon name={hero.icon} weight="thin" /></span>
        <h1 id={`${pageName}-title`}>{hero.title}</h1>
        <p>{hero.description}</p>
        <MarketingAction button={hero.button} onNavigate={onNavigate} onNotice={onNotice} />
      </div>
      <MarketingImage section={hero} eager sizes="(max-width: 760px) 100vw, 52vw" className="managed-hero-media" />
    </section>
  );
}

export function MarketingSectionHeading({ section }) {
  return (
    <header className="managed-section-heading">
      <span><PageIcon name={section.icon} weight="thin" /></span>
      <div><h2>{section.title}</h2><p>{section.description}</p></div>
    </header>
  );
}

export function MarketingItem({ entry, onNavigate, onNotice, className = "" }) {
  if (entry.enabled === false) return null;
  const clickable = Boolean(entry.link);
  const content = (
    <>
      <span className="managed-item-icon"><PageIcon name={entry.icon} weight="thin" /></span>
      <div><h3>{entry.title}</h3><p>{entry.description}</p></div>
      {clickable ? <ArrowRight className="managed-item-arrow" weight="bold" /> : null}
    </>
  );
  if (clickable) return <button className={`managed-item managed-item-clickable ${className}`.trim()} type="button" onClick={() => openMarketingLink(entry.link, onNavigate, onNotice)}>{content}</button>;
  return <article className={`managed-item ${className}`.trim()}>{content}</article>;
}

export function MarketingCta({ section, onNavigate, onNotice }) {
  if (!section?.enabled) return null;
  return (
    <section className="managed-cta shell" style={{ "--managed-cta-image": `url(${assetUrl(section.image, 1280)})`, "--managed-cta-position": section.imagePosition }}>
      <div className="managed-cta-copy">
        <span><PageIcon name={section.icon} weight="thin" /></span>
        <div><h2>{section.title}</h2><p>{section.description}</p></div>
        <MarketingAction button={section.button} onNavigate={onNavigate} onNotice={onNotice} />
      </div>
    </section>
  );
}
