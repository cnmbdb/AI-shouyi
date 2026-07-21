import { useEffect, useMemo, useState } from "react";
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

const asset = (path) => path?.startsWith("/")
  ? `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`
  : path;

const categoryOptions = [
  { label: "All", icon: SquaresFour },
  { label: "Architecture", icon: Buildings },
  { label: "Interiors", icon: Armchair },
  { label: "Lifestyle", icon: FlowerLotus },
  { label: "Market Insights", icon: ChartLineUp },
  { label: "Travel", icon: AirplaneTilt },
];

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
        <img src={asset(post.image_url)} alt="" style={{ objectPosition: post.image_position }} />
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
      <img src={asset(post.image_url)} alt="" style={{ objectPosition: post.image_position }} />
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

export function BlogPage({ onNotice }) {
  const [posts, setPosts] = useState(blogFallback);
  const [category, setCategory] = useState("All");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/blog/posts", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Posts request failed")))
      .then((payload) => {
        if (payload.posts?.length) setPosts(payload.posts);
      })
      .catch((error) => {
        if (error.name !== "AbortError") console.warn("Using local blog fallback data.");
      });

    return () => controller.abort();
  }, []);

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
      const response = await fetch("/api/blog/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Subscription failed");
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
      <section className="blog-hero">
        <div className="blog-hero-overlay" />
        <div className="shell blog-hero-content">
          <div className="blog-intro">
            <h1>Stories Above<br />the Skyline</h1>
            <p>Curated perspectives on design, architecture,<br />luxury living, travel, and the art of extraordinary spaces.</p>
          </div>

          {featured ? (
            <article className="featured-story">
              <div className="featured-media">
                <img src={asset(featured.image_url)} alt="" style={{ objectPosition: featured.image_position }} />
                <span className="featured-label">Featured</span>
              </div>
              <div className="featured-copy">
                <span className="featured-category">{featured.category}</span>
                <h2>{featured.title}</h2>
                <p>{featured.excerpt}</p>
              </div>
              <ArticleMeta post={featured} light />
              <button className="featured-button" type="button" onClick={() => openArticle(featured)}>
                Read Article <span><ArrowRight weight="bold" /></span>
              </button>
            </article>
          ) : null}
        </div>
      </section>

      <section className="shell blog-content">
        <div className="category-tabs" role="tablist" aria-label="Article categories">
          {categoryOptions.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={category === label ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={category === label}
              onClick={() => setCategory(label)}
            >
              <Icon />{label}
            </button>
          ))}
        </div>

        <div className="blog-grid">
          {articles.length ? articles.map((post) => <ArticleCard key={post.slug} post={post} onOpen={openArticle} />) : (
            <div className="blog-empty">More {category} stories are being curated.</div>
          )}
        </div>

        <section className="editors-section">
          <div className="editors-heading">
            <div><h2>Editor's Picks</h2><p>Essential reads handpicked by our editorial team.</p></div>
            <button type="button" onClick={() => setCategory("All")}>View All Articles <ArrowRight weight="bold" /></button>
          </div>
          <div className="editors-grid">
            {editorsPicks.map((post) => <EditorsCard key={post.slug} post={post} onOpen={openArticle} />)}
          </div>
        </section>

        <section className="journal-panel" id="journal">
          <EnvelopeSimple className="journal-icon" />
          <div><h2>Join Our Journal</h2><p>Stay inspired with curated stories, insights, and exclusive updates.</p></div>
          <form onSubmit={subscribe}>
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email" aria-label="Email address" />
            <button type="submit" disabled={submitting}>Subscribe <span><ArrowRight weight="bold" /></span></button>
            <small>No spam. Unsubscribe anytime.</small>
          </form>
        </section>
      </section>
    </div>
  );
}
