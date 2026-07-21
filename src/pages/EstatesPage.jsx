import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bathtub,
  Bed,
  CaretDown,
  Heart,
  ListBullets,
  MapPin,
  Ruler,
  SlidersHorizontal,
  Sparkle,
  SquaresFour,
} from "@phosphor-icons/react";
import { estateCatalog, featureOptions, propertyTypes } from "../data/estateCatalog.js";

const asset = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;

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

function PropertyCard({ estate, liked, onLike, layout }) {
  return (
    <article className={`browse-card ${layout === "list" ? "list-card" : ""}`}>
      <div className="browse-card-media">
        <img src={asset(estate.image)} alt={`${estate.title} luxury estate`} style={{ objectPosition: estate.position }} />
        <div className="browse-card-shade" />
        <span className="browse-card-tag">{estate.tag}</span>
        <button className={`browse-heart ${liked ? "liked" : ""}`} onClick={() => onLike(estate.title)} aria-label={`Save ${estate.title}`}><Heart weight={liked ? "fill" : "regular"} /></button>
        <div className="browse-card-copy">
          <div className="browse-card-title"><h3>{estate.title}</h3><strong>{estate.price}</strong></div>
          <p><MapPin weight="fill" /> {estate.location}</p>
        </div>
      </div>
      <div className="browse-card-specs">
        <span><Bed /> {estate.beds} Beds</span>
        <span><Bathtub /> {estate.baths} Baths</span>
        <span><Ruler /> {estate.area}</span>
      </div>
    </article>
  );
}

export function EstatesPage({ onNavigate, onNotice }) {
  const [location, setLocation] = useState("All Locations");
  const [types, setTypes] = useState(() => new Set());
  const [maxPrice, setMaxPrice] = useState(50);
  const [bedrooms, setBedrooms] = useState("Any");
  const [features, setFeatures] = useState(() => new Set());
  const [sort, setSort] = useState("high");
  const [layout, setLayout] = useState("grid");
  const [liked, setLiked] = useState(() => new Set());

  const toggleSet = (setter, value) => setter((current) => {
    const next = new Set(current);
    if (next.has(value)) next.delete(value); else next.add(value);
    return next;
  });

  const visibleEstates = useMemo(() => {
    const minimumBeds = bedrooms === "Any" ? 0 : Number(bedrooms);
    const filtered = estateCatalog.filter((estate) => {
      if (location !== "All Locations" && estate.locationGroup !== location) return false;
      if (types.size && !types.has(estate.type)) return false;
      if (estate.priceValue > maxPrice) return false;
      if (estate.beds < minimumBeds) return false;
      if (features.size && ![...features].every((feature) => estate.features.includes(feature))) return false;
      return true;
    });
    return filtered.toSorted((a, b) => sort === "high" ? b.priceValue - a.priceValue : a.priceValue - b.priceValue);
  }, [bedrooms, features, location, maxPrice, sort, types]);

  const hasActiveFilters = location !== "All Locations" || types.size > 0 || maxPrice !== 50 || bedrooms !== "Any" || features.size > 0;
  const resultCount = hasActiveFilters ? visibleEstates.length : 24;

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

  return (
    <div className="estates-page">
      <section className="estates-hero" style={{ backgroundImage: `url(${asset("/images/estates-hero.png")})` }}>
        <div className="estates-hero-content shell">
          <h1>Explore Our Estates</h1>
          <p>Discover extraordinary properties in the world&apos;s most breathtaking locations.</p>
          <div className="breadcrumb"><button onClick={() => onNavigate("home")}>Home</button><span>›</span><strong>Estates</strong></div>
        </div>
      </section>

      <section className="estate-browser shell" aria-label="Estate catalog">
        <aside className="filter-panel">
          <div className="filter-title"><strong>Filter Estates</strong><SlidersHorizontal weight="bold" /></div>
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
          <button className="clear-filters" onClick={clearFilters}>Clear Filters <span aria-hidden="true">◯</span></button>
        </aside>

        <div className="catalog-results">
          <div className="catalog-toolbar">
            <h2>Found {resultCount} Exceptional Estates</h2>
            <div className="catalog-controls">
              <span>Sort by:</span>
              <span className="sort-select"><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="high">Price: High to Low</option><option value="low">Price: Low to High</option></select><CaretDown weight="bold" /></span>
              <div className="layout-toggle" aria-label="Layout">
                <button className={layout === "grid" ? "active" : ""} onClick={() => setLayout("grid")} aria-label="Grid view"><SquaresFour weight="fill" /></button>
                <button className={layout === "list" ? "active" : ""} onClick={() => setLayout("list")} aria-label="List view"><ListBullets weight="bold" /></button>
              </div>
            </div>
          </div>

          {visibleEstates.length ? (
            <div className={`browse-grid ${layout === "list" ? "list-layout" : ""}`}>
              {visibleEstates.map((estate) => <PropertyCard key={estate.title} estate={estate} liked={liked.has(estate.title)} onLike={toggleLike} layout={layout} />)}
            </div>
          ) : (
            <div className="empty-estates"><Sparkle /><h3>No estates match these filters.</h3><button onClick={clearFilters}>Clear filters</button></div>
          )}
        </div>
      </section>

      <section className="catalog-cta shell">
        <Sparkle weight="thin" />
        <div><h2>Can&apos;t Find What You&apos;re Looking For?</h2><p>Let our experts help you discover your perfect property.</p></div>
        <button className="consult-button" onClick={() => onNotice("Your private consultation request has been received.")}>Schedule a Consultation <span><ArrowRight weight="bold" /></span></button>
        <button className="custom-listings" onClick={() => onNotice("Custom listings are being prepared for you.")}>View Custom Listings</button>
      </section>
    </div>
  );
}
