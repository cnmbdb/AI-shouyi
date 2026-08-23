import { useRef, useState } from "react";
import { preload } from "react-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  ArrowLeft,
  ArrowRight,
  BookmarkSimple,
  ChartLineUp,
  Circuitry,
  CloudArrowUp,
  Coins,
  Cpu,
  CurrencyCircleDollar,
  DesktopTower,
  Gauge,
  GraphicsCard,
  Handshake,
  HardDrives,
  Leaf,
  MapPin,
  Quotes,
  ShieldCheck,
  UsersThree,
  Wallet,
} from "@phosphor-icons/react";
import { defaultHomeSettings } from "../data/homeSettings.js";
import { assetUrl, responsiveImageProps } from "../lib/assets.js";
import { resolveManagedLink } from "../lib/managedLink.js";

const iconMap = {
  GraphicsCard,
  Cpu,
  Circuitry,
  HardDrives,
  DesktopTower,
  CloudArrowUp,
  Gauge,
  ChartLineUp,
  CurrencyCircleDollar,
  Coins,
  Wallet,
  Handshake,
  ShieldCheck,
  UsersThree,
  Leaf,
  // Keep published legacy icon names readable while rendering compute-product semantics.
  Buildings: GraphicsCard,
  Mountains: CloudArrowUp,
  Cube: Circuitry,
  FlowerLotus: Cpu,
  Diamond: GraphicsCard,
  UserFocus: UsersThree,
  HouseLine: DesktopTower,
  Medal: Gauge,
  Heart: ChartLineUp,
  Sparkle: Handshake,
};
const resolveIcon = (name) => iconMap[name] ?? Cpu;

gsap.registerPlugin(useGSAP);

function ArrowButton({ label = "Open", onClick, dark = false, asSpan = false }) {
  if (asSpan) return <span className={`circle-arrow ${dark ? "dark" : ""}`} aria-hidden="true"><ArrowRight weight="bold" /></span>;
  return <button className={`circle-arrow ${dark ? "dark" : ""}`} aria-label={label} onClick={onClick}><ArrowRight weight="bold" /></button>;
}

function FeatureCard({ item, onOpen }) {
  const cardRef = useRef(null);
  const reducedMotion = useRef(false);
  const { contextSafe } = useGSAP(() => {
    const media = gsap.matchMedia();
    media.add({ reduce: "(prefers-reduced-motion: reduce)" }, ({ conditions }) => {
      reducedMotion.current = conditions.reduce;
    });
    return () => media.revert();
  }, { scope: cardRef });

  const animateIn = contextSafe(() => {
    if (reducedMotion.current) return;
    const card = cardRef.current;
    gsap.to(card, { y: -8, scale: 1.015, duration: 0.42, ease: "power3.out", overwrite: "auto" });
    gsap.to(card.querySelector(".feature-card-media"), { scale: 1.065, y: -4, duration: 0.62, ease: "power3.out", overwrite: "auto" });
    gsap.to(card.querySelector(".feature-content"), { y: -5, duration: 0.38, ease: "power3.out", overwrite: "auto" });
    gsap.to(card.querySelector(".circle-arrow"), { x: 2, scale: 1.12, duration: 0.34, ease: "back.out(1.8)", overwrite: "auto" });
  });

  const animateOut = contextSafe(() => {
    const card = cardRef.current;
    if (reducedMotion.current) {
      gsap.set([card, card.querySelector(".feature-card-media"), card.querySelector(".feature-content"), card.querySelector(".circle-arrow")], { clearProps: "transform" });
      return;
    }
    gsap.to(card, { y: 0, scale: 1, duration: 0.46, ease: "power3.out", overwrite: "auto" });
    gsap.to(card.querySelector(".feature-card-media"), { scale: 1, y: 0, duration: 0.58, ease: "power3.out", overwrite: "auto" });
    gsap.to(card.querySelector(".feature-content"), { y: 0, duration: 0.4, ease: "power3.out", overwrite: "auto" });
    gsap.to(card.querySelector(".circle-arrow"), { x: 0, scale: 1, duration: 0.38, ease: "power3.out", overwrite: "auto" });
  });

  return (
    <article
      ref={cardRef}
      className="feature-card home-clickable"
      role="link"
      tabIndex={0}
      onClick={onOpen}
      onPointerEnter={animateIn}
      onPointerLeave={animateOut}
      onFocus={animateIn}
      onBlur={animateOut}
      onKeyDown={(event) => { if (event.key === "Enter") onOpen(); }}
    >
      <div className="feature-card-media" aria-hidden="true" style={{ backgroundImage: `url(${assetUrl(item.image, 768)})`, backgroundPosition: item.imagePosition }} />
      <div className="card-shade" />
      <div className="feature-content"><h3>{item.title}</h3><p>{item.description}</p></div>
      <ArrowButton label={`View ${item.title}`} onClick={(event) => { event.stopPropagation(); onOpen(); }} />
    </article>
  );
}

