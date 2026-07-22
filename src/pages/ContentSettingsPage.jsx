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
import { BrandLogoMark } from "@/components/BrandLogo.jsx";
import {
  defaultBlogSettings,
  defaultFooterSettings,
  defaultNavigationSettings,
  defaultProductSettings,
  siteSettingNormalizers,
} from "../data/siteSettings.js";
import { getSiteSettings, saveSiteSetting } from "../lib/platformData.js";

const clone = (value) => structuredClone(value);
const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const sectionMeta = {
  navigation: { title: "顶部导航内容管理" },
  footer: { title: "页脚内容管理" },
  products: { title: "产品浏览页内容管理" },
  blog: { title: "博客首页内容管理" },
};

const defaults = {
  navigation: defaultNavigationSettings,
  footer: defaultFooterSettings,
  products: defaultProductSettings,
  blog: defaultBlogSettings,
};

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

function ToggleControl({ id, label, description, checked, onChange }) {
  return (
    <Field className="toggle-field" orientation="horizontal">
      <div><FieldLabel htmlFor={id}>{label}</FieldLabel>{description ? <FieldDescription>{description}</FieldDescription> : null}</div>
      <Switch id={id} size="sm" checked={checked} onCheckedChange={onChange} />
    </Field>
  );
}

function SelectControl({ id, label, value, onChange, options }) {
  return (
    <Field className="home-control">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}><SelectValue /></SelectTrigger>
        <SelectContent><SelectGroup>{options.map(([optionValue, optionLabel]) => <SelectItem value={optionValue} key={optionValue}>{optionLabel}</SelectItem>)}</SelectGroup></SelectContent>
      </Select>
    </Field>
  );
}

function SectionHeading({ title, description, count }) {
  return <div className="home-section-heading"><div><strong>{title}</strong><span>{description}</span></div>{Number.isInteger(count) ? <Badge variant="outline">{count} 项</Badge> : null}</div>;
}

function SectionHeader({ title, description, count, enabled, onEnabled }) {
  return (
    <div className="home-section-row">
      <AccordionTrigger><SectionHeading title={title} description={description} count={count} /></AccordionTrigger>
      {typeof enabled === "boolean" ? <div className="home-section-toggle"><span>{enabled ? "显示" : "隐藏"}</span><Switch size="sm" checked={enabled} onCheckedChange={onEnabled} aria-label={`${title}显示状态`} /></div> : null}
    </div>
  );
}

