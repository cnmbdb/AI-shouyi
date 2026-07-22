import { useState } from "react";
import {
  EnvelopeSimple,
  FacebookLogo,
  InstagramLogo,
  LinkedinLogo,
  List,
  MapPin,
  Phone,
  SignOut,
  SquaresFour,
  X,
  YoutubeLogo,
} from "@phosphor-icons/react";
import { defaultFooterSettings, defaultNavigationSettings } from "../data/siteSettings.js";
import { assetUrl } from "../lib/assets.js";
import { BrandLogoMark } from "./BrandLogo.jsx";

const socialIcons = {
  Instagram: InstagramLogo,
  Facebook: FacebookLogo,
  Youtube: YoutubeLogo,
  Linkedin: LinkedinLogo,
};

const activePageForLink = (link) => link === "/estates" ? "estates" : link === "/blog" ? "blog" : link === "/" ? "home" : "";

function createSiteLinkHandler(onNavigate, onSection) {
  return (link) => {
    const target = String(link || "/").trim();
    if (target.startsWith("#")) {
      onSection(target);
      return;
    }
    if (/^https?:\/\//i.test(target) || target.startsWith("mailto:") || target.startsWith("tel:")) {
      window.location.assign(target);
      return;
    }
    onNavigate(target);
  };
}

export function Logo({ onNavigate, siteName = "Aether Lane", logo = "", fallback = "tiles" }) {
  return (
    <button className="brand" type="button" onClick={() => onNavigate("home")} aria-label={`${siteName} home`}>
      {logo || fallback === "gpu" ? <BrandLogoMark logo={logo} imageClassName="brand-logo-image" fallbackClassName="brand-gpu-logo" /> : <span className="brand-mark"><span /><span /><span /><span /></span>}
      <strong>{siteName}</strong>
    </button>
  );
}

export function UserMenu({ user, onNavigate, onLogout, compact = false, loginLabel = "登录 / 注册" }) {
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <button className="header-cta" type="button" onClick={() => onNavigate("/auth")}>
        <span className="header-cta-full">{loginLabel}</span>
        <span className="header-cta-mobile">登录</span>
      </button>
    );
  }

  return (
    <div className={`user-menu ${compact ? "compact" : ""}`}>
      <button className="user-trigger" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span className="user-avatar" style={{ background: user.avatar_color }}>{user.avatar_url ? <img src={user.avatar_url} alt="" /> : user.username.slice(0, 1).toUpperCase()}</span>
        {compact ? null : <span className="user-name">{user.display_name || user.username}</span>}
      </button>
      {open ? (
        <div className="user-dropdown">
          <button type="button" onClick={() => { setOpen(false); onNavigate("/console"); }}><SquaresFour />控制台</button>
          <button type="button" onClick={() => { setOpen(false); onLogout(); }}><SignOut />退出登录</button>
        </div>
      ) : null}
    </div>
  );
}

export function SiteHeader({ page, menuOpen, onMenuToggle, onNavigate, onSection, user, onLogout, settings = defaultNavigationSettings }) {
  const openLink = createSiteLinkHandler(onNavigate, onSection);
  const items = settings.items.filter((item) => item.enabled !== false);

  return (
    <header className={`topbar shell ${settings.sticky ? "topbar-sticky" : ""}`}>
      <Logo onNavigate={onNavigate} siteName={settings.siteName} logo={settings.logo} fallback="gpu" />
      <nav className={menuOpen ? "open" : ""} aria-label="Primary navigation">
        {items.map((item) => {
          const itemPage = activePageForLink(item.link);
          return <button className={itemPage && page === itemPage ? "active" : ""} key={item.id} onClick={() => openLink(item.link)}>{item.label}</button>;
        })}
      </nav>
      <UserMenu user={user} onNavigate={onNavigate} onLogout={onLogout} compact loginLabel={settings.loginLabel} />
      <button className="menu-toggle" onClick={onMenuToggle} aria-label="Toggle menu">
        {menuOpen ? <X /> : <List />}
      </button>
    </header>
  );
}

export function SiteFooter({ onNavigate, onSection, settings = defaultFooterSettings }) {
  const openLink = createSiteLinkHandler(onNavigate, onSection);
  if (!settings.enabled) return null;

  return (
    <footer className="footer shell">
      <div className="footer-brand">
        <Logo onNavigate={onNavigate} siteName={settings.siteName} logo={settings.logo} fallback="gpu" />
        <p style={{ whiteSpace: "pre-line" }}>{settings.description}</p>
        <div className="socials">
          {settings.socials.map((item) => {
            const Icon = socialIcons[item.icon] ?? InstagramLogo;
            return <a href={item.link} key={item.id} aria-label={item.label}><Icon /></a>;
          })}
        </div>
      </div>
      {settings.columns.map((column) => (
        <div className="footer-column" key={column.id}>
          <h3>{column.title}</h3>
          {column.items.filter((item) => item.enabled !== false).map((item) => <button key={item.id} onClick={() => openLink(item.link)}>{item.label}</button>)}
        </div>
      ))}
      <div className="footer-column contact">
        <h3>{settings.contact.title}</h3>
        <a href={`tel:${settings.contact.phone.replace(/[^+\d]/g, "")}`}><Phone weight="fill" /> {settings.contact.phone}</a>
        <a href={`mailto:${settings.contact.email}`}><EnvelopeSimple weight="fill" /> {settings.contact.email}</a>
        <p><MapPin weight="fill" /> <span style={{ whiteSpace: "pre-line" }}>{settings.contact.address}</span></p>
      </div>
      <div className="footer-image" style={{ backgroundImage: `url(${assetUrl(settings.image, 768)})`, backgroundPosition: settings.imagePosition }} />
      <div className="footer-bottom">
        <span>{settings.copyright}</span>
        <div>{settings.legalLinks.map((item) => <button key={item.id} onClick={() => openLink(item.link)}>{item.label}</button>)}</div>
      </div>
    </footer>
  );
}