export function HomePage({ settings = defaultHomeSettings, onNavigate, onNotice }) {
  const [liked, setLiked] = useState(() => new Set());
  const [testimonialPage, setTestimonialPage] = useState(0);

  const handleLink = (link) => {
    const resolved = resolveManagedLink(link);
    if (resolved.kind === "empty") return;
    if (resolved.kind === "section") {
      document.querySelector(resolved.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (resolved.kind === "internal") { onNavigate(resolved.target); return; }
    if (resolved.kind === "external") { window.location.assign(resolved.target); return; }
    onNotice("链接格式不正确，仅支持站内路径或 HTTPS 地址");
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
  const mobileHeroImage = hero.mobileBackgroundImage || hero.backgroundImage;
  const mobileHeroAspectRatio = hero.mobileBackgroundFit === "contain"
    && Number(hero.mobileAspectRatio) === 90
    && Number(hero.mobileHeight) === 350
    ? 75
    : hero.mobileAspectRatio ?? 75;
  const desktopHeroProps = responsiveImageProps(hero.backgroundImage, "(max-width: 720px) 100vw, 100vw");
  const mobileHeroProps = responsiveImageProps(mobileHeroImage, "100vw");

  if (hero.enabled && hero.backgroundImage) {
    const visibleHeroImage = window.matchMedia("(max-width: 720px)").matches ? mobileHeroImage : hero.backgroundImage;
    const visibleHeroProps = responsiveImageProps(visibleHeroImage, "100vw");
    preload(visibleHeroProps.src, {
      as: "image",
      fetchPriority: "high",
      ...(visibleHeroProps.srcSet ? { imageSrcSet: visibleHeroProps.srcSet, imageSizes: visibleHeroProps.sizes } : {}),
    });
  }

  return (
    <>
      {hero.enabled ? (
        <section className="hero" aria-label="速芯算力首页" style={{
          "--hero-desktop-height": `${hero.desktopHeight ?? 690}px`,
          "--hero-desktop-fit": hero.desktopBackgroundFit ?? "cover",
          "--hero-desktop-position": hero.backgroundPosition,
          "--hero-desktop-zoom": (hero.desktopBackgroundZoom ?? 100) / 100,
          "--hero-mobile-height": `${hero.mobileHeight ?? 560}px`,
          "--hero-mobile-width": `${hero.mobileWidthPercent ?? 100}%`,
          "--hero-mobile-aspect": `100 / ${mobileHeroAspectRatio}`,
          "--hero-mobile-fit": hero.mobileBackgroundFit ?? "cover",
          "--hero-mobile-position": hero.mobileBackgroundPosition ?? hero.backgroundPosition,
          "--hero-mobile-zoom": (hero.mobileBackgroundZoom ?? 100) / 100,
        }}>
          <picture className="hero-background" aria-hidden="true">
            <source media="(max-width: 720px)" srcSet={mobileHeroProps.srcSet ?? mobileHeroProps.src} sizes={mobileHeroProps.sizes} />
            <img {...desktopHeroProps} alt="" decoding="async" fetchPriority="high" />
          </picture>
          <div className="hero-inner shell">
            <h1>{hero.title}</h1>
            <div className="hero-copy hero-copy-left">
              <h2>{hero.heading}</h2>
              <p>{hero.description}</p>
            </div>
            <p className="hero-tagline">{hero.tagline}</p>
          </div>
          <div className="hero-foreground" aria-hidden="true" style={{ backgroundImage: hero.foregroundImage ? `url(${assetUrl(hero.foregroundImage, 1280)})` : "none", backgroundPosition: hero.foregroundPosition }} />
        </section>
      ) : null}

      {features.enabled ? (
        <section className="feature-grid shell" id="projects" style={{
          "--feature-mobile-columns": features.mobileColumns ?? 2,
          "--feature-mobile-height": `${features.mobileCardHeight ?? 250}px`,
          "--feature-mobile-width": `${features.mobileWidthPercent ?? 92}%`,
          "--feature-mobile-aspect": `100 / ${features.mobileCardAspectRatio ?? 142}`,
        }}>
          {features.items.map((item) => <FeatureCard key={item.id} item={item} onOpen={() => handleLink(item.link)} />)}
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
          <div className="about-image" aria-label="算力中心与 GPU 设备" style={{ backgroundImage: `url(${assetUrl(about.image, 768)})`, backgroundPosition: about.imagePosition }} />
          <div className="benefit-grid">
            {about.benefits.map((item) => {
              const Icon = resolveIcon(item.icon);
              return <article className="home-clickable" key={item.id} onClick={() => handleLink(item.link)}><span className="benefit-icon"><Icon size={30} weight="duotone" /></span><div><h3>{item.title}</h3><p>{item.description}</p></div></article>;
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
              <article className="estate-card home-clickable" key={estate.id} style={{ backgroundImage: `url(${assetUrl(estate.image, 768)})`, backgroundPosition: estate.imagePosition }} onClick={() => handleLink(estate.link)}>
                <div className="estate-shade" />
                <span className="estate-tag">{estate.tag}</span>
                <button className={`heart-button ${liked.has(estate.title) ? "liked" : ""}`} onClick={(event) => { event.stopPropagation(); toggleLike(estate.title); }} aria-label={`收藏 ${estate.title}`}><BookmarkSimple weight={liked.has(estate.title) ? "fill" : "regular"} /></button>
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
            return <article className="home-clickable" key={item.id} onClick={() => handleLink(item.link)}><span><Icon size={38} weight="fill" /></span><div><strong>{item.value}</strong><p>{item.label}</p></div></article>;
          })}
        </section>
      ) : null}

      {testimonials.enabled ? (
        <section className="testimonials shell" id="testimonials" style={{ backgroundImage: `linear-gradient(90deg, white 0%, white 83%, rgba(118,185,0,.09) 100%), url(${assetUrl(testimonials.backgroundImage, 768)})`, backgroundPosition: `0 0, ${testimonials.backgroundPosition}`, backgroundSize: "auto, 20% 100%", backgroundRepeat: "no-repeat" }}>
          <span className="eyebrow centered">{testimonials.eyebrow}</span>
          <button className="testimonial-arrow left" onClick={() => setTestimonialPage((value) => (value - 1 + testimonialCount) % testimonialCount)} aria-label="Previous testimonials"><ArrowLeft /></button>
          <div className="testimonial-grid" style={{ transform: `translateX(${-visibleTestimonialPage * 1.2}%)` }}>
            {testimonials.items.map((testimonial) => <article className="home-clickable" key={testimonial.id} onClick={() => handleLink(testimonial.link)}><div className="stars"><Quotes size={26} weight="fill" /> <span>{"★".repeat(testimonial.rating || 5)}</span></div><p>{testimonial.text}</p><div className="person">{testimonial.avatar ? <img {...responsiveImageProps(testimonial.avatar, "40px")} loading="lazy" decoding="async" alt={testimonial.name} style={{ objectPosition: testimonial.avatarPosition }} /> : <span className="person-fallback">{testimonial.name.slice(0, 1)}</span>}<div><strong>{testimonial.name}</strong><span>{testimonial.role}</span></div></div></article>)}
          </div>
          <button className="testimonial-arrow right" onClick={() => setTestimonialPage((value) => (value + 1) % testimonialCount)} aria-label="Next testimonials"><ArrowRight /></button>
          <div className="dots" aria-label="Testimonial page">{testimonials.items.map((item, index) => <button key={item.id} className={index === visibleTestimonialPage ? "active" : ""} onClick={() => setTestimonialPage(index)} />)}</div>
        </section>
      ) : null}

      {cta.enabled ? (
        <section className="cta shell" id="contact">
          <CtaIcon size={42} weight="fill" />
          <div><h2>{cta.title}</h2><p>{cta.description}</p></div>
          <button className="primary-button" onClick={() => handleLink(cta.primaryButton.link)}>{cta.primaryButton.label} <ArrowButton label={cta.primaryButton.label} dark asSpan /></button>
          <button className="outline-button" onClick={() => handleLink(cta.secondaryButton.link)}>{cta.secondaryButton.label}</button>
        </section>
      ) : null}

    </>
  );
}
