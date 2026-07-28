import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock3, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBlogPost, getCachedBlogPosts } from "../lib/platformData.js";
import { responsiveImageProps } from "../lib/assets.js";

const formatDate = (value) => new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
}).format(new Date(`${value}T00:00:00`));

export function BlogArticlePage({ slug, onNavigate }) {
  const cachedPost = useMemo(() => getCachedBlogPosts()?.find((post) => post.slug === slug), [slug]);
  const query = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: () => getBlogPost(slug),
    initialData: cachedPost,
    initialDataUpdatedAt: 0,
    staleTime: 30_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });
  const post = query.data;

  if (query.isPending && !post) return <div className="blog-article-state">正在读取文章...</div>;
  if (query.isError) return <div className="blog-article-state">文章读取失败，请检查网络后重试。</div>;
  if (!post) return <div className="blog-article-state"><strong>文章不存在或尚未发布</strong><Button variant="outline" onClick={() => onNavigate("/blog")}>返回博客</Button></div>;

  const share = async () => {
    const url = `https://ai.suxin.ai/blog/${encodeURIComponent(post.slug)}`;
    if (navigator.share) {
      await navigator.share({ title: post.title, text: post.excerpt, url });
      return;
    }
    await navigator.clipboard.writeText(url);
  };

  return (
    <article className="blog-article-page">
      <div className="shell blog-article-shell">
        <Button className="blog-article-back" variant="ghost" size="sm" onClick={() => onNavigate("/blog")}><ArrowLeft />返回博客</Button>
        <header>
          <span>{post.category}</span>
          <h1>{post.title}</h1>
          <p>{post.excerpt}</p>
          <div>
            <span>{post.author_name}</span>
            <span>{formatDate(post.published_at)}</span>
            <span><Clock3 />{post.read_time_minutes} 分钟阅读</span>
            <Button variant="outline" size="xs" onClick={() => void share()}><Share2 />分享</Button>
          </div>
        </header>
        <img
          className="blog-article-cover"
          {...responsiveImageProps(post.image_url, "(max-width: 760px) 100vw, 956px")}
          alt=""
          style={{ objectPosition: post.image_position }}
        />
        <div className="blog-article-body">
          {(post.content || post.excerpt).split(/\n{2,}/).map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>)}
        </div>
      </div>
    </article>
  );
}
