import {
  EnvelopeSimple,
  FacebookLogo,
  InstagramLogo,
  LinkedinLogo,
  List,
  MapPin,
  Phone,
  X,
  YoutubeLogo,
} from "@phosphor-icons/react";

export function Logo({ onNavigate }) {
  return (
    <button className="brand" type="button" onClick={() => onNavigate("home")} aria-label="Aether Lane home">
      <span className="brand-mark"><span /><span /><span /><span /></span>
      <strong>Aether Lane</strong>
    </button>
  );
}

export function SiteHeader({ page, menuOpen, onMenuToggle, onNavigate, onSection }) {
  return (
    <header className="topbar shell">
      <Logo onNavigate={onNavigate} />
      <nav className={menuOpen ? "open" : ""} aria-label="Primary navigation">
        <button className={page === "home" ? "active" : ""} onClick={() => onNavigate("home")}>Home</button>
        <button onClick={() => onSection("#about")}>About</button>
        <button className={page === "estates" ? "active" : ""} onClick={() => onNavigate("estates")}>Estates</button>
        <button onClick={() => onSection("#projects")}>Projects</button>
        <button onClick={() => onSection("#contact")}>Inquire</button>
      </nav>
      <button className="header-cta" onClick={() => onSection("#contact")}>Get in touch</button>
      <button className="menu-toggle" onClick={onMenuToggle} aria-label="Toggle menu">
        {menuOpen ? <X /> : <List />}
      </button>
    </header>
  );
}

export function SiteFooter({ onNavigate, onSection }) {
  return (
    <footer className="footer shell">
      <div className="footer-brand">
        <Logo onNavigate={onNavigate} />
        <p>Elegance above the skyline.<br />Extraordinary homes for<br />extraordinary lives.</p>
        <div className="socials">
          <a href="https://instagram.com" aria-label="Instagram"><InstagramLogo /></a>
          <a href="https://facebook.com" aria-label="Facebook"><FacebookLogo /></a>
          <a href="https://youtube.com" aria-label="YouTube"><YoutubeLogo /></a>
          <a href="https://linkedin.com" aria-label="LinkedIn"><LinkedinLogo /></a>
        </div>
      </div>
      <div className="footer-column">
        <h3>Navigation</h3>
        <button onClick={() => onNavigate("home")}>Home</button>
        <button onClick={() => onSection("#about")}>About</button>
        <button onClick={() => onNavigate("estates")}>Estates</button>
        <button onClick={() => onSection("#projects")}>Projects</button>
        <button onClick={() => onSection("#contact")}>Inquire</button>
      </div>
      <div className="footer-column">
        <h3>Company</h3>
        <button onClick={() => onSection("#about")}>Our Story</button>
        <button onClick={() => onSection("#contact")}>Careers</button>
        <button onClick={() => onSection("#projects")}>Media</button>
        <button onClick={() => onSection("#about")}>Blog</button>
        <button onClick={() => onSection("#contact")}>Contact</button>
      </div>
      <div className="footer-column contact">
        <h3>Contact</h3>
        <a href="tel:+15551234567"><Phone weight="fill" /> +1 (555) 123-4567</a>
        <a href="mailto:hello@aetherlane.com"><EnvelopeSimple weight="fill" /> hello@aetherlane.com</a>
        <p><MapPin weight="fill" /> 123 Celestial Way,<br />San Francisco, CA 94107</p>
      </div>
      <div className="footer-image" />
      <div className="footer-bottom">
        <span>© 2024 Aether Lane. All rights reserved.</span>
        <div><a href="#privacy">Privacy Policy</a><a href="#terms">Terms of Service</a></div>
      </div>
    </footer>
  );
}
