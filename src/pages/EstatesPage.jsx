import { useEffect, useMemo, useRef, useState } from "react";
import { preload } from "react-dom";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import {
  ArrowRight,
  CalendarBlank,
  CaretDown,
  GraphicsCard,
  Heart,
  ListBullets,
  MapPin,
  Memory,
  SlidersHorizontal,
  Sparkle,
  SquaresFour,
} from "@phosphor-icons/react";
import { defaultProductSettings } from "../data/siteSettings.js";
import { preloadImageUrl, responsiveImageProps } from "../lib/assets.js";

gsap.registerPlugin(useGSAP);

const HERO_CARD_COUNT = 5;

const carouselSlot = (index, activeIndex) => {
  let difference = (index - activeIndex + HERO_CARD_COUNT) % HERO_CARD_COUNT;
  if (difference > 2) difference -= HERO_CARD_COUNT;
  return difference;
};

function GpuHeroCarousel({ image }) {
  const rootRef = useRef(null);
  const shellRefs = useRef([]);
  const cardRefs = useRef([]);
  const timelineRef = useRef(null);
  const hoveredCardRef = useRef(null);
  const reducedMotionRef = useRef(false);

  const { contextSafe } = useGSAP(() => {
    const shells = gsap.utils.toArray(".gpu-carousel-card-shell", rootRef.current);
    if (rootRef.current) rootRef.current.dataset.gsapReady = String(shells.length);
    if (shells.length !== HERO_CARD_COUNT) return undefined;

    const media = gsap.matchMedia();

    media.add({
      isDesktop: "(min-width: 721px)",
      isMobile: "(max-width: 720px)",
      reduceMotion: "(prefers-reduced-motion: reduce)",
    }, (context) => {
      const { isMobile, reduceMotion } = context.conditions;
      if (rootRef.current) rootRef.current.dataset.gsapMedia = `${isMobile ? "mobile" : "desktop"}-${reduceMotion ? "reduced" : "motion"}`;
      const initialActiveIndex = 2;
      const horizontalStep = isMobile ? 58 : 72;

      reducedMotionRef.current = reduceMotion;

      const cardState = (index, activeIndex) => {
        const slot = carouselSlot(index, activeIndex);
        const distance = Math.abs(slot);
        return {
          xPercent: -50 + slot * horizontalStep,
          yPercent: -50,
          y: distance === 0 ? (isMobile ? 18 : 8) : distance === 1 ? (isMobile ? 38 : 34) : (isMobile ? 56 : 62),
          scale: distance === 0 ? 1 : distance === 1 ? (isMobile ? 0.84 : 0.86) : (isMobile ? 0.67 : 0.72),
          rotation: slot * (isMobile ? 5 : 5.5),
          rotationY: slot * (isMobile ? -2 : -3),
          autoAlpha: distance === 2 ? 0.82 : 1,
          zIndex: 10 - distance,
          transformOrigin: "50% 88%",
          force3D: true,
        };
      };

      shells.forEach((shell, index) => gsap.set(shell, cardState(index, initialActiveIndex)));

      if (reduceMotion) {
        timelineRef.current = null;
        return undefined;
      }

      const timeline = gsap.timeline({
        repeat: -1,
        defaults: { duration: 0.9, ease: "power3.inOut", overwrite: "auto" },
      });

      for (let step = 1; step <= HERO_CARD_COUNT; step += 1) {
        const activeIndex = (initialActiveIndex + step) % HERO_CARD_COUNT;
        const label = `carousel-step-${step}`;
        timeline.addLabel(label, timeline.duration() + 2.35);
        shells.forEach((shell, index) => timeline.to(shell, cardState(index, activeIndex), label));
      }

      timelineRef.current = timeline;

      return () => {
        timeline.kill();
        if (timelineRef.current === timeline) timelineRef.current = null;
      };
    });

    const handleVisibilityChange = () => {
      const timeline = timelineRef.current;
      if (!timeline) return;
      if (document.hidden) timeline.pause();
      else if (hoveredCardRef.current === null) timeline.resume();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      timelineRef.current?.kill();
      media.revert();
    };
  }, { scope: rootRef });

  const holdCard = contextSafe((index) => {
    const cards = cardRefs.current.filter(Boolean);
    const shell = shellRefs.current[index];
    const selectedCard = cardRefs.current[index];
    if (!shell || !selectedCard) return;

    hoveredCardRef.current = index;
    timelineRef.current?.pause();
    shell.dataset.restingZ = String(gsap.getProperty(shell, "zIndex") || 10);
    gsap.set(shell, { zIndex: 30 });
    gsap.killTweensOf(cards);

    const duration = reducedMotionRef.current ? 0 : 0.42;
    const shellRotation = Number(gsap.getProperty(shell, "rotation")) || 0;

    cards.forEach((card, cardIndex) => {
      gsap.to(card, {
        y: cardIndex === index ? -34 : 0,
        scale: cardIndex === index ? 1.08 : 0.97,
        rotation: cardIndex === index ? -shellRotation : 0,
        rotationX: cardIndex === index ? -4 : 0,
        autoAlpha: cardIndex === index ? 1 : 0.7,
        duration,
        ease: cardIndex === index ? "back.out(1.7)" : "power2.out",
        overwrite: "auto",
      });
    });
  });

  const releaseCard = contextSafe((index) => {
    if (hoveredCardRef.current !== index) return;
    hoveredCardRef.current = null;

    const cards = cardRefs.current.filter(Boolean);
    const shell = shellRefs.current[index];
    const duration = reducedMotionRef.current ? 0 : 0.38;

    gsap.to(cards, {
      y: 0,
      scale: 1,
      rotation: 0,
      rotationX: 0,
      autoAlpha: 1,
      duration,
      ease: "power3.out",
      overwrite: "auto",
      onComplete: () => {
        if (shell) gsap.set(shell, { zIndex: Number(shell.dataset.restingZ) || 10 });
        if (hoveredCardRef.current === null && !document.hidden) timelineRef.current?.resume();
      },
    });
  });

  return (
    <div className="gpu-hero-carousel" ref={rootRef} aria-label="GPU compute card carousel">
      {Array.from({ length: HERO_CARD_COUNT }, (_, index) => (
        <button
          className="gpu-carousel-card-shell"
          key={`gpu-hero-card-${index + 1}`}
          ref={(node) => { shellRefs.current[index] = node; }}
          type="button"
          aria-label={`GPU 算力卡片 ${index + 1}，悬停或聚焦可暂停轮播`}
          onPointerEnter={() => holdCard(index)}
          onPointerLeave={() => releaseCard(index)}
          onFocus={() => holdCard(index)}
          onBlur={() => releaseCard(index)}
        >
          <span className="gpu-carousel-card" ref={(node) => { cardRefs.current[index] = node; }}>
            <img
              {...responsiveImageProps(image, "(max-width: 720px) 50vw, 27vw")}
              alt={`GPU data center compute card ${index + 1}`}
              loading="eager"
              decoding="async"
              fetchPriority={index === 2 ? "high" : "auto"}
              draggable="false"
            />
          </span>
        </button>
      ))}
    </div>
  );
}

