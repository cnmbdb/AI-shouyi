import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Buildings,
  Cube,
  Diamond,
  EnvelopeSimple,
  FacebookLogo,
  FlowerLotus,
  Heart,
  HouseLine,
  InstagramLogo,
  Leaf,
  LinkedinLogo,
  List,
  MapPin,
  Medal,
  Mountains,
  Phone,
  Play,
  Quotes,
  ShieldCheck,
  Sparkle,
  UserFocus,
  UsersThree,
  X,
  YoutubeLogo,
} from "@phosphor-icons/react";

const featureCards = [
  {
    icon: Buildings,
    title: "Sky Villas",
    copy: "Architectural masterpieces floating above the clouds with infinite panoramic views.",
    image: "/images/hero-galaxy-home.png",
    position: "42% 66%",
  },
  {
    icon: Mountains,
    title: "Panoramic Views",
    copy: "Wake up to endless horizons and golden sunsets from every vantage.",
    image: "/images/hero-galaxy-home.png",
    position: "8% 38%",
  },
  {
    icon: Cube,
    title: "Smart Living",
    copy: "Intelligent home systems designed for comfort, security, and effortless living.",
    image: "/images/estate-coast.png",
    position: "50% 63%",
  },
  {
    icon: FlowerLotus,
    title: "Private Retreat",
    copy: "Secluded sanctuaries designed for peace, privacy and ultimate rejuvenation.",
    image: "/images/estate-coast.png",
    position: "66% 52%",
  },
];

const benefits = [
  { icon: Diamond, title: "Curated Excellence", copy: "Handpicked estates in extraordinary locations around the world." },
  { icon: UserFocus, title: "Bespoke Service", copy: "Personalized guidance and white-glove service at every step." },
  { icon: ShieldCheck, title: "Trusted & Secure", copy: "Transparent processes and complete peace of mind for your investment." },
  { icon: Leaf, title: "Sustainable Living", copy: "Eco-conscious design that supports a better future generation." },
];

const estates = [
  { tag: "Sky Villa", title: "Celestia Peak", location: "Woning Heights", price: "$12.8M", image: "/images/hero-galaxy-home.png", position: "50% 57%" },
  { tag: "Coast Estate", title: "Azure Horizon", location: "Malibu, California", price: "$9.4M", image: "/images/estate-coast.png", position: "50% 55%" },
  { tag: "Mountain Retreat", title: "Luna Ridge", location: "Rocky Alps", price: "$7.6M", image: "/images/hero-galaxy-home.png", position: "62% 45%" },
];

const testimonials = [
  {
    text: "Aether Lane turned our dream into reality. The attention to detail and personalized service were beyond anything we expected.",
    name: "Isabella M.",
    role: "Entrepreneur",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=face",
  },
  {
    text: "From the first viewing to the final handshake, every step was seamless. Our home is more beautiful than we ever imagined.",
    name: "Julian R.",
    role: "Investor",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=face",
  },
  {
    text: "Working with Aether Lane felt like we had known them forever. A level of dedication and honesty rarely seen these days.",
    name: "Sophia L.",
    role: "Designer",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=face",
  },
];

const stats = [
  { icon: HouseLine, value: "320+", label: "Properties Sold" },
  { icon: UsersThree, value: "1,240+", label: "Premium Clients" },
  { icon: Medal, value: "18+", label: "Years of Expertise" },
  { icon: Heart, value: "98%", label: "Client Satisfaction" },
];

function Logo() {
  return (
    <a className="brand" href="#home" aria-label="Aether Lane home">
      <span className="brand-mark"><span /><span /><span /><span /></span>
      <strong>Aether Lane</strong>
    </a>
  );
}

function ArrowButton({ label = "Open", onClick, dark = false, asSpan = false }) {
  if (asSpan) {
    return <span className={`circle-arrow ${dark ? "dark" : ""}`} aria-hidden="true"><ArrowRight weight="bold" /></span>;
  }
  return (
    <button className={`circle-arrow ${dark ? "dark" : ""}`} aria-label={label} onClick={onClick}>
      <ArrowRight weight="bold" />
    </button>
  );
}

