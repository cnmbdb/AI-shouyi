import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageControls } from "@/components/ImageControls.jsx";
import { createHomeItem, defaultHomeSettings, homeIconOptions, normalizeHomeSettings } from "../data/homeSettings.js";
import { getSiteSettings, saveSiteSetting } from "../lib/platformData.js";

const clone = (value) => structuredClone(value);

function TextControl({ id, label, value, onChange, description, textarea = false, placeholder = "", type = "text" }) {
  const Control = textarea ? Textarea : Input;
  return (
    <Field className="home-control">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Control id={id} type={textarea ? undefined : type} value={value ?? ""} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  );
}

function IconControl({ id, value, onChange }) {
  return (
    <Field className="home-control">
      <FieldLabel htmlFor={id}>图标</FieldLabel>
      <Select value={value || "Cpu"} onValueChange={onChange}>
        <SelectTrigger id={id}><SelectValue /></SelectTrigger>
        <SelectContent><SelectGroup>{homeIconOptions.map(([name, label]) => <SelectItem value={name} key={name}>{label} · {name}</SelectItem>)}</SelectGroup></SelectContent>
      </Select>
    </Field>
  );
}

function LinkControl({ id, value, onChange }) {
  return <TextControl id={id} label="跳转链接" value={value} onChange={onChange} placeholder="/estates、#contact 或 https://..." />;
}

function SelectControl({ id, label, value, onChange, options, description }) {
  return (
    <Field className="home-control">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select value={String(value)} onValueChange={onChange}>
        <SelectTrigger id={id}><SelectValue /></SelectTrigger>
        <SelectContent><SelectGroup>{options.map(([optionValue, optionLabel]) => <SelectItem value={String(optionValue)} key={optionValue}>{optionLabel}</SelectItem>)}</SelectGroup></SelectContent>
      </Select>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  );
}

function SectionHeading({ title, description, count }) {
  return (
    <div className="home-section-heading">
      <div><strong>{title}</strong><span>{description}</span></div>
      {Number.isInteger(count) ? <Badge variant="outline">{count} 项</Badge> : null}
    </div>
  );
}

function SectionHeaderRow({ title, description, count, enabled, onEnabled }) {
  return (
    <div className="home-section-row">
      <AccordionTrigger><SectionHeading title={title} description={description} count={count} /></AccordionTrigger>
      <div className="home-section-toggle"><span>{enabled ? "显示" : "隐藏"}</span><Switch size="sm" checked={enabled} onCheckedChange={onEnabled} aria-label={`${title}显示状态`} /></div>
    </div>
  );
}