function SelectField({ label, value, onChange, children }) {
  return (
    <label className="catalog-field">
      {label ? <span>{label}</span> : null}
      <span className="select-shell">
        <select value={value} onChange={onChange}>{children}</select>
        <CaretDown weight="bold" aria-hidden="true" />
      </span>
    </label>
  );
}

function CheckField({ checked, label, onChange }) {
  return <label className="check-field"><input type="checkbox" checked={checked} onChange={onChange} /><span aria-hidden="true" />{label}</label>;
}

function PropertyCard({ estate, liked, onLike, onOpen, layout }) {
  return (
    <article className={`browse-card ${layout === "list" ? "list-card" : ""}`} onClick={() => onOpen(estate.link)}>
      <div className="browse-card-media">
        <img {...responsiveImageProps(estate.image, layout === "list" ? "(max-width: 760px) 100vw, 42vw" : "(max-width: 760px) 100vw, 34vw")} loading="lazy" decoding="async" alt={`${estate.title} GPU compute product`} style={{ objectPosition: estate.imagePosition }} />
        <div className="browse-card-shade" />
        <span className="browse-card-tag">{estate.tag}</span>
        <button className={`browse-heart ${liked ? "liked" : ""}`} onClick={(event) => { event.stopPropagation(); onLike(estate.title); }} aria-label={`Save ${estate.title}`}><Heart weight={liked ? "fill" : "regular"} /></button>
        <div className="browse-card-copy">
          <div className="browse-card-title"><h3>{estate.title}</h3><strong>{estate.price}</strong></div>
          <p><MapPin weight="fill" /> {estate.location}</p>
        </div>
      </div>
      <div className="browse-card-specs">
        <span><GraphicsCard weight="duotone" /> {estate.gpuModel}</span>
        <span><Memory weight="duotone" /> {estate.vram}</span>
        <span><CalendarBlank weight="duotone" /> {estate.hostingTerm}</span>
      </div>
    </article>
  );
}

