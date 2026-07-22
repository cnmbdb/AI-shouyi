import { useEffect, useMemo, useState } from "react";
import { preload } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AirplaneTilt,
  Armchair,
  ArrowRight,
  Buildings,
  ChartLineUp,
  Clock,
  EnvelopeSimple,
  FlowerLotus,
  Sparkle,
  SquaresFour,
} from "@phosphor-icons/react";
import { blogFallback } from "../data/blogFallback.js";
import { defaultBlogSettings } from "../data/siteSettings.js";
import { getBlogPosts, subscribeNewsletter } from "../lib/platformData.js";
import { assetUrl, preloadImageUrl, responsiveImageProps } from "../lib/assets.js";

const categoryIcons = { SquaresFour, Buildings, Armchair, FlowerLotus, ChartLineUp, AirplaneTilt };

const formatDate = (value) => new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
}).format(new Date(`${value}T00:00:00`));

function AuthorBadge({ post }) {
  if (post.author_avatar) {
    return <img src={post.author_avatar} alt="" />;
  }

  return <span className="blog-author-mark"><Sparkle weight="fill" /></span>;
}

function ArticleMeta({ post, light = false }) {
  return (
    <div className={`blog-meta${light ? " light" : ""}`}>
      <span className="blog-author"><AuthorBadge post={post} />{post.author_name}</span>
      <span>{formatDate(post.published_at)}</span>
      <span><Clock weight="bold" />{post.read_time_minutes} min read</span>
    </div>
  );
}

function ArticleCard({ post, onOpen }) {
  return (
    <article className="blog-card">
      <div className="blog-card-media">
        <img {...responsiveImageProps(post.image_url, "(max-width: 760px) 100vw, 34vw")} loading="lazy" decoding="async" alt="" style={{ objectPosition: post.image_position }} />
        <span className="blog-pill">{post.category}</span>
      </div>
      <div className="blog-card-body">
        <h2>{post.title}</h2>
        <p>{post.excerpt}</p>
        <ArticleMeta post={post} />
        <button className="blog-card-arrow" type="button" onClick={() => onOpen(post)} aria-label={`Read ${post.title}`}>
          <ArrowRight weight="bold" />
        </button>
      </div>
    </article>
  );
}

function EditorsCard({ post, onOpen }) {
  return (
    <article className="editors-card">
      <img {...responsiveImageProps(post.image_url, "(max-width: 760px) 100vw, 34vw")} loading="lazy" decoding="async" alt="" style={{ objectPosition: post.image_position }} />
      <div className="editors-shade" />
      <span className="blog-pill">{post.category}</span>
      <div className="editors-copy">
        <h3>{post.title}</h3>
        <div>
          <span>{post.author_name}</span>
          <span>{formatDate(post.published_at)}</span>
          <span>{post.read_time_minutes} min read</span>
        </div>
      </div>
      <button type="button" onClick={() => onOpen(post)} aria-label={`Read ${post.title}`}><ArrowRight weight="bold" /></button>
    </article>
  );
}

