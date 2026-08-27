import { useEffect, useMemo, useRef, useState } from "react";
import { preload } from "react-dom";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import {
  ArrowRight,
  ArrowCounterClockwise,
  CalendarBlank,
  CaretDown,
  CurrencyDollar,
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
import { resolveManagedLink } from "../lib/managedLink.js";

gsap.registerPlugin(useGSAP);

const HERO_CARD_COUNT = 5;
const HERO_CAROUSEL_TRANSITION = 0.9;
const HERO_CAROUSEL_WRAP_DEPTH = -320;

const carouselSlot = (index, activeIndex) => {
  let difference = (index - activeIndex + HERO_CARD_COUNT) % HERO_CARD_COUNT;
  if (difference > 2) difference -= HERO_CARD_COUNT;
  return difference;
};

function GpuHeroCarousel({ cards, intervalSeconds, aspectRatio, onCardOpen }) {
  const rootRef = useRef(null);
  const shellRefs = useRef([]);
  const cardRefs = useRef([]);
  const timelineRef = useRef(null);
  const hoveredCardRef = useRef(null);
  const reducedMotionRef = useRef(false);

  const { contextSafe } = useGSAP(() => {
    const shells = gsap.utils.toArray(".gpu-carousel-card-shell", rootRef.current);
    if (shells.length !== HERO_CARD_COUNT) return undefined;

    const media = gsap.matchMedia();

    media.add({
      isDesktop: "(min-width: 721px)",
      isMobile: "(max-width: 720px)",
      reduceMotion: "(prefers-reduced-motion: reduce)",
    }, (context) => {
      const { isMobile, reduceMotion } = context.conditions;
      const initialActiveIndex = 2;

      reducedMotionRef.current = reduceMotion;

      const cardState = (index, activeIndex) => {
        const slot = carouselSlot(index, activeIndex);
        const distance = Math.abs(slot);
        const direction = Math.sign(slot);
        const horizontalOffset = distance === 0 ? 0 : direction * (isMobile
          ? (distance === 1 ? 60 : 116)
          : (distance === 1 ? 66 : 122));
        return {
          xPercent: -50 + horizontalOffset,
          yPercent: -50,
          y: distance === 0 ? (isMobile ? 16 : 8) : distance === 1 ? (isMobile ? 27 : 16) : (isMobile ? 46 : 42),
          scale: distance === 0 ? 1 : distance === 1 ? (isMobile ? 0.8 : 0.78) : (isMobile ? 0.67 : 0.66),
          rotation: slot * (isMobile ? 4.8 : 4.5),
          rotationY: slot * (isMobile ? -1.5 : -2),
          autoAlpha: distance === 2 ? 0.9 : 1,
          zIndex: 50 - distance * 10,
          transformOrigin: "50% 50%",
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
        defaults: { duration: HERO_CAROUSEL_TRANSITION, ease: "power3.inOut", overwrite: "auto" },
      });

      for (let step = 1; step <= HERO_CARD_COUNT; step += 1) {
        const previousActiveIndex = (initialActiveIndex + step - 1) % HERO_CARD_COUNT;
        const activeIndex = (initialActiveIndex + step) % HERO_CARD_COUNT;
        const wrappingIndex = shells.findIndex((_, index) => carouselSlot(index, previousActiveIndex) === -2);
        const label = `carousel-step-${step}`;
        const targetStates = shells.map((_, index) => cardState(index, activeIndex));

        timeline.addLabel(label, timeline.duration() + intervalSeconds - HERO_CAROUSEL_TRANSITION);

        shells.forEach((shell, index) => {
          const { zIndex, ...motionState } = targetStates[index];
          const isWrapping = index === wrappingIndex;
          timeline.set(shell, {
            zIndex: isWrapping ? 0 : zIndex,
            z: isWrapping ? HERO_CAROUSEL_WRAP_DEPTH : 0,
            pointerEvents: isWrapping ? "none" : "auto",
          }, label);
          timeline.to(shell, isWrapping ? { ...motionState, z: HERO_CAROUSEL_WRAP_DEPTH } : motionState, label);
        });

        timeline.set(
          shells[wrappingIndex],
          { z: 0, zIndex: targetStates[wrappingIndex].zIndex, pointerEvents: "auto" },
          `${label}+=${HERO_CAROUSEL_TRANSITION}`,
        );
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
  }, { scope: rootRef, dependencies: [intervalSeconds], revertOnUpdate: true });

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
        y: cardIndex === index ? -52 : 0,
        scale: cardIndex === index ? 1.1 : 0.96,
        rotation: cardIndex === index ? -shellRotation : 0,
        rotationX: cardIndex === index ? -4 : 0,
        autoAlpha: cardIndex === index ? 1 : 0.58,
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
    <div className="gpu-hero-carousel" ref={rootRef} aria-label="GPU compute card carousel" style={{ "--gpu-card-aspect": aspectRatio }}>
      {cards.map((card, index) => (
        <button
          className="gpu-carousel-card-shell"
          key={card.id}
          ref={(node) => { shellRefs.current[index] = node; }}
          type="button"
          aria-label={`GPU 算力卡片 ${index + 1}，悬停或聚焦可暂停轮播，点击跳转`}
          onClick={() => onCardOpen(card.link)}
          onPointerEnter={() => holdCard(index)}
          onPointerLeave={() => releaseCard(index)}
          onPointerCancel={() => releaseCard(index)}
          onFocus={() => holdCard(index)}
          onBlur={() => releaseCard(index)}
        >
          <span className="gpu-carousel-card" ref={(node) => { cardRefs.current[index] = node; }}>
            <img
              {...responsiveImageProps(card.image, "(max-width: 720px) 50vw, 27vw")}
              alt={`GPU data center compute card ${index + 1}`}
              loading="eager"
              decoding="async"
              fetchPriority={index === 2 ? "high" : "auto"}
              draggable="false"
              style={{ objectPosition: card.imagePosition }}
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
      {label ? <span className="catalog-field-label">{label}</span> : null}
      <span className="select-shell">
        <select value={value} onChange={onChange}>{children}</select>
        <CaretDown weight="bold" aria-hidden="true" />
      </span>
    </label>
  );
}

function FilterLabel({ icon: Icon, children }) {
  return <span className="filter-control-label"><Icon weight="fill" aria-hidden="true" />{children}</span>;
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
        <span className="browse-card-spec"><GraphicsCard weight="fill" /><span className="browse-card-spec-value">{estate.gpuModel}</span></span>
        <span className="browse-card-spec"><Memory weight="fill" /><span className="browse-card-spec-value">{estate.vram}</span></span>
        <span className="browse-card-spec"><CalendarBlank weight="fill" /><span className="browse-card-spec-value">{estate.hostingTerm}</span></span>
      </div>
    </article>
  );
}

export function EstatesPage({ onNavigate, onNotice, settings = defaultProductSettings }) {
  const heroCards = useMemo(() => settings.hero.cards.map((card) => ({
    id: card.id,
    image: card.image,
    imagePosition: card.imagePosition,
    link: card.link,
  })), [settings.hero.cards]);
  const heroAspectRatio = "986 / 1410";
  const catalog = useMemo(() => settings.items.filter((item) => item.enabled !== false), [settings.items]);
  const regions = useMemo(() => [...new Set(catalog.map((item) => item.locationGroup).filter(Boolean))], [catalog]);
  const gpuModels = useMemo(() => [...new Set(catalog.map((item) => item.gpuModel).filter(Boolean))], [catalog]);
  const vramOptions = useMemo(() => [...new Set(catalog.map((item) => item.vram).filter(Boolean))], [catalog]);
  const hostingTerms = useMemo(() => [...new Set(catalog.map((item) => item.hostingTerm).filter(Boolean))], [catalog]);
  const catalogPriceRange = useMemo(() => {
    const prices = catalog.map((item) => Number(item.priceValue)).filter(Number.isFinite);
    return { min: prices.length ? Math.min(...prices) : 0, max: prices.length ? Math.max(...prices) : 1 };
  }, [catalog]);
  const [region, setRegion] = useState("all");
  const [gpuModel, setGpuModel] = useState("all");
  const [vram, setVram] = useState("all");
  const [hostingTerm, setHostingTerm] = useState("all");
  const [priceCap, setPriceCap] = useState(null);
  const [sort, setSort] = useState(settings.browser.defaultSort);
  const [layout, setLayout] = useState("grid");
  const [liked, setLiked] = useState(() => new Set());

  if (settings.hero.enabled && heroCards[2]?.image) {
    preload(preloadImageUrl(heroCards[2].image), { as: "image", fetchPriority: "high" });
  }

  useEffect(() => {
    setSort(settings.browser.defaultSort);
  }, [settings.browser.defaultSort]);

  useEffect(() => {
    setPriceCap((current) => current !== null && current >= catalogPriceRange.max ? null : current);
  }, [catalogPriceRange.max]);

  const visibleEstates = useMemo(() => {
    const filtered = catalog.filter((estate) => {
      if (region !== "all" && estate.locationGroup !== region) return false;
      if (gpuModel !== "all" && estate.gpuModel !== gpuModel) return false;
      if (vram !== "all" && estate.vram !== vram) return false;
      if (hostingTerm !== "all" && estate.hostingTerm !== hostingTerm) return false;
      if (priceCap !== null && Number(estate.priceValue) > priceCap) return false;
      return true;
    });
    return filtered.toSorted((a, b) => sort === "high" ? b.priceValue - a.priceValue : a.priceValue - b.priceValue);
  }, [catalog, gpuModel, hostingTerm, priceCap, region, sort, vram]);

  const resultCount = visibleEstates.length;
  const activeFilterCount = [region, gpuModel, vram, hostingTerm].filter((value) => value !== "all").length + (priceCap === null ? 0 : 1);

  const formatPriceValue = (value) => {
    const exactPrice = catalog.find((item) => Number(item.priceValue) === Number(value))?.price;
    if (exactPrice) return exactPrice;
    const samplePrice = catalog.find((item) => item.price)?.price ?? "";
    if (/^\$[\d,.]+M$/i.test(samplePrice)) return `$${Number(value).toFixed(1)}M`;
    if (/^¥/.test(samplePrice)) return `¥${Number(value).toLocaleString()}`;
    return String(Number(value).toLocaleString());
  };

  const clearFilters = () => {
    setRegion("all");
    setGpuModel("all");
    setVram("all");
    setHostingTerm("all");
    setPriceCap(null);
  };

  const toggleLike = (title) => setLiked((current) => {
    const next = new Set(current);
    if (next.has(title)) next.delete(title); else next.add(title);
    return next;
  });

  const openLink = (link) => {
    const resolved = resolveManagedLink(link);
    if (resolved.kind === "empty" || resolved.kind === "invalid") return;
    if (resolved.kind === "external") {
      window.location.assign(resolved.target);
      return;
    }
    if (resolved.kind === "section") {
      onNavigate("home");
      window.setTimeout(() => document.querySelector(resolved.target)?.scrollIntoView({ behavior: "smooth" }), 0);
      return;
    }
    onNavigate(resolved.target);
  };

  return (
    <div className="estates-page">
      {settings.hero.enabled ? <section className="estates-hero" style={{
        "--estates-hero-height": `${settings.hero.desktopHeight}px`,
        "--estates-hero-mobile-height": `${settings.hero.mobileHeight}px`,
        "--gpu-card-width": `${settings.hero.desktopCardWidth}px`,
        "--gpu-card-mobile-width": `${settings.hero.mobileCardWidth}px`,
      }}>
        <GpuHeroCarousel cards={heroCards} intervalSeconds={settings.hero.intervalSeconds} aspectRatio={heroAspectRatio} onCardOpen={openLink} />
      </section> : null}

      {settings.browser.enabled ? <section className={`estate-browser shell ${settings.browser.showFilters ? "" : "no-filters"} ${settings.hero.enabled ? "" : "hero-hidden"}`} aria-label="GPU compute catalog">
        {settings.browser.showFilters ? <aside className="filter-panel">
          <div className="filter-title">
            <span className="filter-title-icon"><SlidersHorizontal weight="bold" aria-hidden="true" /></span>
            <span className="filter-title-copy"><strong>{settings.browser.filterTitle}</strong><small>{settings.browser.filterDescription}</small></span>
            <span className={`filter-active-count ${activeFilterCount ? "active" : ""}`} aria-label={`已启用 ${activeFilterCount} 个筛选条件`}>{activeFilterCount}</span>
          </div>

          <div className="filter-controls">
            {settings.browser.showRegionFilter ? <SelectField label={<FilterLabel icon={MapPin}>{settings.browser.regionLabel}</FilterLabel>} value={region} onChange={(event) => setRegion(event.target.value)}>
              <option value="all">{settings.browser.allRegionsLabel}</option>
              {regions.map((option) => <option key={option} value={option}>{option}</option>)}
            </SelectField> : null}

            {settings.browser.showGpuFilter ? <SelectField label={<FilterLabel icon={GraphicsCard}>{settings.browser.gpuLabel}</FilterLabel>} value={gpuModel} onChange={(event) => setGpuModel(event.target.value)}>
              <option value="all">{settings.browser.allGpuLabel}</option>
              {gpuModels.map((option) => <option key={option} value={option}>{option}</option>)}
            </SelectField> : null}

            {settings.browser.showVramFilter ? <SelectField label={<FilterLabel icon={Memory}>{settings.browser.vramLabel}</FilterLabel>} value={vram} onChange={(event) => setVram(event.target.value)}>
              <option value="all">{settings.browser.allVramLabel}</option>
              {vramOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </SelectField> : null}

            {settings.browser.showTermFilter ? <SelectField label={<FilterLabel icon={CalendarBlank}>{settings.browser.termLabel}</FilterLabel>} value={hostingTerm} onChange={(event) => setHostingTerm(event.target.value)}>
              <option value="all">{settings.browser.anyTermLabel}</option>
              {hostingTerms.map((option) => <option key={option} value={option}>{option}</option>)}
            </SelectField> : null}

            {settings.browser.showPriceFilter ? <div className="price-filter">
              <span className="catalog-field-label"><FilterLabel icon={CurrencyDollar}>{settings.browser.priceLabel}</FilterLabel></span>
              <div className="range-wrap"><input aria-label={settings.browser.priceLabel} type="range" min={catalogPriceRange.min} max={catalogPriceRange.max} step="0.1" value={priceCap ?? catalogPriceRange.max} onChange={(event) => { const value = Number(event.target.value); setPriceCap(value >= catalogPriceRange.max ? null : value); }} /></div>
              <div className="range-labels"><span>{formatPriceValue(catalogPriceRange.min)}</span><strong>{priceCap === null ? settings.browser.unlimitedPriceLabel : `≤ ${formatPriceValue(priceCap)}`}</strong></div>
            </div> : null}
          </div>

          <button className="clear-filters" disabled={!activeFilterCount} onClick={clearFilters}><ArrowCounterClockwise weight="bold" aria-hidden="true" />{settings.browser.clearLabel}</button>
        </aside> : null}

        <div className="catalog-results">
          <div className="catalog-toolbar">
            <h2>{settings.browser.resultTitle.replace("{count}", String(resultCount))}</h2>
            <div className="catalog-controls">
              {settings.browser.showSort ? <><span>{settings.browser.sortLabel}</span>
              <span className="sort-select"><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="high">{settings.browser.sortHighLabel}</option><option value="low">{settings.browser.sortLowLabel}</option></select><CaretDown weight="bold" /></span></> : null}
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
        <Sparkle weight="fill" />
        <div><h2>{settings.cta.title}</h2><p>{settings.cta.description}</p></div>
        <button className="consult-button" onClick={() => openLink(settings.cta.primaryButton.link)}>{settings.cta.primaryButton.label} <span><ArrowRight weight="bold" /></span></button>
        <button className="custom-listings" onClick={() => openLink(settings.cta.secondaryButton.link)}>{settings.cta.secondaryButton.label}</button>
      </section> : null}
    </div>
  );
}
