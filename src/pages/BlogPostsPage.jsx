import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FilePlus2, Save, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageControls } from "@/components/ImageControls.jsx";
import { deleteBlogPost, getAdminBlogPosts, saveBlogPost } from "../lib/platformData.js";

const today = () => new Date().toISOString().slice(0, 10);
const createPost = () => ({
  slug: `article-${Date.now()}`,
  title: "",
  excerpt: "",
  content: "",
  category: "算力资讯",
  author_name: "Aether Lane",
  author_avatar: "",
  image_url: "/images/hero-galaxy-home.png",
  image_position: "50% 50%",
  published_at: today(),
  read_time_minutes: 5,
  featured: false,
  editors_pick: false,
  display_order: 0,
  published: false,
});

function TextField({ id, label, value, onChange, description, type = "text", textarea = false, disabled = false }) {
  const Control = textarea ? Textarea : Input;
  return (
    <Field className="home-control">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Control id={id} type={textarea ? undefined : type} value={value ?? ""} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  );
}

function ToggleField({ id, label, description, checked, onChange }) {
  return (
    <Field className="toggle-field" orientation="horizontal">
      <div><FieldLabel htmlFor={id}>{label}</FieldLabel>{description ? <FieldDescription>{description}</FieldDescription> : null}</div>
      <Switch id={id} size="sm" checked={checked} onCheckedChange={onChange} />
    </Field>
  );
}

export function BlogPostsPage({ onNotice }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["admin-blog-posts"], queryFn: getAdminBlogPosts, staleTime: 15_000 });
  const [selectedSlug, setSelectedSlug] = useState("");
  const [draft, setDraft] = useState(createPost);
  const [isNew, setIsNew] = useState(true);

  useEffect(() => {
    if (!query.data?.length || selectedSlug) return;
    setSelectedSlug(query.data[0].slug);
    setDraft(query.data[0]);
    setIsNew(false);
  }, [query.data, selectedSlug]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    void queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
    void queryClient.invalidateQueries({ queryKey: ["blog-post"] });
  };

  const saveMutation = useMutation({
    mutationFn: saveBlogPost,
    onSuccess: (saved) => {
      setSelectedSlug(saved.slug);
      setDraft(saved);
      setIsNew(false);
      refresh();
      onNotice(saved.published ? "文章已保存并发布到网站与 APP" : "文章草稿已保存");
    },
    onError: (error) => onNotice(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBlogPost,
    onSuccess: () => {
      setSelectedSlug("");
      setDraft(createPost());
      setIsNew(true);
      refresh();
      onNotice("文章已删除，网站与 APP 将自动同步");
    },
    onError: (error) => onNotice(error.message),
  });

  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const selectPost = (post) => {
    setSelectedSlug(post.slug);
    setDraft(post);
    setIsNew(false);
  };
  const startNew = () => {
    setSelectedSlug("");
    setDraft(createPost());
    setIsNew(true);
  };

  if (query.isPending) return <Card><CardContent>正在读取文章总控数据...</CardContent></Card>;
  if (query.isError) return <Card><CardContent>文章读取失败：{query.error.message}</CardContent></Card>;

  return (
    <div className="blog-posts-admin">
      <aside className="blog-posts-list">
        <Button size="sm" onClick={startNew}><FilePlus2 />新建文章</Button>
        <div>
          {query.data.map((post) => (
            <button className={selectedSlug === post.slug ? "active" : ""} type="button" key={post.slug} onClick={() => selectPost(post)}>
              <span>{post.title || "未命名文章"}</span>
              <small>{post.category} · {post.published_at}</small>
              <Badge variant={post.published ? "secondary" : "outline"}>{post.published ? "已发布" : "草稿"}</Badge>
            </button>
          ))}
          {!query.data.length ? <p>尚无文章，请新建第一篇内容。</p> : null}
        </div>
      </aside>

      <Card className="blog-post-editor">
        <CardHeader>
          <div>
            <CardTitle>{isNew ? "新建文章" : "编辑文章"}</CardTitle>
            <CardDescription>保存后写入生产 Supabase；开启发布会同步到 ai.suxin.ai 和 Android APP。</CardDescription>
          </div>
          {!isNew ? (
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="outline" size="sm"><Trash2 />删除</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>删除“{draft.title}”？</AlertDialogTitle><AlertDialogDescription>文章会从网站和 APP 移除，操作不可撤销。</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => deleteMutation.mutate(draft.slug)}>确认删除</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </CardHeader>
        <CardContent className="blog-post-editor-content">
          <div className="home-fields-grid">
            <TextField id="post-title" label="文章标题" value={draft.title} onChange={(value) => update("title", value)} />
            <TextField id="post-slug" label="文章 Slug" value={draft.slug} disabled={!isNew} onChange={(value) => update("slug", value)} description={isNew ? "仅支持小写字母、数字和连字符" : "已保存文章的 Slug 不可修改"} />
            <TextField id="post-category" label="分类" value={draft.category} onChange={(value) => update("category", value)} />
            <TextField id="post-author" label="作者" value={draft.author_name} onChange={(value) => update("author_name", value)} />
            <TextField id="post-date" label="发布日期" type="date" value={draft.published_at} onChange={(value) => update("published_at", value)} />
            <TextField id="post-read-time" label="阅读分钟数" type="number" value={draft.read_time_minutes} onChange={(value) => update("read_time_minutes", value)} />
            <TextField id="post-order" label="显示顺序" type="number" value={draft.display_order} onChange={(value) => update("display_order", value)} />
            <TextField id="post-avatar" label="作者头像 URL" value={draft.author_avatar} onChange={(value) => update("author_avatar", value)} />
          </div>
          <TextField id="post-excerpt" label="文章摘要" textarea value={draft.excerpt} onChange={(value) => update("excerpt", value)} />
          <TextField id="post-content" label="文章正文" textarea value={draft.content} onChange={(value) => update("content", value)} description="使用空行分隔段落；正文由总控直接发布到网站和 APP。" />
          <ImageControls
            prefix={`blog-post-${draft.slug}`}
            label="文章封面"
            image={draft.image_url}
            position={draft.image_position}
            onImage={(value) => update("image_url", value)}
            onPosition={(value) => update("image_position", value)}
            previewAspect="16 / 9"
          />
          <div className="blog-post-toggles">
            <ToggleField id="post-featured" label="设为精选文章" checked={draft.featured} onChange={(value) => update("featured", value)} />
            <ToggleField id="post-editors" label="设为编辑推荐" checked={draft.editors_pick} onChange={(value) => update("editors_pick", value)} />
            <ToggleField id="post-published" label="发布到网站与 APP" description="关闭时仅管理员可见" checked={draft.published} onChange={(value) => update("published", value)} />
          </div>
          <div className="blog-post-actions">
            <Button size="sm" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate(draft)}><Save />{saveMutation.isPending ? "保存中..." : draft.published ? "保存并发布" : "保存草稿"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