function DeleteItem({ label, onConfirm }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="ghost" size="icon-xs" aria-label={`删除${label}`}><Trash2 /></Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>删除“{label}”？</AlertDialogTitle><AlertDialogDescription>保存发布后，该项目会从对应公开页面移除。</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={onConfirm}>删除</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ItemCard({ title, subtitle, onDelete, children }) {
  return (
    <Card size="sm" className="home-item-card">
      <CardHeader><div><CardTitle>{title || "未命名项目"}</CardTitle><CardDescription>{subtitle}</CardDescription></div>{onDelete ? <DeleteItem label={title || "未命名项目"} onConfirm={onDelete} /> : null}</CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function PublishBar({ dirty, pending, label, onReset, onPublish }) {
  return (
    <Card className="home-settings-publish">
      <CardFooter>
        <div><strong>{dirty ? "有尚未发布的修改" : "当前配置已同步"}</strong><span>保存后，公开页面在下次读取配置时更新。</span></div>
        <div><Button variant="outline" size="sm" disabled={!dirty || pending} onClick={onReset}><RotateCcw />恢复默认内容</Button><Button size="sm" disabled={!dirty || pending} onClick={onPublish}><CheckCircle2 />{pending ? "发布中..." : label}</Button></div>
      </CardFooter>
    </Card>
  );
}

export function ContentSettingsPage({ section, onNotice }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["site-settings"], queryFn: getSiteSettings, staleTime: 30_000, refetchOnWindowFocus: false });
  const normalize = siteSettingNormalizers[section];
  const [settings, setSettings] = useState(() => clone(defaults[section]));
  const [dirty, setDirty] = useState(false);
  const meta = sectionMeta[section];

  useEffect(() => {
    if (!query.data?.settings || !normalize) return;
    setSettings(normalize(query.data.settings[section]));
    setDirty(false);
  }, [normalize, query.data, section]);

  const edit = (producer) => {
    setSettings((current) => {
      const next = clone(current);
      producer(next);
      return next;
    });
    setDirty(true);
  };

  const mutation = useMutation({
    mutationFn: (value) => saveSiteSetting(section, value),
    onSuccess: (_, value) => {
      queryClient.setQueryData(["site-settings"], (current) => ({ settings: { ...(current?.settings ?? {}), [section]: value } }));
      queryClient.setQueryData(["public-settings"], (current) => ({ settings: { ...(current?.settings ?? {}), [section]: value } }));
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      queryClient.invalidateQueries({ queryKey: ["public-settings"] });
      setDirty(false);
      onNotice(`${meta.title.replace("内容管理", "")}已保存并发布`);
    },
    onError: (error) => onNotice(error.message),
  });

  if (query.isLoading) return <Card className="home-settings-loading"><CardContent>正在读取页面配置...</CardContent></Card>;
  if (query.isError) return <Card className="home-settings-loading"><CardContent>读取失败：{query.error.message}</CardContent></Card>;

  return (
    <div className="home-settings-page content-settings-page">
      {section === "navigation" ? <NavigationEditor settings={settings} edit={edit} /> : null}
      {section === "footer" ? <FooterEditor settings={settings} edit={edit} /> : null}
      {section === "products" ? <ProductEditor settings={settings} edit={edit} /> : null}
      {section === "blog" ? <BlogEditor settings={settings} edit={edit} /> : null}

      <PublishBar dirty={dirty} pending={mutation.isPending} label="保存并发布" onReset={() => { setSettings(clone(defaults[section])); setDirty(true); }} onPublish={() => mutation.mutate(settings)} />
    </div>
  );
}

function NavigationEditor({ settings, edit }) {
  return (
    <Accordion className="home-settings-accordion" type="multiple" defaultValue={["brand", "items"]}>
      <AccordionItem value="brand">
        <SectionHeader title="品牌与行为" description="站点名称、登录入口与导航吸顶方式" />
        <AccordionContent><Card size="sm"><CardContent className="home-section-content"><ImageControls prefix="navigation-logo" image={settings.logo} onImage={(value) => edit((next) => { next.logo = value; })} variant="logo" placeholder={<BrandLogoMark fallbackClassName="navigation-logo-fallback-preview" />} /><div className="home-fields-grid"><TextControl id="nav-site-name" label="站点名称" value={settings.siteName} onChange={(value) => edit((next) => { next.siteName = value; })} /><TextControl id="nav-login-label" label="未登录入口文案" value={settings.loginLabel} onChange={(value) => edit((next) => { next.loginLabel = value; })} /></div><ToggleControl id="nav-sticky" label="吸顶导航" description="页面滚动时保持顶部导航可见" checked={settings.sticky} onChange={(value) => edit((next) => { next.sticky = value; })} /></CardContent></Card></AccordionContent>
      </AccordionItem>
      <AccordionItem value="items">
        <SectionHeader title="导航项目" description="名称、跳转链接和显示状态；顺序与这里一致" count={settings.items.length} />
        <AccordionContent><div className="home-item-list">{settings.items.map((item, index) => <ItemCard key={item.id} title={item.label} subtitle={`导航 ${index + 1}`} onDelete={() => edit((next) => { next.items.splice(index, 1); })}><div className="home-fields-grid"><TextControl id={`nav-label-${item.id}`} label="名称" value={item.label} onChange={(value) => edit((next) => { next.items[index].label = value; })} /><TextControl id={`nav-link-${item.id}`} label="跳转链接" value={item.link} onChange={(value) => edit((next) => { next.items[index].link = value; })} /></div><ToggleControl id={`nav-enabled-${item.id}`} label="显示该导航" checked={item.enabled} onChange={(value) => edit((next) => { next.items[index].enabled = value; })} /></ItemCard>)}</div><Button variant="outline" size="sm" onClick={() => edit((next) => { next.items.push({ id: uid("nav"), label: "新导航", link: "/", enabled: true }); })}><Plus />添加导航</Button></AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function FooterEditor({ settings, edit }) {
  const socialIcons = [["Instagram", "Instagram"], ["Facebook", "Facebook"], ["Youtube", "YouTube"], ["Linkedin", "LinkedIn"]];
  return (
    <Accordion className="home-settings-accordion" type="multiple" defaultValue={["brand"]}>
      <AccordionItem value="brand"><SectionHeader title="品牌与社交" description="Logo、品牌名称、简介和社交平台链接" enabled={settings.enabled} onEnabled={(value) => edit((next) => { next.enabled = value; })} /><AccordionContent><Card size="sm"><CardContent className="home-section-content"><ImageControls prefix="footer-logo" image={settings.logo} onImage={(value) => edit((next) => { next.logo = value; })} variant="logo" placeholder={<BrandLogoMark fallbackClassName="navigation-logo-fallback-preview" />} /><div className="home-fields-grid"><TextControl id="footer-site-name" label="站点名称" value={settings.siteName} onChange={(value) => edit((next) => { next.siteName = value; })} /><TextControl id="footer-description" label="品牌简介" textarea value={settings.description} onChange={(value) => edit((next) => { next.description = value; })} /></div></CardContent></Card><div className="home-item-list compact">{settings.socials.map((item, index) => <ItemCard key={item.id} title={item.label} subtitle={`社交链接 ${index + 1}`} onDelete={() => edit((next) => { next.socials.splice(index, 1); })}><div className="home-fields-grid"><TextControl id={`social-label-${item.id}`} label="名称" value={item.label} onChange={(value) => edit((next) => { next.socials[index].label = value; })} /><SelectControl id={`social-icon-${item.id}`} label="图标" value={item.icon} options={socialIcons} onChange={(value) => edit((next) => { next.socials[index].icon = value; })} /></div><TextControl id={`social-link-${item.id}`} label="链接" value={item.link} onChange={(value) => edit((next) => { next.socials[index].link = value; })} /></ItemCard>)}</div><Button variant="outline" size="sm" onClick={() => edit((next) => { next.socials.push({ id: uid("social"), icon: "Instagram", label: "新社交平台", link: "https://" }); })}><Plus />添加社交链接</Button></AccordionContent></AccordionItem>
      <AccordionItem value="columns"><SectionHeader title="链接栏目" description="栏目标题及内部链接，可添加或删除" count={settings.columns.length} /><AccordionContent><div className="home-item-list">{settings.columns.map((column, columnIndex) => <ItemCard key={column.id} title={column.title} subtitle={`栏目 ${columnIndex + 1}`} onDelete={() => edit((next) => { next.columns.splice(columnIndex, 1); })}><TextControl id={`column-title-${column.id}`} label="栏目标题" value={column.title} onChange={(value) => edit((next) => { next.columns[columnIndex].title = value; })} />{column.items.map((item, itemIndex) => <div className="content-inline-item" key={item.id}><div className="home-fields-grid"><TextControl id={`column-label-${item.id}`} label="链接名称" value={item.label} onChange={(value) => edit((next) => { next.columns[columnIndex].items[itemIndex].label = value; })} /><TextControl id={`column-link-${item.id}`} label="跳转链接" value={item.link} onChange={(value) => edit((next) => { next.columns[columnIndex].items[itemIndex].link = value; })} /></div><div className="content-inline-actions"><ToggleControl id={`column-enabled-${item.id}`} label="显示" checked={item.enabled} onChange={(value) => edit((next) => { next.columns[columnIndex].items[itemIndex].enabled = value; })} /><DeleteItem label={item.label} onConfirm={() => edit((next) => { next.columns[columnIndex].items.splice(itemIndex, 1); })} /></div></div>)}<Button variant="outline" size="xs" onClick={() => edit((next) => { next.columns[columnIndex].items.push({ id: uid("footer-link"), label: "新链接", link: "/", enabled: true }); })}><Plus />添加链接</Button></ItemCard>)}</div><Button variant="outline" size="sm" onClick={() => edit((next) => { next.columns.push({ id: uid("footer-column"), title: "新栏目", items: [] }); })}><Plus />添加栏目</Button></AccordionContent></AccordionItem>
      <AccordionItem value="contact"><SectionHeader title="联系信息与配图" description="电话、邮箱、地址和页脚图片" /><AccordionContent><Card size="sm"><CardContent className="home-section-content"><div className="home-fields-grid"><TextControl id="footer-contact-title" label="栏目标题" value={settings.contact.title} onChange={(value) => edit((next) => { next.contact.title = value; })} /><TextControl id="footer-phone" label="联系电话" value={settings.contact.phone} onChange={(value) => edit((next) => { next.contact.phone = value; })} /><TextControl id="footer-email" label="联系邮箱" value={settings.contact.email} onChange={(value) => edit((next) => { next.contact.email = value; })} /><TextControl id="footer-address" label="联系地址" textarea value={settings.contact.address} onChange={(value) => edit((next) => { next.contact.address = value; })} /></div><ImageControls prefix="footer" image={settings.image} position={settings.imagePosition} onImage={(value) => edit((next) => { next.image = value; })} onPosition={(value) => edit((next) => { next.imagePosition = value; })} /></CardContent></Card></AccordionContent></AccordionItem>
      <AccordionItem value="bottom"><SectionHeader title="底部版权" description="版权文案与政策链接" count={settings.legalLinks.length} /><AccordionContent><Card size="sm"><CardContent className="home-section-content"><TextControl id="footer-copyright" label="版权文案" value={settings.copyright} onChange={(value) => edit((next) => { next.copyright = value; })} /><div className="home-item-list compact">{settings.legalLinks.map((item, index) => <ItemCard key={item.id} title={item.label} subtitle={`政策链接 ${index + 1}`} onDelete={() => edit((next) => { next.legalLinks.splice(index, 1); })}><div className="home-fields-grid"><TextControl id={`legal-label-${item.id}`} label="名称" value={item.label} onChange={(value) => edit((next) => { next.legalLinks[index].label = value; })} /><TextControl id={`legal-link-${item.id}`} label="链接" value={item.link} onChange={(value) => edit((next) => { next.legalLinks[index].link = value; })} /></div></ItemCard>)}</div><Button variant="outline" size="sm" onClick={() => edit((next) => { next.legalLinks.push({ id: uid("legal"), label: "新政策", link: "#" }); })}><Plus />添加政策链接</Button></CardContent></Card></AccordionContent></AccordionItem>
    </Accordion>
  );
}

function ProductEditor({ settings, edit }) {
  return (
    <Accordion className="home-settings-accordion" type="multiple" defaultValue={["hero"]}>
      <AccordionItem value="hero"><SectionHeader title="产品页首屏" description="背景图、标题、简介和面包屑文案" enabled={settings.hero.enabled} onEnabled={(value) => edit((next) => { next.hero.enabled = value; })} /><AccordionContent><Card size="sm"><CardContent className="home-section-content"><ImageControls prefix="product-hero" image={settings.hero.image} position={settings.hero.imagePosition} onImage={(value) => edit((next) => { next.hero.image = value; })} onPosition={(value) => edit((next) => { next.hero.imagePosition = value; })} /><div className="home-fields-grid"><TextControl id="product-title" label="页面标题" value={settings.hero.title} onChange={(value) => edit((next) => { next.hero.title = value; })} /><TextControl id="product-home-label" label="首页面包屑" value={settings.hero.homeLabel} onChange={(value) => edit((next) => { next.hero.homeLabel = value; })} /><TextControl id="product-current-label" label="当前页面面包屑" value={settings.hero.currentLabel} onChange={(value) => edit((next) => { next.hero.currentLabel = value; })} /></div><TextControl id="product-description" label="页面简介" textarea value={settings.hero.description} onChange={(value) => edit((next) => { next.hero.description = value; })} /></CardContent></Card></AccordionContent></AccordionItem>
      <AccordionItem value="browser"><SectionHeader title="浏览与筛选区" description="结果标题、筛选文案、排序和空状态" enabled={settings.browser.enabled} onEnabled={(value) => edit((next) => { next.browser.enabled = value; })} /><AccordionContent><Card size="sm"><CardContent className="home-section-content"><TextControl id="browser-result-title" label="产品结果标题文案" value={settings.browser.resultTitle} onChange={(value) => edit((next) => { next.browser.resultTitle = value; })} placeholder="例如：Found {count} Exceptional Estates" description="公开页产品列表上方的标题；使用 {count} 自动显示当前产品数量。" /><div className="home-fields-grid"><TextControl id="browser-filter-title" label="筛选标题" value={settings.browser.filterTitle} onChange={(value) => edit((next) => { next.browser.filterTitle = value; })} /><TextControl id="browser-sort-label" label="排序文案" value={settings.browser.sortLabel} onChange={(value) => edit((next) => { next.browser.sortLabel = value; })} /><TextControl id="browser-clear-label" label="清除筛选文案" value={settings.browser.clearLabel} onChange={(value) => edit((next) => { next.browser.clearLabel = value; })} /><TextControl id="browser-empty-title" label="空状态文案" value={settings.browser.emptyTitle} onChange={(value) => edit((next) => { next.browser.emptyTitle = value; })} /></div><div className="home-fields-grid"><SelectControl id="browser-sort" label="默认排序" value={settings.browser.defaultSort} options={[["high", "价格从高到低"], ["low", "价格从低到高"]]} onChange={(value) => edit((next) => { next.browser.defaultSort = value; })} /><div><ToggleControl id="browser-filters" label="显示筛选栏" checked={settings.browser.showFilters} onChange={(value) => edit((next) => { next.browser.showFilters = value; })} /><ToggleControl id="browser-sort-enabled" label="显示排序控件" checked={settings.browser.showSort} onChange={(value) => edit((next) => { next.browser.showSort = value; })} /></div></div></CardContent></Card></AccordionContent></AccordionItem>
      <AccordionItem value="items"><SectionHeader title="产品卡片" description="图片、标签、名称、GPU 规格、价格与整卡点击跳转" count={settings.items.length} /><AccordionContent><div className="home-item-list">{settings.items.map((item, index) => <ItemCard key={item.id} title={item.title} subtitle={`产品 ${index + 1}`} onDelete={() => edit((next) => { next.items.splice(index, 1); })}><div className="home-fields-grid"><TextControl id={`product-tag-${item.id}`} label="标签" value={item.tag} onChange={(value) => edit((next) => { next.items[index].tag = value; })} /><TextControl id={`product-name-${item.id}`} label="名称" value={item.title} onChange={(value) => edit((next) => { next.items[index].title = value; })} /><TextControl id={`product-location-${item.id}`} label="位置/分组" value={item.location} onChange={(value) => edit((next) => { next.items[index].location = value; next.items[index].locationGroup = value; })} /><TextControl id={`product-type-${item.id}`} label="类型" value={item.type} onChange={(value) => edit((next) => { next.items[index].type = value; })} /><TextControl id={`product-price-${item.id}`} label="价格文案" value={item.price} onChange={(value) => edit((next) => { next.items[index].price = value; })} /><TextControl id={`product-price-value-${item.id}`} label="排序价格数值" type="number" value={item.priceValue} onChange={(value) => edit((next) => { next.items[index].priceValue = Number(value) || 0; })} /><TextControl id={`product-gpu-${item.id}`} label="GPU 型号" value={item.gpuModel} onChange={(value) => edit((next) => { next.items[index].gpuModel = value; })} /><TextControl id={`product-vram-${item.id}`} label="显存容量" value={item.vram} onChange={(value) => edit((next) => { next.items[index].vram = value; })} /><TextControl id={`product-term-${item.id}`} label="托管周期" value={item.hostingTerm} onChange={(value) => edit((next) => { next.items[index].hostingTerm = value; })} /><TextControl id={`product-link-${item.id}`} label="点击跳转链接" value={item.link} placeholder="/estates/... 或 https://..." description="点击公开页整张产品卡片时跳转到此地址。" onChange={(value) => edit((next) => { next.items[index].link = value; })} /></div><ImageControls prefix={`product-${item.id}`} image={item.image} position={item.imagePosition} onImage={(value) => edit((next) => { next.items[index].image = value; })} onPosition={(value) => edit((next) => { next.items[index].imagePosition = value; })} /><ToggleControl id={`product-enabled-${item.id}`} label="显示该产品" checked={item.enabled} onChange={(value) => edit((next) => { next.items[index].enabled = value; })} /></ItemCard>)}</div><Button variant="outline" size="sm" onClick={() => edit((next) => { next.items.push({ id: uid("product"), tag: "New", title: "新产品", location: "", locationGroup: "", price: "¥0", priceValue: 0, type: "Compute", gpuModel: "GPU 型号", vram: "24 GB", hostingTerm: "12 个月", features: [], image: "/images/hero-galaxy-home.png", imagePosition: "center center", link: "/estates", enabled: true }); })}><Plus />添加产品</Button></AccordionContent></AccordionItem>
      <AccordionItem value="cta"><SectionHeader title="底部行动区" description="标题、文案和两个按钮链接" enabled={settings.cta.enabled} onEnabled={(value) => edit((next) => { next.cta.enabled = value; })} /><AccordionContent><Card size="sm"><CardContent className="home-section-content"><TextControl id="product-cta-title" label="标题" value={settings.cta.title} onChange={(value) => edit((next) => { next.cta.title = value; })} /><TextControl id="product-cta-description" label="文案" value={settings.cta.description} onChange={(value) => edit((next) => { next.cta.description = value; })} /><div className="home-button-grid"><TextControl id="product-cta-primary-label" label="主按钮文案" value={settings.cta.primaryButton.label} onChange={(value) => edit((next) => { next.cta.primaryButton.label = value; })} /><TextControl id="product-cta-primary-link" label="主按钮链接" value={settings.cta.primaryButton.link} onChange={(value) => edit((next) => { next.cta.primaryButton.link = value; })} /><TextControl id="product-cta-secondary-label" label="次按钮文案" value={settings.cta.secondaryButton.label} onChange={(value) => edit((next) => { next.cta.secondaryButton.label = value; })} /><TextControl id="product-cta-secondary-link" label="次按钮链接" value={settings.cta.secondaryButton.link} onChange={(value) => edit((next) => { next.cta.secondaryButton.link = value; })} /></div></CardContent></Card></AccordionContent></AccordionItem>
    </Accordion>
  );
}

function BlogEditor({ settings, edit }) {
  const categoryIcons = [["SquaresFour", "全部"], ["Buildings", "建筑"], ["Armchair", "室内"], ["FlowerLotus", "生活方式"], ["ChartLineUp", "趋势"], ["AirplaneTilt", "旅行"]];
  return (
    <Accordion className="home-settings-accordion" type="multiple" defaultValue={["hero"]}>
      <AccordionItem value="hero"><SectionHeader title="博客首屏" description="背景图、主标题和介绍文案" enabled={settings.hero.enabled} onEnabled={(value) => edit((next) => { next.hero.enabled = value; })} /><AccordionContent><Card size="sm"><CardContent className="home-section-content"><ImageControls prefix="blog-hero" image={settings.hero.backgroundImage} position={settings.hero.backgroundPosition} onImage={(value) => edit((next) => { next.hero.backgroundImage = value; })} onPosition={(value) => edit((next) => { next.hero.backgroundPosition = value; })} /><TextControl id="blog-hero-title" label="主标题" textarea value={settings.hero.title} onChange={(value) => edit((next) => { next.hero.title = value; })} description="换行会同步到公开页面" /><TextControl id="blog-hero-description" label="介绍文案" textarea value={settings.hero.description} onChange={(value) => edit((next) => { next.hero.description = value; })} /></CardContent></Card></AccordionContent></AccordionItem>
      <AccordionItem value="featured"><SectionHeader title="精选文章" description="精选标签和阅读按钮；文章内容来自已发布文章" enabled={settings.featured.enabled} onEnabled={(value) => edit((next) => { next.featured.enabled = value; })} /><AccordionContent><Card size="sm"><CardContent className="home-section-content"><div className="home-fields-grid"><TextControl id="blog-featured-label" label="精选标签" value={settings.featured.label} onChange={(value) => edit((next) => { next.featured.label = value; })} /><TextControl id="blog-featured-button" label="阅读按钮文案" value={settings.featured.buttonLabel} onChange={(value) => edit((next) => { next.featured.buttonLabel = value; })} /></div></CardContent></Card></AccordionContent></AccordionItem>
      <AccordionItem value="categories"><SectionHeader title="文章分类" description="分类名称、匹配值、图标和显示状态" count={settings.categories.items.length} enabled={settings.categories.enabled} onEnabled={(value) => edit((next) => { next.categories.enabled = value; })} /><AccordionContent><div className="home-item-list compact">{settings.categories.items.map((item, index) => <ItemCard key={item.id} title={item.label} subtitle={`分类 ${index + 1}`} onDelete={() => edit((next) => { next.categories.items.splice(index, 1); })}><div className="home-fields-grid"><TextControl id={`category-label-${item.id}`} label="显示名称" value={item.label} onChange={(value) => edit((next) => { next.categories.items[index].label = value; })} /><TextControl id={`category-value-${item.id}`} label="文章匹配值" value={item.value} onChange={(value) => edit((next) => { next.categories.items[index].value = value; })} /><SelectControl id={`category-icon-${item.id}`} label="图标" value={item.icon} options={categoryIcons} onChange={(value) => edit((next) => { next.categories.items[index].icon = value; })} /></div><ToggleControl id={`category-enabled-${item.id}`} label="显示该分类" checked={item.enabled} onChange={(value) => edit((next) => { next.categories.items[index].enabled = value; })} /></ItemCard>)}</div><Button variant="outline" size="sm" onClick={() => edit((next) => { next.categories.items.push({ id: uid("category"), label: "新分类", value: "New", icon: "SquaresFour", enabled: true }); })}><Plus />添加分类</Button></AccordionContent></AccordionItem>
      <AccordionItem value="articles"><SectionHeader title="文章列表" description="文章卡片来自 Supabase 已发布文章" enabled={settings.articles.enabled} onEnabled={(value) => edit((next) => { next.articles.enabled = value; })} /><AccordionContent><Card size="sm"><CardContent className="home-section-content"><TextControl id="blog-empty-text" label="无结果文案" value={settings.articles.emptyText} onChange={(value) => edit((next) => { next.articles.emptyText = value; })} description="使用 {category} 代表当前分类" /></CardContent></Card></AccordionContent></AccordionItem>
      <AccordionItem value="editors"><SectionHeader title="编辑推荐" description="标题、介绍和查看全部按钮" enabled={settings.editors.enabled} onEnabled={(value) => edit((next) => { next.editors.enabled = value; })} /><AccordionContent><Card size="sm"><CardContent className="home-section-content"><div className="home-fields-grid"><TextControl id="blog-editors-title" label="标题" value={settings.editors.title} onChange={(value) => edit((next) => { next.editors.title = value; })} /><TextControl id="blog-editors-button" label="按钮文案" value={settings.editors.buttonLabel} onChange={(value) => edit((next) => { next.editors.buttonLabel = value; })} /></div><TextControl id="blog-editors-description" label="介绍" value={settings.editors.description} onChange={(value) => edit((next) => { next.editors.description = value; })} /></CardContent></Card></AccordionContent></AccordionItem>
      <AccordionItem value="newsletter"><SectionHeader title="邮件订阅" description="标题、介绍、输入框、按钮和隐私提示" enabled={settings.newsletter.enabled} onEnabled={(value) => edit((next) => { next.newsletter.enabled = value; })} /><AccordionContent><Card size="sm"><CardContent className="home-section-content"><div className="home-fields-grid"><TextControl id="newsletter-title" label="标题" value={settings.newsletter.title} onChange={(value) => edit((next) => { next.newsletter.title = value; })} /><TextControl id="newsletter-placeholder" label="输入框提示" value={settings.newsletter.placeholder} onChange={(value) => edit((next) => { next.newsletter.placeholder = value; })} /><TextControl id="newsletter-button" label="按钮文案" value={settings.newsletter.buttonLabel} onChange={(value) => edit((next) => { next.newsletter.buttonLabel = value; })} /><TextControl id="newsletter-privacy" label="隐私提示" value={settings.newsletter.privacyText} onChange={(value) => edit((next) => { next.newsletter.privacyText = value; })} /></div><TextControl id="newsletter-description" label="介绍文案" value={settings.newsletter.description} onChange={(value) => edit((next) => { next.newsletter.description = value; })} /></CardContent></Card></AccordionContent></AccordionItem>
    </Accordion>
  );
}