export function BlogPage({ onNotice, settings = defaultBlogSettings }) {
  const [category, setCategory] = useState("All");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const postsQuery = useQuery({
    queryKey: ["blog-posts"],
    queryFn: getBlogPosts,
    retry: false,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    placeholderData: blogFallback,
  });
  const posts = postsQuery.data?.length ? postsQuery.data : blogFallback;

  if (settings.hero.enabled && settings.hero.backgroundImage) {
    preload(preloadImageUrl(settings.hero.backgroundImage), { as: "image", fetchPriority: "high" });
  }

  useEffect(() => {
    if (!settings.categories.items.some((item) => item.enabled !== false && item.value === category)) {
      setCategory(settings.categories.items.find((item) => item.enabled !== false)?.value ?? "All");
    }
  }, [category, settings.categories.items]);

  const featured = posts.find((post) => post.featured) ?? posts[0];
  const editorsPicks = posts.filter((post) => post.editors_pick);
  const articles = useMemo(() => posts.filter((post) => {
    if (post.featured || post.editors_pick) return false;
    return category === "All" || post.category === category;
  }), [category, posts]);

  const openArticle = (post) => onNotice(`${post.title} — article view ready to build next.`);

  const subscribe = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      onNotice("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await subscribeNewsletter(normalizedEmail);
      setEmail("");
      onNotice(result.alreadySubscribed ? "You're already on the journal list." : "Welcome to the Aether Lane journal.");
    } catch {
      onNotice("Subscription could not be saved. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="blog-page">
      {settings.hero.enabled || settings.featured.enabled ? <section className="blog-hero" style={settings.hero.backgroundImage ? { backgroundImage: `url(${assetUrl(settings.hero.backgroundImage, 1280)})`, backgroundPosition: settings.hero.backgroundPosition } : undefined}>
        <div className="blog-hero-overlay" />
        <div className="shell blog-hero-content">
          {settings.hero.enabled ? <div className="blog-intro">
            <h1 style={{ whiteSpace: "pre-line" }}>{settings.hero.title}</h1>
            <p>{settings.hero.description}</p>
          </div> : <div />}

          {settings.featured.enabled && featured ? (
            <article className="featured-story">
              <div className="featured-media">
                <img {...responsiveImageProps(featured.image_url, "(max-width: 760px) 100vw, 42vw")} loading="eager" decoding="async" fetchPriority="high" alt="" style={{ objectPosition: featured.image_position }} />
                <span className="featured-label">{settings.featured.label}</span>
              </div>
              <div className="featured-copy">
                <span className="featured-category">{featured.category}</span>
                <h2>{featured.title}</h2>
                <p>{featured.excerpt}</p>
              </div>
              <ArticleMeta post={featured} light />
              <button className="featured-button" type="button" onClick={() => openArticle(featured)}>
                {settings.featured.buttonLabel} <span><ArrowRight weight="bold" /></span>
              </button>
            </article>
          ) : null}
        </div>
      </section> : null}

      <section className="shell blog-content">
        {settings.categories.enabled ? <div className="category-tabs" role="tablist" aria-label="Article categories">
          {settings.categories.items.filter((item) => item.enabled !== false).map(({ id, label, value, icon }) => {
            const Icon = categoryIcons[icon] ?? SquaresFour;
            return (
            <button
              key={id}
              className={category === value ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={category === value}
              onClick={() => setCategory(value)}
            >
              <Icon />{label}
            </button>
          ); })}
        </div> : null}

        {settings.articles.enabled ? <div className="blog-grid">
          {articles.length ? articles.map((post) => <ArticleCard key={post.slug} post={post} onOpen={openArticle} />) : (
            <div className="blog-empty">{settings.articles.emptyText.replace("{category}", category)}</div>
          )}
        </div> : null}

        {settings.editors.enabled ? <section className="editors-section">
          <div className="editors-heading">
            <div><h2>{settings.editors.title}</h2><p>{settings.editors.description}</p></div>
            <button type="button" onClick={() => setCategory("All")}>{settings.editors.buttonLabel} <ArrowRight weight="bold" /></button>
          </div>
          <div className="editors-grid">
            {editorsPicks.map((post) => <EditorsCard key={post.slug} post={post} onOpen={openArticle} />)}
          </div>
        </section> : null}

        {settings.newsletter.enabled ? <section className="journal-panel" id="journal">
          <EnvelopeSimple className="journal-icon" />
          <div><h2>{settings.newsletter.title}</h2><p>{settings.newsletter.description}</p></div>
          <form onSubmit={subscribe}>
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder={settings.newsletter.placeholder} aria-label="Email address" />
            <button type="submit" disabled={submitting}>{settings.newsletter.buttonLabel} <span><ArrowRight weight="bold" /></span></button>
            <small>{settings.newsletter.privacyText}</small>
          </form>
        </section> : null}
      </section>
    </div>
  );
}