function DeleteItem({ label, onConfirm }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="ghost" size="icon-xs" aria-label={`删除${label}`}><Trash2 /></Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>删除“{label}”？</AlertDialogTitle><AlertDialogDescription>该项目会从首页移除，保存发布后生效。</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={onConfirm}>删除</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ItemCard({ title, subtitle, onDelete, children }) {
  return (
    <Card size="sm" className="home-item-card">
      <CardHeader><div><CardTitle>{title || "未命名项目"}</CardTitle><CardDescription>{subtitle}</CardDescription></div><DeleteItem label={title || "未命名项目"} onConfirm={onDelete} /></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function HomeSettingsPage({ onNotice }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["site-settings"], queryFn: getSiteSettings, staleTime: 30_000, refetchOnWindowFocus: false });
  const [settings, setSettings] = useState(() => clone(defaultHomeSettings));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!query.data?.settings) return;
    setSettings(normalizeHomeSettings(query.data.settings.home));
    setDirty(false);
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: (value) => saveSiteSetting("home", normalizeHomeSettings(value)),
    onSuccess: () => {
      queryClient.setQueryData(["public-settings"], (current) => ({ settings: { ...(current?.settings ?? {}), home: settings } }));
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      queryClient.invalidateQueries({ queryKey: ["public-settings"] });
      setDirty(false);
      onNotice("首页设置已保存并发布");
    },
    onError: (error) => onNotice(error.message),
  });

  const setSection = (section, value) => {
    setSettings((current) => ({ ...current, [section]: typeof value === "function" ? value(current[section]) : value }));
    setDirty(true);
  };
  const setField = (section, key, value) => setSection(section, (current) => ({ ...current, [key]: value }));
  const setNested = (section, parent, key, value) => setSection(section, (current) => ({ ...current, [parent]: { ...current[parent], [key]: value } }));
  const setItem = (section, collection, index, key, value) => setSection(section, (current) => ({ ...current, [collection]: current[collection].map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) }));
  const removeItem = (section, collection, index) => setSection(section, (current) => ({ ...current, [collection]: current[collection].filter((_, itemIndex) => itemIndex !== index) }));
  const addItem = (section, collection, template) => setSection(section, (current) => ({ ...current, [collection]: [...current[collection], createHomeItem(collection, template)] }));

  if (query.isLoading) return <Card className="home-settings-loading"><CardContent>正在读取首页配置...</CardContent></Card>;
  if (query.isError) return <Card className="home-settings-loading"><CardContent>读取失败：{query.error.message}</CardContent></Card>;

  return (
    <div className="home-settings-page">
      <Accordion className="home-settings-accordion" type="multiple" defaultValue={["hero"]}>
        <AccordionItem value="hero">
          <SectionHeaderRow title="首屏 Hero" description="背景图、主标题与左右文案" enabled={settings.hero.enabled} onEnabled={(value) => setField("hero", "enabled", value)} />
          <AccordionContent>
            <Card size="sm"><CardContent className="home-section-content">
              <div className="home-hero-device-grid">
                <section className="home-hero-device-panel">
                  <div className="home-hero-device-heading"><strong>电脑端</strong><span>独立图片、尺寸与裁剪</span></div>
                  <ImageControls
                    prefix="hero-bg-desktop"
                    label="电脑端背景图"
                    image={settings.hero.backgroundImage}
                    position={settings.hero.backgroundPosition}
                    zoom={settings.hero.desktopBackgroundZoom}
                    onImage={(value) => setField("hero", "backgroundImage", value)}
                    onPosition={(value) => setField("hero", "backgroundPosition", value)}
                    onZoom={(value) => setField("hero", "desktopBackgroundZoom", value)}
                    previewAspect="16 / 9"
                  />
                  <div className="home-fields-grid">
                    <TextControl id="hero-desktop-height" label="电脑端区块高度（px）" type="number" value={settings.hero.desktopHeight} description="范围 480–960。" onChange={(value) => setField("hero", "desktopHeight", Number(value))} />
                    <SelectControl id="hero-desktop-fit" label="电脑端图片适配" value={settings.hero.desktopBackgroundFit} options={[["cover", "铺满并裁剪（推荐）"], ["contain", "完整显示（可能留白）"]]} onChange={(value) => setField("hero", "desktopBackgroundFit", value)} />
                  </div>
                </section>
                <section className="home-hero-device-panel">
                  <div className="home-hero-device-heading"><strong>移动端</strong><span>留空图片时自动沿用电脑端</span></div>
                  <ImageControls
                    prefix="hero-bg-mobile"
                    label="移动端背景图"
                    image={settings.hero.mobileBackgroundImage}
                    fallbackImage={settings.hero.backgroundImage}
                    position={settings.hero.mobileBackgroundPosition}
                    zoom={settings.hero.mobileBackgroundZoom}
                    onImage={(value) => setField("hero", "mobileBackgroundImage", value)}
                    onPosition={(value) => setField("hero", "mobileBackgroundPosition", value)}
                    onZoom={(value) => setField("hero", "mobileBackgroundZoom", value)}
                    previewAspect={`100 / ${settings.hero.mobileAspectRatio ?? 75}`}
                  />
                  <div className="home-fields-grid">
                    <TextControl id="hero-mobile-width" label="移动端区块宽度（%）" type="number" value={settings.hero.mobileWidthPercent} description="范围 70–100，相对手机屏幕宽度。" onChange={(value) => setField("hero", "mobileWidthPercent", Number(value))} />
                    <TextControl id="hero-mobile-aspect" label="移动端高度 ÷ 宽度（%）" type="number" value={settings.hero.mobileAspectRatio} description="范围 60–260；当前 4:3 首图建议 75。" onChange={(value) => setField("hero", "mobileAspectRatio", Number(value))} />
                    <SelectControl id="hero-mobile-fit" label="移动端图片适配" value={settings.hero.mobileBackgroundFit} options={[["cover", "铺满并裁剪（推荐）"], ["contain", "完整显示（可能留白）"]]} onChange={(value) => setField("hero", "mobileBackgroundFit", value)} />
                  </div>
                </section>
              </div>
              <ImageControls prefix="hero-fg" label="电脑端前景图层" image={settings.hero.foregroundImage} position={settings.hero.foregroundPosition} onImage={(value) => setField("hero", "foregroundImage", value)} onPosition={(value) => setField("hero", "foregroundPosition", value)} previewAspect="16 / 9" />
              <div className="home-fields-grid"><TextControl id="hero-title" label="超大标题" value={settings.hero.title} onChange={(value) => setField("hero", "title", value)} /><TextControl id="hero-heading" label="左侧标题" value={settings.hero.heading} onChange={(value) => setField("hero", "heading", value)} /><TextControl id="hero-tagline" label="右侧文案" value={settings.hero.tagline} onChange={(value) => setField("hero", "tagline", value)} /></div>
              <TextControl id="hero-description" label="左侧介绍" value={settings.hero.description} textarea onChange={(value) => setField("hero", "description", value)} />
            </CardContent></Card>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="features">
          <SectionHeaderRow title="首屏四卡片" description="每张卡片的图片、文案与链接" count={settings.features.items.length} enabled={settings.features.enabled} onEnabled={(value) => setField("features", "enabled", value)} />
          <AccordionContent><Card size="sm"><CardContent className="home-section-content"><div className="home-fields-grid"><SelectControl id="features-mobile-columns" label="移动端每行卡片数" value={settings.features.mobileColumns} options={[[2, "每行 2 张"], [1, "每行 1 张"]]} onChange={(value) => setField("features", "mobileColumns", Number(value))} /><TextControl id="features-mobile-width" label="移动端区块宽度（%）" type="number" value={settings.features.mobileWidthPercent} description="范围 70–100，相对手机屏幕宽度。" onChange={(value) => setField("features", "mobileWidthPercent", Number(value))} /><TextControl id="features-mobile-aspect" label="卡片高度 ÷ 宽度（%）" type="number" value={settings.features.mobileCardAspectRatio} description="范围 80–260；双列建议 135–165。" onChange={(value) => setField("features", "mobileCardAspectRatio", Number(value))} /></div></CardContent></Card><div className="home-item-list">{settings.features.items.map((item, index) => <ItemCard key={item.id} title={item.title} subtitle={`卡片 ${index + 1}`} onDelete={() => removeItem("features", "items", index)}><TextControl id={`feature-title-${item.id}`} label="标题" value={item.title} onChange={(value) => setItem("features", "items", index, "title", value)} /><TextControl id={`feature-copy-${item.id}`} label="文案" textarea value={item.description} onChange={(value) => setItem("features", "items", index, "description", value)} /><ImageControls prefix={`feature-${item.id}`} image={item.image} position={item.imagePosition} onImage={(value) => setItem("features", "items", index, "image", value)} onPosition={(value) => setItem("features", "items", index, "imagePosition", value)} previewAspect={`100 / ${settings.features.mobileCardAspectRatio ?? 142}`} /><LinkControl id={`feature-link-${item.id}`} value={item.link} onChange={(value) => setItem("features", "items", index, "link", value)} /></ItemCard>)}</div><Button variant="outline" size="sm" onClick={() => addItem("features", "items", { icon: "GraphicsCard", title: "新卡片", description: "", image: "/images/hero-galaxy-home.png", imagePosition: "50% 50%", link: "/estates" })}><Plus />添加卡片</Button></AccordionContent>
        </AccordionItem>

        <AccordionItem value="about">
          <SectionHeaderRow title="品牌介绍" description="介绍文案、主图、按钮与特色图标" count={settings.about.benefits.length} enabled={settings.about.enabled} onEnabled={(value) => setField("about", "enabled", value)} />
          <AccordionContent><Card size="sm"><CardContent className="home-section-content"><div className="home-fields-grid"><TextControl id="about-eyebrow" label="眉题" value={settings.about.eyebrow} onChange={(value) => setField("about", "eyebrow", value)} /><TextControl id="about-title" label="标题" textarea value={settings.about.title} onChange={(value) => setField("about", "title", value)} /></div><TextControl id="about-description" label="介绍文案" textarea value={settings.about.description} onChange={(value) => setField("about", "description", value)} /><ImageControls prefix="about" image={settings.about.image} position={settings.about.imagePosition} onImage={(value) => setField("about", "image", value)} onPosition={(value) => setField("about", "imagePosition", value)} previewAspect="3 / 4" /><div className="home-button-grid"><TextControl id="about-button-label" label="按钮文案" value={settings.about.buttonLabel} onChange={(value) => setField("about", "buttonLabel", value)} /><LinkControl id="about-button-link" value={settings.about.buttonLink} onChange={(value) => setField("about", "buttonLink", value)} /></div></CardContent></Card><div className="home-item-list compact">{settings.about.benefits.map((item, index) => <ItemCard key={item.id} title={item.title} subtitle={`特色 ${index + 1}`} onDelete={() => removeItem("about", "benefits", index)}><div className="home-fields-grid"><TextControl id={`benefit-title-${item.id}`} label="标题" value={item.title} onChange={(value) => setItem("about", "benefits", index, "title", value)} /><IconControl id={`benefit-icon-${item.id}`} value={item.icon} onChange={(value) => setItem("about", "benefits", index, "icon", value)} /></div><TextControl id={`benefit-copy-${item.id}`} label="文案" textarea value={item.description} onChange={(value) => setItem("about", "benefits", index, "description", value)} /><LinkControl id={`benefit-link-${item.id}`} value={item.link} onChange={(value) => setItem("about", "benefits", index, "link", value)} /></ItemCard>)}</div><Button variant="outline" size="sm" onClick={() => addItem("about", "benefits", { icon: "GraphicsCard", title: "新特色", description: "", link: "#contact" })}><Plus />添加特色</Button></AccordionContent>
        </AccordionItem>

        <AccordionItem value="featured">
          <SectionHeaderRow title="精选项目" description="区块标题及三张项目卡片" count={settings.featured.items.length} enabled={settings.featured.enabled} onEnabled={(value) => setField("featured", "enabled", value)} />
          <AccordionContent><Card size="sm"><CardContent className="home-section-content"><div className="home-fields-grid"><TextControl id="featured-eyebrow" label="眉题" value={settings.featured.eyebrow} onChange={(value) => setField("featured", "eyebrow", value)} /><TextControl id="featured-title" label="区块标题" value={settings.featured.title} onChange={(value) => setField("featured", "title", value)} /></div><div className="home-button-grid"><TextControl id="featured-button-label" label="查看全部文案" value={settings.featured.buttonLabel} onChange={(value) => setField("featured", "buttonLabel", value)} /><LinkControl id="featured-button-link" value={settings.featured.buttonLink} onChange={(value) => setField("featured", "buttonLink", value)} /></div></CardContent></Card><div className="home-item-list">{settings.featured.items.map((item, index) => <ItemCard key={item.id} title={item.title} subtitle={`项目 ${index + 1}`} onDelete={() => removeItem("featured", "items", index)}><div className="home-fields-grid"><TextControl id={`estate-tag-${item.id}`} label="标签" value={item.tag} onChange={(value) => setItem("featured", "items", index, "tag", value)} /><TextControl id={`estate-title-${item.id}`} label="标题" value={item.title} onChange={(value) => setItem("featured", "items", index, "title", value)} /><TextControl id={`estate-location-${item.id}`} label="位置" value={item.location} onChange={(value) => setItem("featured", "items", index, "location", value)} /><TextControl id={`estate-price-${item.id}`} label="价格/数值" value={item.price} onChange={(value) => setItem("featured", "items", index, "price", value)} /></div><ImageControls prefix={`estate-${item.id}`} image={item.image} position={item.imagePosition} onImage={(value) => setItem("featured", "items", index, "image", value)} onPosition={(value) => setItem("featured", "items", index, "imagePosition", value)} previewAspect="16 / 10" /><LinkControl id={`estate-link-${item.id}`} value={item.link} onChange={(value) => setItem("featured", "items", index, "link", value)} /></ItemCard>)}</div><Button variant="outline" size="sm" onClick={() => addItem("featured", "items", { tag: "New", title: "新项目", location: "", price: "", image: "/images/hero-galaxy-home.png", imagePosition: "50% 50%", link: "/estates" })}><Plus />添加项目</Button></AccordionContent>
        </AccordionItem>

        <AccordionItem value="stats">
          <SectionHeaderRow title="数据统计" description="图标、数值、文案与点击链接" count={settings.stats.items.length} enabled={settings.stats.enabled} onEnabled={(value) => setField("stats", "enabled", value)} />
          <AccordionContent><div className="home-item-list compact">{settings.stats.items.map((item, index) => <ItemCard key={item.id} title={item.label} subtitle={`数据 ${index + 1}`} onDelete={() => removeItem("stats", "items", index)}><div className="home-fields-grid"><IconControl id={`stat-icon-${item.id}`} value={item.icon} onChange={(value) => setItem("stats", "items", index, "icon", value)} /><TextControl id={`stat-value-${item.id}`} label="数值" value={item.value} onChange={(value) => setItem("stats", "items", index, "value", value)} /><TextControl id={`stat-label-${item.id}`} label="文案" value={item.label} onChange={(value) => setItem("stats", "items", index, "label", value)} /><LinkControl id={`stat-link-${item.id}`} value={item.link} onChange={(value) => setItem("stats", "items", index, "link", value)} /></div></ItemCard>)}</div><Button variant="outline" size="sm" onClick={() => addItem("stats", "items", { icon: "DesktopTower", value: "0", label: "新数据", link: "/" })}><Plus />添加数据</Button></AccordionContent>
        </AccordionItem>

        <AccordionItem value="testimonials">
          <SectionHeaderRow title="用户评价" description="区块背景、评价文案、用户与链接" count={settings.testimonials.items.length} enabled={settings.testimonials.enabled} onEnabled={(value) => setField("testimonials", "enabled", value)} />
          <AccordionContent><Card size="sm"><CardContent className="home-section-content"><TextControl id="testimonial-eyebrow" label="区块眉题" value={settings.testimonials.eyebrow} onChange={(value) => setField("testimonials", "eyebrow", value)} /><ImageControls prefix="testimonial-bg" image={settings.testimonials.backgroundImage} position={settings.testimonials.backgroundPosition} onImage={(value) => setField("testimonials", "backgroundImage", value)} onPosition={(value) => setField("testimonials", "backgroundPosition", value)} previewAspect="1 / 1" /></CardContent></Card><div className="home-item-list">{settings.testimonials.items.map((item, index) => <ItemCard key={item.id} title={item.name} subtitle={`评价 ${index + 1}`} onDelete={() => removeItem("testimonials", "items", index)}><TextControl id={`testimonial-text-${item.id}`} label="评价文案" textarea value={item.text} onChange={(value) => setItem("testimonials", "items", index, "text", value)} /><div className="home-fields-grid"><TextControl id={`testimonial-name-${item.id}`} label="用户名称" value={item.name} onChange={(value) => setItem("testimonials", "items", index, "name", value)} /><TextControl id={`testimonial-role-${item.id}`} label="身份" value={item.role} onChange={(value) => setItem("testimonials", "items", index, "role", value)} /><TextControl id={`testimonial-rating-${item.id}`} label="星级（1-5）" value={String(item.rating)} onChange={(value) => setItem("testimonials", "items", index, "rating", Math.max(1, Math.min(5, Number(value) || 5)))} /></div><ImageControls prefix={`testimonial-avatar-${item.id}`} label="用户头像" image={item.avatar} position={item.avatarPosition} onImage={(value) => setItem("testimonials", "items", index, "avatar", value)} onPosition={(value) => setItem("testimonials", "items", index, "avatarPosition", value)} previewAspect="1 / 1" /><LinkControl id={`testimonial-link-${item.id}`} value={item.link} onChange={(value) => setItem("testimonials", "items", index, "link", value)} /></ItemCard>)}</div><Button variant="outline" size="sm" onClick={() => addItem("testimonials", "items", { rating: 5, text: "", name: "新用户", role: "客户", avatar: "", avatarPosition: "50% 50%", link: "#contact" })}><Plus />添加评价</Button></AccordionContent>
        </AccordionItem>

        <AccordionItem value="cta">
          <SectionHeaderRow title="底部行动区" description="图标、标题、介绍及两个按钮" enabled={settings.cta.enabled} onEnabled={(value) => setField("cta", "enabled", value)} />
          <AccordionContent><Card size="sm"><CardContent className="home-section-content"><div className="home-fields-grid"><IconControl id="cta-icon" value={settings.cta.icon} onChange={(value) => setField("cta", "icon", value)} /><TextControl id="cta-title" label="标题" value={settings.cta.title} onChange={(value) => setField("cta", "title", value)} /></div><TextControl id="cta-description" label="文案" value={settings.cta.description} onChange={(value) => setField("cta", "description", value)} /><div className="home-button-grid"><TextControl id="cta-primary-label" label="主按钮文案" value={settings.cta.primaryButton.label} onChange={(value) => setNested("cta", "primaryButton", "label", value)} /><LinkControl id="cta-primary-link" value={settings.cta.primaryButton.link} onChange={(value) => setNested("cta", "primaryButton", "link", value)} /><TextControl id="cta-secondary-label" label="次按钮文案" value={settings.cta.secondaryButton.label} onChange={(value) => setNested("cta", "secondaryButton", "label", value)} /><LinkControl id="cta-secondary-link" value={settings.cta.secondaryButton.link} onChange={(value) => setNested("cta", "secondaryButton", "link", value)} /></div></CardContent></Card></AccordionContent>
        </AccordionItem>
      </Accordion>

      <Card className="home-settings-publish">
        <CardFooter>
          <div><strong>{dirty ? "有尚未发布的修改" : "当前配置已同步"}</strong><span>保存后，网站与 Android APP 会通过 Supabase 自动同步。</span></div>
          <div><Button variant="outline" size="sm" disabled={!dirty || mutation.isPending} onClick={() => { setSettings(clone(defaultHomeSettings)); setDirty(true); }}><RotateCcw />恢复默认内容</Button><Button size="sm" disabled={!dirty || mutation.isPending} onClick={() => mutation.mutate(settings)}><CheckCircle2 />{mutation.isPending ? "发布中..." : "保存并发布"}</Button></div>
        </CardFooter>
      </Card>
    </div>
  );
}