export function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [liked, setLiked] = useState(() => new Set());
  const [testimonialPage, setTestimonialPage] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const scrollTo = (id) => {
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMenuOpen(false);
  };

  const toggleLike = (title) => {
    setLiked((current) => {
      const next = new Set(current);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  return (
    <main id="home">
      <section className="hero" aria-label="Galaxy Home luxury estate">
        <header className="topbar shell">
          <Logo />
          <nav className={menuOpen ? "open" : ""} aria-label="Primary navigation">
            <button onClick={() => scrollTo("#home")}>Home</button>
            <button onClick={() => scrollTo("#about")}>About</button>
            <button onClick={() => scrollTo("#estates")}>Estates</button>
            <button onClick={() => scrollTo("#projects")}>Projects</button>
            <button onClick={() => scrollTo("#contact")}>Inquire</button>
          </nav>
          <button className="header-cta" onClick={() => scrollTo("#contact")}>Get in touch</button>
          <button className="menu-toggle" onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle menu">
            {menuOpen ? <X /> : <List />}
          </button>
        </header>

        <div className="hero-inner shell">
          <h1>Galaxy Home</h1>
          <div className="hero-copy hero-copy-left">
            <h2>Elegance Above the Skyline</h2>
            <p>Aether Lane curates extraordinary homes in the world&apos;s most breathtaking places. Where design, nature and innovation exist in perfect harmony.</p>
            <div className="hero-actions">
              <button className="primary-button" onClick={() => scrollTo("#estates")}>Explore Estates <ArrowButton label="Explore estates" dark asSpan /></button>
              <button className="glass-button" onClick={() => setVideoOpen(true)}>Watch Video <span><Play weight="fill" /></span></button>
            </div>
          </div>
          <p className="hero-tagline">Your Dream Residence Starts Here</p>
        </div>
        <div className="hero-foreground" aria-hidden="true" />
      </section>

      <section className="feature-grid shell" id="projects">
        {featureCards.map(({ icon: Icon, title, copy, image, position }) => (
          <article className="feature-card" key={title} style={{ backgroundImage: `url(${image})`, backgroundPosition: position }}>
            <div className="card-shade" />
            <Icon className="feature-icon" size={34} weight="thin" />
            <div className="feature-content">
              <h3>{title}</h3>
              <p>{copy}</p>
            </div>
            <ArrowButton label={`View ${title}`} />
          </article>
        ))}
      </section>

      <section className="about-panel shell" id="about">
        <div className="about-story">
          <span className="eyebrow">About Aether Lane</span>
          <h2>Beyond Luxury,<br />Above Everything</h2>
          <p>We believe a home is more than a place — it&apos;s a feeling. Aether Lane is dedicated to crafting one-of-a-kind experiences that uplift, inspire and last for generations.</p>
          <button className="soft-button" onClick={() => setNotice("Our private advisor will contact you shortly.")}>Learn More About Us <ArrowRight weight="bold" /></button>
        </div>
        <div className="about-image" aria-label="Luxury private retreat" />
        <div className="benefit-grid">
          {benefits.map(({ icon: Icon, title, copy }) => (
            <article key={title}>
              <span className="benefit-icon"><Icon size={28} weight="thin" /></span>
              <div><h3>{title}</h3><p>{copy}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="estates shell" id="estates">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Featured Estates</span>
            <h2>Exceptional Homes. Extraordinary Places.</h2>
          </div>
          <button onClick={() => setNotice("All estates are now displayed.")}>View All Estates <ArrowRight weight="bold" /></button>
        </div>
        <div className="estate-grid">
          {estates.map((estate) => (
            <article className="estate-card" key={estate.title} style={{ backgroundImage: `url(${estate.image})`, backgroundPosition: estate.position }}>
              <div className="estate-shade" />
              <span className="estate-tag">{estate.tag}</span>
              <button className={`heart-button ${liked.has(estate.title) ? "liked" : ""}`} onClick={() => toggleLike(estate.title)} aria-label={`Save ${estate.title}`}>
                <Heart weight={liked.has(estate.title) ? "fill" : "regular"} />
              </button>
              <div className="estate-meta">
                <h3>{estate.title}</h3>
                <div><span><MapPin weight="fill" /> {estate.location}</span><strong>{estate.price}</strong></div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="stats shell" aria-label="Company statistics">
        {stats.map(({ icon: Icon, value, label }) => (
          <article key={label}>
            <span><Icon size={34} weight="thin" /></span>
            <div><strong>{value}</strong><p>{label}</p></div>
          </article>
        ))}
      </section>

      <section className="testimonials shell">
        <span className="eyebrow centered">What Our Clients Say</span>
        <button className="testimonial-arrow left" onClick={() => setTestimonialPage((value) => (value + 2) % 3)} aria-label="Previous testimonials"><ArrowLeft /></button>
        <div className="testimonial-grid" style={{ transform: `translateX(${-testimonialPage * 1.2}%)` }}>
          {testimonials.map((testimonial) => (
            <article key={testimonial.name}>
              <div className="stars"><Quotes size={26} weight="fill" /> <span>★★★★★</span></div>
              <p>{testimonial.text}</p>
              <div className="person">
                <img src={testimonial.avatar} alt={testimonial.name} />
                <div><strong>{testimonial.name}</strong><span>{testimonial.role}</span></div>
              </div>
            </article>
          ))}
        </div>
        <button className="testimonial-arrow right" onClick={() => setTestimonialPage((value) => (value + 1) % 3)} aria-label="Next testimonials"><ArrowRight /></button>
        <div className="dots" aria-label="Testimonial page">
          {[0, 1, 2, 3, 4].map((dot) => <button key={dot} className={dot === testimonialPage ? "active" : ""} onClick={() => setTestimonialPage(Math.min(dot, 2))} />)}
        </div>
      </section>

      <section className="cta shell" id="contact">
        <Sparkle size={38} weight="thin" />
        <div><h2>Ready to Find Your Galaxy Home?</h2><p>Book a private viewing or explore our exclusive estates.</p></div>
        <button className="primary-button" onClick={() => setNotice("Your private viewing request has been received.")}>Book a Private Viewing <ArrowButton label="Book viewing" dark asSpan /></button>
        <button className="outline-button" onClick={() => scrollTo("#estates")}>Explore Estates</button>
      </section>

      <footer className="footer shell">
        <div className="footer-brand">
          <Logo />
          <p>Elegance above the skyline.<br />Extraordinary homes for<br />extraordinary lives.</p>
          <div className="socials">
            <a href="https://instagram.com" aria-label="Instagram"><InstagramLogo /></a>
            <a href="https://facebook.com" aria-label="Facebook"><FacebookLogo /></a>
            <a href="https://youtube.com" aria-label="YouTube"><YoutubeLogo /></a>
            <a href="https://linkedin.com" aria-label="LinkedIn"><LinkedinLogo /></a>
          </div>
        </div>
        <div className="footer-column"><h3>Navigation</h3><button onClick={() => scrollTo("#home")}>Home</button><button onClick={() => scrollTo("#about")}>About</button><button onClick={() => scrollTo("#estates")}>Estates</button><button onClick={() => scrollTo("#projects")}>Projects</button><button onClick={() => scrollTo("#contact")}>Inquire</button></div>
        <div className="footer-column"><h3>Company</h3><a href="#about">Our Story</a><a href="#contact">Careers</a><a href="#projects">Media</a><a href="#about">Blog</a><a href="#contact">Contact</a></div>
        <div className="footer-column contact"><h3>Contact</h3><a href="tel:+15551234567"><Phone weight="fill" /> +1 (555) 123-4567</a><a href="mailto:hello@aetherlane.com"><EnvelopeSimple weight="fill" /> hello@aetherlane.com</a><p><MapPin weight="fill" /> 123 Celestial Way,<br />San Francisco, CA 94107</p></div>
        <div className="footer-image" />
        <div className="footer-bottom"><span>© 2024 Aether Lane. All rights reserved.</span><div><a href="#privacy">Privacy Policy</a><a href="#terms">Terms of Service</a></div></div>
      </footer>

      {videoOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setVideoOpen(false)}>
          <div className="video-modal" role="dialog" aria-modal="true" aria-label="Aether Lane film" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setVideoOpen(false)} aria-label="Close video"><X /></button>
            <div className="video-still"><span><Play weight="fill" /></span></div>
            <h2>Life Above the Ordinary</h2>
            <p>A cinematic glimpse into the private world of Aether Lane.</p>
          </div>
        </div>
      )}

      {notice && <div className="toast" role="status">{notice}</div>}
    </main>
  );
}
