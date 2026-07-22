import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Buildings,
  Cpu,
  Cube,
  Diamond,
  FlowerLotus,
  HardDrives,
  Heart,
  HouseLine,
  Leaf,
  MapPin,
  Medal,
  Mountains,
  Play,
  Quotes,
  ShieldCheck,
  Sparkle,
  UserFocus,
  UsersThree,
  Wallet,
  X,
} from "@phosphor-icons/react";
import { defaultHomeSettings } from "../data/homeSettings.js";

const asset = (path = "") => path.startsWith("http") || path.startsWith("data:") ? path : `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
const iconMap = { Buildings, Mountains, Cube, FlowerLotus, Diamond, UserFocus, ShieldCheck, Leaf, HouseLine, UsersThree, Medal, Heart, Sparkle, Cpu, HardDrives, Wallet };
const resolveIcon = (name) => iconMap[name] ?? Sparkle;

function ArrowButton({ label = "Open", onClick, dark = false, asSpan = false }) {
  if (asSpan) return <span className={`circle-arrow ${dark ? "dark" : ""}`} aria-hidden="true"><ArrowRight weight="bold" /></span>;
  return <button className={`circle-arrow ${dark ? "dark" : ""}`} aria-label={label} onClick={onClick}><ArrowRight weight="bold" /></button>;
}

export function HomePage({ settings = defaultHomeSettings, onNavigate, onNotice }) {
  const [videoOpen, setVideoOpen] = useState(false);
  const [liked, setLiked] = useState(() => new Set());
  const [testimonialPage, setTestimonialPage] = useState(0);

  const handleLink = (link) => {
    if (!link) return;
    if (link === "#video") { setVideoOpen(true); return; }
    if (link.startsWith("#")) {
      document.querySelector(link)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (link.startsWith("/")) { onNavigate(link); return; }
    try { window.location.assign(link); } catch { onNotice("链接格式不正确"); }
  };
  const toggleLike = (title) => setLiked((current) => {
    const next = new Set(current);
    if (next.has(title)) next.delete(title); else next.add(title);
    return next;
  });

  const hero = settings.hero;
  const features = settings.features;
  const about = settings.about;
  const featured = settings.featured;
  const stats = settings.stats;
  const testimonials = settings.testimonials;
  const cta = settings.cta;
  const testimonialCount = Math.max(testimonials.items.length, 1);
  const visibleTestimonialPage = Math.min(testimonialPage, testimonialCount - 1);
  const CtaIcon = resolveIcon(cta.icon);

  return (
    <>
      {hero.enabled ? (
        <section className="hero" aria-label="Galaxy Home luxury estate" style={{ backgroundImage: `url(${asset(hero.backgroundImage)})`, backgroundPosition: hero.backgroundPosition }}>
          <div className="hero-inner shell">
            <h1>{hero.title}</h1>
            <div className="hero-copy hero-copy-left">
              <h2>{hero.heading}</h2>
              <p>{hero.description}</p>
              <div className="hero-actions">
                <button className="primary-button" onClick={() => handleLink(hero.primaryButton.link)}>{hero.primaryButton.label} <ArrowButton label={hero.primaryButton.label} dark asSpan /></button>
                <button className="glass-button" onClick={() => handleLink(hero.secondaryButton.link)}>{hero.secondaryButton.label} <span><Play weight="fill" /></span></button>
              </div>
            </div>
            <p className="hero-tagline">{hero.tagline}</p>
          </div>
          <div className="hero-foreground" aria-hidden="true" style={{ backgroundImage: hero.foregroundImage ? `url(${asset(hero.foregroundImage)})` : "none", backgroundPosition: hero.foregroundPosition }} />
        </section>
      ) : null}

      {features.enabled ? (
        <section className="feature-grid shell" id="projects">
          {features.items.map((item) => {
            const Icon = resolveIcon(item.icon);
            return (
              <article className="feature-card home-clickable" key={item.id} style={{ backgroundImage: `url(${asset(item.image)})`, backgroundPosition: item.imagePosition }} onClick={() => handleLink(item.link)}>
                <div className="card-shade" />
                <Icon className="feature-icon" size={34} weight="thin" />
                <div className="feature-content"><h3>{item.title}</h3><p>{item.description}</p></div>
                <ArrowButton label={`View ${item.title}`} onClick={(event) => { event.stopPropagation(); handleLink(item.link); }} />
              </article>
            );
          })}
        </section>
      ) : null}

      {about.enabled ? (
        <section className="about-panel shell" id="about">
          <div className="about-story">
            <span className="eyebrow">{about.eyebrow}</span>
            <h2>{about.title.split("\n").map((line, index) => <span key={`${line}-${index}`}>{line}{index < about.title.split("\n").length - 1 ? <br /> : null}</span>)}</h2>
            <p>{about.description}</p>
            <button className="soft-button" onClick={() => handleLink(about.buttonLink)}>{about.buttonLabel} <ArrowRight weight="bold" /></button>
          </div>
          <div className="about-image" aria-label="Luxury private retreat" style={{ backgroundImage: `url(${asset(about.image)})`, backgroundPosition: about.imagePosition }} />
          <div className="benefit-grid">
            {about.benefits.map((item) => {
              const Icon = resolveIcon(item.icon);
              return <article className="home-clickable" key={item.id} onClick={() => handleLink(item.link)}><span className="benefit-icon"><Icon size={28} weight="thin" /></span><div><h3>{item.title}</h3><p>{item.description}</p></div></article>;
            })}
          </div>
        </section>
      ) : null}

      {featured.enabled ? (
        <section className="estates shell" id="estates">
          <div className="section-heading">
            <div><span className="eyebrow">{featured.eyebrow}</span><h2>{featured.title}</h2></div>
            <button onClick={() => handleLink(featured.buttonLink)}>{featured.buttonLabel} <ArrowRight weight="bold" /></button>
          </div>
          <div className="estate-grid">
            {featured.items.map((estate) => (
              <article className="estate-card home-clickable" key={estate.id} style={{ backgroundImage: `url(${asset(estate.image)})`, backgroundPosition: estate.imagePosition }} onClick={() => handleLink(estate.link)}>
                <div className="estate-shade" />
                <span className="estate-tag">{estate.tag}</span>
                <button className={`heart-button ${liked.has(estate.title) ? "liked" : ""}`} onClick={(event) => { event.stopPropagation(); toggleLike(estate.title); }} aria-label={`Save ${estate.title}`}><Heart weight={liked.has(estate.title) ? "fill" : "regular"} /></button>
                <div className="estate-meta"><h3>{estate.title}</h3><div><span><MapPin weight="fill" /> {estate.location}</span><strong>{estate.price}</strong></div></div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {stats.enabled ? (
        <section className="stats shell" aria-label="Company statistics">
          {stats.items.map((item) => {
            const Icon = resolveIcon(item.icon);
            return <article className="home-clickable" key={item.id} onClick={() => handleLink(item.link)}><span><Icon size={34} weight="thin" /></span><div><strong>{item.value}</strong><p>{item.label}</p></div></article>;
          })}
        </section>
      ) : null}

      {testimonials.enabled ? (
        <section className="testimonials shell" id="testimonials" style={{ backgroundImage: `linear-gradient(90deg, white 0%, white 83%, rgba(113,100,214,.08) 100%), url(${asset(testimonials.backgroundImage)})`, backgroundPosition: `0 0, ${testimonials.backgroundPosition}`, backgroundSize: "auto, 20% 100%", backgroundRepeat: "no-repeat" }}>
          <span className="eyebrow centered">{testimonials.eyebrow}</span>
          <button className="testimonial-arrow left" onClick={() => setTestimonialPage((value) => (value - 1 + testimonialCount) % testimonialCount)} aria-label="Previous testimonials"><ArrowLeft /></button>
          <div className="testimonial-grid" style={{ transform: `translateX(${-visibleTestimonialPage * 1.2}%)` }}>
            {testimonials.items.map((testimonial) => <article className="home-clickable" key={testimonial.id} onClick={() => handleLink(testimonial.link)}><div className="stars"><Quotes size={26} weight="fill" /> <span>{"★".repeat(testimonial.rating || 5)}</span></div><p>{testimonial.text}</p><div className="person">{testimonial.avatar ? <img src={asset(testimonial.avatar)} alt={testimonial.name} /> : <span className="person-fallback">{testimonial.name.slice(0, 1)}</span>}<div><strong>{testimonial.name}</strong><span>{testimonial.role}</span></div></div></article>)}
          </div>
          <button className="testimonial-arrow right" onClick={() => setTestimonialPage((value) => (value + 1) % testimonialCount)} aria-label="Next testimonials"><ArrowRight /></button>
          <div className="dots" aria-label="Testimonial page">{testimonials.items.map((item, index) => <button key={item.id} className={index === visibleTestimonialPage ? "active" : ""} onClick={() => setTestimonialPage(index)} />)}</div>
        </section>
      ) : null}

      {cta.enabled ? (
        <section className="cta shell" id="contact">
          <CtaIcon size={38} weight="thin" />
          <div><h2>{cta.title}</h2><p>{cta.description}</p></div>
          <button className="primary-button" onClick={() => handleLink(cta.primaryButton.link)}>{cta.primaryButton.label} <ArrowButton label={cta.primaryButton.label} dark asSpan /></button>
          <button className="outline-button" onClick={() => handleLink(cta.secondaryButton.link)}>{cta.secondaryButton.label}</button>
        </section>
      ) : null}

      {videoOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setVideoOpen(false)}>
          <div className="video-modal" role="dialog" aria-modal="true" aria-label="Aether Lane film" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setVideoOpen(false)} aria-label="Close video"><X /></button>
            <div className="video-still"><span><Play weight="fill" /></span></div>
            <h2>Life Above the Ordinary</h2><p>A cinematic glimpse into the private world of Aether Lane.</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