export function EstatesPage({ onNavigate, onNotice, settings = defaultProductSettings }) {
  const catalog = useMemo(() => settings.items.filter((item) => item.enabled !== false), [settings.items]);
  const propertyTypes = useMemo(() => [...new Set(catalog.map((item) => item.type).filter(Boolean))], [catalog]);
  const featureOptions = useMemo(() => [...new Set(catalog.flatMap((item) => item.features ?? []))], [catalog]);
  const [location, setLocation] = useState("All Locations");
  const [types, setTypes] = useState(() => new Set());
  const [maxPrice, setMaxPrice] = useState(50);
  const [bedrooms, setBedrooms] = useState("Any");
  const [features, setFeatures] = useState(() => new Set());
  const [sort, setSort] = useState(settings.browser.defaultSort);
  const [layout, setLayout] = useState("grid");
  const [liked, setLiked] = useState(() => new Set());

  if (settings.hero.enabled && settings.hero.image) {
    preload(preloadImageUrl(settings.hero.image), { as: "image", fetchPriority: "high" });
  }

  useEffect(() => {
    setSort(settings.browser.defaultSort);
  }, [settings.browser.defaultSort]);

  const toggleSet = (setter, value) => setter((current) => {
    const next = new Set(current);
    if (next.has(value)) next.delete(value); else next.add(value);
    return next;
  });

  const visibleEstates = useMemo(() => {
    const minimumBeds = bedrooms === "Any" ? 0 : Number(bedrooms);
    const filtered = catalog.filter((estate) => {
      if (location !== "All Locations" && estate.locationGroup !== location) return false;
      if (types.size && !types.has(estate.type)) return false;
      if (estate.priceValue > maxPrice) return false;
      if (Number(estate.beds) < minimumBeds) return false;
      if (features.size && ![...features].every((feature) => (estate.features ?? []).includes(feature))) return false;
      return true;
    });
    return filtered.toSorted((a, b) => sort === "high" ? b.priceValue - a.priceValue : a.priceValue - b.priceValue);
  }, [bedrooms, catalog, features, location, maxPrice, sort, types]);

  const resultCount = visibleEstates.length;

  const clearFilters = () => {
    setLocation("All Locations");
    setTypes(new Set());
    setMaxPrice(50);
    setBedrooms("Any");
    setFeatures(new Set());
  };

  const toggleLike = (title) => setLiked((current) => {
    const next = new Set(current);
    if (next.has(title)) next.delete(title); else next.add(title);
    return next;
  });

  const openLink = (link) => {
    const target = String(link || "").trim();
    if (!target) return;
    if (/^https?:\/\//i.test(target)) {
      window.location.assign(target);
      return;
    }
    if (target.startsWith("#")) {
      onNavigate("home");
      window.setTimeout(() => document.querySelector(target)?.scrollIntoView({ behavior: "smooth" }), 0);
      return;
    }
    onNavigate(target);
  };

  return (
    <div className="estates-page">
      {settings.hero.enabled ? <section className="estates-hero">
        <GpuHeroCarousel image={settings.hero.image} />
        <div className="estates-hero-content shell">
          <h1>{settings.hero.title}</h1>
          <p>{settings.hero.description}</p>
          <div className="breadcrumb"><button onClick={() => onNavigate("home")}>{settings.hero.homeLabel}</button><span>›</span><strong>{settings.hero.currentLabel}</strong></div>
        </div>
      </section> : null}

      {settings.browser.enabled ? <section className={`estate-browser shell ${settings.browser.showFilters ? "" : "no-filters"}`} aria-label="Estate catalog">
        {settings.browser.showFilters ? <aside className="filter-panel">
          <div className="filter-title"><strong>{settings.browser.filterTitle}</strong><SlidersHorizontal weight="bold" /></div>
          <SelectField label="Location" value={location} onChange={(event) => setLocation(event.target.value)}>
            {["All Locations", "California", "Malibu", "Rocky Alps", "Bali", "Amalfi Coast", "Mauritius"].map((option) => <option key={option}>{option}</option>)}
          </SelectField>

          <fieldset className="filter-group">
            <legend>Property Type</legend>
            <CheckField checked={types.size === 0} label="All Types" onChange={() => setTypes(new Set())} />
            {propertyTypes.map((type) => <CheckField key={type} checked={types.has(type)} label={type} onChange={() => toggleSet(setTypes, type)} />)}
          </fieldset>

          <div className="price-filter">
            <span>Price Range</span>
            <div className="range-wrap"><input aria-label="Maximum price in millions" type="range" min="1" max="50" step="1" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} /></div>
            <div className="range-labels"><span>$500K</span><span>{maxPrice === 50 ? "$50M+" : `$${maxPrice}M`}</span></div>
          </div>

          <SelectField label="Bedrooms" value={bedrooms} onChange={(event) => setBedrooms(event.target.value)}>
            <option>Any</option><option value="3">3+</option><option value="4">4+</option><option value="5">5+</option><option value="6">6+</option>
          </SelectField>

          <fieldset className="filter-group feature-filter">
            <legend>Features</legend>
            {featureOptions.map((feature) => <CheckField key={feature} checked={features.has(feature)} label={feature} onChange={() => toggleSet(setFeatures, feature)} />)}
          </fieldset>
          <button className="clear-filters" onClick={clearFilters}>{settings.browser.clearLabel} <span aria-hidden="true">◯</span></button>
        </aside> : null}

        <div className="catalog-results">
          <div className="catalog-toolbar">
            <h2>{settings.browser.resultTitle.replace("{count}", String(resultCount))}</h2>
            <div className="catalog-controls">
              {settings.browser.showSort ? <><span>{settings.browser.sortLabel}</span>
              <span className="sort-select"><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="high">Price: High to Low</option><option value="low">Price: Low to High</option></select><CaretDown weight="bold" /></span></> : null}
              <div className="layout-toggle" aria-label="Layout">
                <button className={layout === "grid" ? "active" : ""} onClick={() => setLayout("grid")} aria-label="Grid view"><SquaresFour weight="fill" /></button>
                <button className={layout === "list" ? "active" : ""} onClick={() => setLayout("list")} aria-label="List view"><ListBullets weight="bold" /></button>
              </div>
            </div>
          </div>

          {visibleEstates.length ? (
            <div className={`browse-grid ${layout === "list" ? "list-layout" : ""}`}>
              {visibleEstates.map((estate) => <PropertyCard key={estate.id} estate={estate} liked={liked.has(estate.title)} onLike={toggleLike} onOpen={openLink} layout={layout} />)}
            </div>
          ) : (
            <div className="empty-estates"><Sparkle /><h3>{settings.browser.emptyTitle}</h3><button onClick={clearFilters}>{settings.browser.clearLabel}</button></div>
          )}
        </div>
      </section> : null}

      {settings.cta.enabled ? <section className="catalog-cta shell">
        <Sparkle weight="thin" />
        <div><h2>{settings.cta.title}</h2><p>{settings.cta.description}</p></div>
        <button className="consult-button" onClick={() => openLink(settings.cta.primaryButton.link)}>{settings.cta.primaryButton.label} <span><ArrowRight weight="bold" /></span></button>
        <button className="custom-listings" onClick={() => openLink(settings.cta.secondaryButton.link)}>{settings.cta.secondaryButton.label}</button>
      </section> : null}
    </div>
  );
}
