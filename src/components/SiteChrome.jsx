import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
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
import { resolveManagedLink } from "../lib/managedLink.js";
import { BrandLogoMark } from "./BrandLogo.jsx";

gsap.registerPlugin(useGSAP);

const socialIcons = {
  Instagram: InstagramLogo,
  Facebook: FacebookLogo,
  Youtube: YoutubeLogo,
  Linkedin: LinkedinLogo,
};

const activePageForLink = (link) => ({
  "/": "home",
  "/estates": "estates",
  "/blog": "blog",
  "/about": "about",
  "/calculator": "calculator",
  "/agency": "agency",
  "/contact": "contact",
})[link] ?? "";

function createSiteLinkHandler(onNavigate, onSection) {
  return (link) => {
    const resolved = resolveManagedLink(link || "/");
    if (resolved.kind === "section") {
      onSection(resolved.target);
      return;
    }
    if (resolved.kind === "external") {
      window.location.assign(resolved.target);
      return;
    }
    if (resolved.kind === "internal") onNavigate(resolved.target);
  };
}

export function Logo({ onNavigate, siteName = "Aether Lane", logo = "", logoSize = 25, fallback = "tiles" }) {
  return (
    <button className="brand" type="button" style={{ "--shared-logo-size": `${logoSize}px` }} onClick={() => onNavigate("home")} aria-label={`${siteName} 返回首页`}>
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
  const navRef = useRef(null);
  const pillRef = useRef(null);
  const pillReady = useRef(false);

  useGSAP(() => {
    const nav = navRef.current;
    const pill = pillRef.current;
    if (!nav || !pill) return undefined;

    const syncPill = (animate = true) => {
      const activeButton = nav.querySelector("button.active");
      if (!activeButton) {
        pillReady.current = false;
        gsap.set(pill, { autoAlpha: 0 });
        return;
      }

      const navBox = nav.getBoundingClientRect();
      const activeBox = activeButton.getBoundingClientRect();
      const target = {
        x: activeBox.left - navBox.left,
        width: activeBox.width,
      };
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (animate && pillReady.current && !reducedMotion) {
        gsap.to(pill, { ...target, autoAlpha: 1, duration: 0.46, ease: "power3.out", overwrite: "auto" });
      } else {
        gsap.set(pill, { x: target.x, width: target.width, autoAlpha: 1 });
      }
      pillReady.current = true;
    };

    const media = gsap.matchMedia();
    media.add("(min-width: 721px)", () => {
      syncPill(false);
      const resizeObserver = new ResizeObserver(() => syncPill(true));
      const mutationObserver = new MutationObserver(() => window.requestAnimationFrame(() => syncPill(true)));
      resizeObserver.observe(nav);
      mutationObserver.observe(nav, { attributes: true, attributeFilter: ["class"], childList: true, subtree: true });
      return () => {
        resizeObserver.disconnect();
        mutationObserver.disconnect();
      };
    });

    return () => media.revert();
  }, { scope: navRef });

  return (
    <header className={`topbar shell ${settings.sticky ? "topbar-sticky" : ""}`}>
      <Logo onNavigate={onNavigate} siteName={settings.siteName} logo={settings.logo} logoSize={settings.logoSize} fallback="gpu" />
      <nav ref={navRef} className={menuOpen ? "open" : ""} aria-label="主导航">
        <span ref={pillRef} className="nav-active-pill" aria-hidden="true" />
        {items.map((item) => {
          const itemPage = activePageForLink(item.link);
          return <button className={itemPage && page === itemPage ? "active" : ""} key={item.id} onClick={() => openLink(item.link)}>{item.label}</button>;
        })}
      </nav>
      <UserMenu user={user} onNavigate={onNavigate} onLogout={onLogout} compact loginLabel={settings.loginLabel} />
      <button className="menu-toggle" onClick={onMenuToggle} aria-label="切换菜单">
        {menuOpen ? <X /> : <List />}
      </button>
    </header>
  );
}

export function SiteFooter({ onNavigate, onSection, settings = defaultFooterSettings }) {
  const openLink = createSiteLinkHandler(onNavigate, onSection);
  const footerRef = useRef(null);
  const reducedFooterMotion = useRef(false);

  const { contextSafe } = useGSAP(() => {
    const media = gsap.matchMedia();
    media.add({ reduce: "(prefers-reduced-motion: reduce)" }, ({ conditions }) => {
      reducedFooterMotion.current = conditions.reduce;
    });
    return () => media.revert();
  }, { scope: footerRef });

  const animateFooterItemIn = contextSafe((event) => {
    if (reducedFooterMotion.current) return;
    const target = event.currentTarget;
    target.dataset.footerRestColor ||= getComputedStyle(target).color;
    const isSocial = target.matches(".socials a");
    const isImage = target.matches(".footer-image");
    const isBrand = target.matches(".footer-brand-logo-motion");
    const isLink = target.matches(".footer-column button, .footer-column.contact a, .footer-bottom button");

    gsap.to(target, {
      x: isLink ? 5 : 0,
      y: isSocial ? -4 : isImage ? -5 : isBrand ? -3 : 0,
      scale: isSocial ? 1.1 : isImage ? 1.018 : 1,
      rotation: isSocial ? -4 : 0,
      color: isLink ? "#4f7d00" : target.dataset.footerRestColor,
      duration: isImage ? 0.48 : 0.32,
      ease: isSocial ? "back.out(1.8)" : "power3.out",
      overwrite: "auto",
    });
    const icon = target.querySelector("svg");
    if (icon) gsap.to(icon, { scale: 1.12, rotation: isSocial ? 8 : -3, duration: 0.34, ease: "back.out(1.8)", overwrite: "auto" });
  });

  const animateFooterItemOut = contextSafe((event) => {
    const target = event.currentTarget;
    if (reducedFooterMotion.current) {
      gsap.set(target, { clearProps: "transform,color" });
      return;
    }
    gsap.to(target, {
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      color: target.dataset.footerRestColor,
      duration: 0.4,
      ease: "power3.out",
      overwrite: "auto",
      onComplete: () => gsap.set(target, { clearProps: "transform,color" }),
    });
    const icon = target.querySelector("svg");
    if (icon) gsap.to(icon, { scale: 1, rotation: 0, duration: 0.38, ease: "power3.out", overwrite: "auto", onComplete: () => gsap.set(icon, { clearProps: "transform" }) });
  });

  const footerMotionProps = {
    onPointerEnter: animateFooterItemIn,
    onPointerLeave: animateFooterItemOut,
    onFocus: animateFooterItemIn,
    onBlur: animateFooterItemOut,
  };

  if (!settings.enabled) return null;

  return (
    <footer ref={footerRef} className="footer shell">
      <div className="footer-brand">
        <div className="footer-brand-logo-motion" {...footerMotionProps}><Logo onNavigate={onNavigate} siteName={settings.siteName} logo={settings.logo} fallback="gpu" /></div>
        <p style={{ whiteSpace: "pre-line" }}>{settings.description}</p>
        <div className="socials">
          {settings.socials.map((item) => {
            const Icon = socialIcons[item.icon] ?? InstagramLogo;
            return <a href={item.link} key={item.id} aria-label={item.label} {...footerMotionProps}><Icon weight="fill" /></a>;
          })}
        </div>
      </div>
      {settings.columns.map((column) => (
        <div className="footer-column" key={column.id}>
          <h3>{column.title}</h3>
          {column.items.filter((item) => item.enabled !== false).map((item) => <button key={item.id} onClick={() => openLink(item.link)} {...footerMotionProps}>{item.label}</button>)}
        </div>
      ))}
      <div className="footer-column contact">
        <h3>{settings.contact.title}</h3>
        <a href={`tel:${settings.contact.phone.replace(/[^+\d]/g, "")}`} {...footerMotionProps}><Phone weight="fill" /> {settings.contact.phone}</a>
        <a href={`mailto:${settings.contact.email}`} {...footerMotionProps}><EnvelopeSimple weight="fill" /> {settings.contact.email}</a>
        <p><MapPin weight="fill" /> <span style={{ whiteSpace: "pre-line" }}>{settings.contact.address}</span></p>
      </div>
      <div className="footer-image" tabIndex={0} aria-label="页脚展示图片" style={{ backgroundImage: `url(${assetUrl(settings.image, 768)})`, backgroundPosition: settings.imagePosition }} {...footerMotionProps} />
      <div className="footer-bottom">
        <span>{settings.copyright}</span>
        <div>{settings.legalLinks.map((item) => <button key={item.id} onClick={() => openLink(item.link)} {...footerMotionProps}>{item.label}</button>)}</div>
      </div>
    </footer>
  );
}
