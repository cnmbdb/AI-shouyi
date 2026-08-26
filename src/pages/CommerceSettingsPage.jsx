import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  PackagePlus,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { ImageControls } from "@/components/ImageControls.jsx";
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
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { buildVariantMatrix, commerceSettingNormalizers, commerceSpecificationFields, defaultCommerceSettings } from "../data/commerceSettings.js";
import { getCommerceSettings, saveCommerceSetting } from "../lib/platformData.js";
import { PaymentSettingsEditor } from "./PaymentSettingsEditor.jsx";

const clone = (value) => structuredClone(value);
const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const makeSpecificationLevel = (field, values = ["0"]) => {
  const definition = commerceSpecificationFields.find((item) => item.value === field) ?? commerceSpecificationFields[0];
  return { id: uid("spec-level"), field: definition.value, name: definition.label, unit: definition.unit, options: values.map((value) => ({ id: uid("spec-option"), value: String(value) })) };
};
const defaultSpecificationLevels = () => [
  makeSpecificationLevel("computePower", ["30", "50", "100"]),
  makeSpecificationLevel("monthlyReturnRate", ["3", "10", "40"]),
  makeSpecificationLevel("rentalDuration", ["1", "30", "180"]),
  makeSpecificationLevel("dailyTokenOutput", ["300", "500", "1000"]),
];
const syncProductVariants = (product) => { product.variants = buildVariantMatrix(product.specs, product.variants, product.rentalPrice, product.inventory); };
const slugify = (value, fallback) => String(value || fallback).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || fallback;
const money = (value) => `¥${Number(value || 0).toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
const productPath = (product) => `/estates/${encodeURIComponent(product.categoryId || "uncategorized")}/${encodeURIComponent(product.id)}`;

const pageMeta = {
  products: { success: "商品目录已保存" },
  payment: { success: "支付渠道已保存" },
};

async function copyText(value) {
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.top = "0";
  input.style.left = "-9999px";
  document.body.appendChild(input);
  input.focus();
  input.select();
  input.setSelectionRange(0, value.length);
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  input.remove();
  if (copied) return;
  if (navigator.clipboard?.writeText) {
    await Promise.race([
      navigator.clipboard.writeText(value),
      new Promise((_, reject) => window.setTimeout(() => reject(new Error("复制超时")), 800)),
    ]);
    return;
  }
  throw new Error("浏览器未允许复制");
}

function TextControl({ id, label, value, onChange, description, type = "text", textarea = false, min, placeholder }) {
  const Control = textarea ? Textarea : Input;
  return (
    <Field className="home-control">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Control id={id} type={textarea ? undefined : type} min={min} placeholder={placeholder} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  );
}

function SelectControl({ id, label, value, options, onChange, description }) {
  return (
    <Field className="home-control">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select value={value} onValueChange={onChange}><SelectTrigger id={id}><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{options.map(([optionValue, optionLabel]) => <SelectItem key={optionValue} value={optionValue}>{optionLabel}</SelectItem>)}</SelectGroup></SelectContent></Select>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  );
}

function ToggleControl({ id, label, description, checked, onChange }) {
  return <Field className="toggle-field" orientation="horizontal"><div><FieldLabel htmlFor={id}>{label}</FieldLabel>{description ? <FieldDescription>{description}</FieldDescription> : null}</div><Switch id={id} size="sm" checked={checked} onCheckedChange={onChange} /></Field>;
}

function SectionHeading({ title, description, count }) {
  return <div className="home-section-heading"><div><strong>{title}</strong><span>{description}</span></div>{Number.isInteger(count) ? <Badge variant="outline">{count} 项</Badge> : null}</div>;
}

function DeleteButton({ label, description, onConfirm, iconOnly = false }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="ghost" size={iconOnly ? "icon-xs" : "xs"} aria-label={`删除${label}`}><Trash2 />{iconOnly ? null : "删除"}</Button></AlertDialogTrigger>
      <AlertDialogContent size="sm"><AlertDialogHeader><AlertDialogTitle>删除“{label}”？</AlertDialogTitle><AlertDialogDescription>{description || "保存后该项目将被永久删除。"}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={onConfirm}>删除</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  );
}

function PublishBar({ dirty, pending, onReset, onPublish, label }) {
  return <Card className="home-settings-publish"><CardFooter><div><strong>{dirty ? "有尚未保存的修改" : "当前配置已同步"}</strong><span>{label}</span></div><div><Button variant="outline" size="sm" disabled={!dirty || pending} onClick={onReset}><RotateCcw />恢复默认</Button><Button size="sm" disabled={!dirty || pending} onClick={onPublish}><CheckCircle2 />{pending ? "保存中..." : "保存发布"}</Button></div></CardFooter></Card>;
}

export function CommerceSettingsPage({ section, onNotice }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["commerce-settings"], queryFn: getCommerceSettings, staleTime: 30_000, refetchOnWindowFocus: false });
  const normalize = commerceSettingNormalizers[section];
  const [settings, setSettings] = useState(() => clone(defaultCommerceSettings[section]));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!query.data?.settings || !normalize) return;
    setSettings(normalize(query.data.settings[section]));
    setDirty(false);
  }, [normalize, query.data, section]);

  const edit = (producer) => {
    setSettings((current) => { const next = clone(current); producer(next); return next; });
    setDirty(true);
  };

  const mutation = useMutation({
    mutationFn: (value) => saveCommerceSetting(section, value),
    onSuccess: (result) => {
      const saved = result.value ?? settings;
      queryClient.setQueryData(["commerce-settings"], (current) => ({ ...current, settings: { ...(current?.settings ?? {}), [section]: saved } }));
      queryClient.invalidateQueries({ queryKey: ["commerce-settings"] });
      if (section === "products") queryClient.invalidateQueries({ queryKey: ["store-product"] });
      setDirty(false);
      onNotice(pageMeta[section].success);
    },
    onError: (error) => onNotice(error.message),
  });

  if (query.isLoading) return <Card className="home-settings-loading"><CardContent>正在读取商城配置...</CardContent></Card>;
  if (query.isError) return <Card className="home-settings-loading"><CardContent>读取失败：{query.error.message}</CardContent></Card>;

  return (
    <div className="home-settings-page commerce-settings-page">
      {section === "products" ? <ProductCatalogEditor settings={settings} edit={edit} dirty={dirty} pending={mutation.isPending} onNotice={onNotice} onPublish={() => mutation.mutate(settings)} /> : null}
      {section === "payment" ? <PaymentSettingsEditor settings={settings} edit={edit} onRefresh={() => query.refetch()} /> : null}
      <PublishBar dirty={dirty} pending={mutation.isPending} label={section === "products" ? "保存后商品分类、详情和分享链接同步发布。" : "渠道密钥经受信任服务保存，不进入公开配置。"} onReset={() => { setSettings(clone(defaultCommerceSettings[section])); setDirty(true); }} onPublish={() => mutation.mutate(settings)} />
    </div>
  );
}

function ProductCatalogEditor({ settings, edit, dirty, pending, onNotice, onPublish }) {
  const [editingId, setEditingId] = useState(null);
  const categoryMap = useMemo(() => new Map(settings.categories.map((item) => [item.id, item.name])), [settings.categories]);
  const editingIndex = settings.items.findIndex((item) => item.id === editingId);
  const editingProduct = editingIndex >= 0 ? settings.items[editingIndex] : null;

  const addCategory = () => edit((next) => {
    const id = uid("category");
    next.categories.push({ id, name: "新商品分类", slug: slugify(id, "new-category"), description: "", enabled: true, sortOrder: String(next.categories.length * 10 + 10) });
  });

  const removeCategory = (index) => edit((next) => {
    const [removed] = next.categories.splice(index, 1);
    const fallbackId = next.categories[0]?.id ?? "";
    next.items.forEach((item) => { if (item.categoryId === removed.id) item.categoryId = fallbackId; });
  });

  const addProduct = () => {
    const id = uid("commerce-product");
    edit((next) => {
      const specs = defaultSpecificationLevels();
      next.items.push({
      id,
      categoryId: next.categories[0]?.id ?? "",
      slug: slugify(id, "new-product"),
      shareToken: Math.random().toString(36).slice(2, 10),
      sku: `GPU-${String(next.items.length + 1).padStart(3, "0")}`,
      name: "新算力商品",
      summary: "",
      image: "/images/estate-luna-ridge.png",
      imagePosition: "50% 50%",
      gpuModel: "NVIDIA GPU",
      vram: "24 GB",
      hostingTerm: "12 个月",
      billingType: "rental",
      rentalPrice: "0",
      rentalPeriodUnit: "month",
      rentalPeriodCount: "1",
      renewable: true,
      renewalPrice: "0",
      buyoutPrice: "0",
      inventory: "0",
      details: "",
      specs,
      variants: buildVariantMatrix(specs, [], "0", "0"),
      enabled: false,
      sortOrder: String(next.items.length * 10 + 10),
      });
    });
    setEditingId(id);
  };

  const copyProductLink = async (product) => {
    const url = new URL(productPath(product), window.location.origin).toString();
    try {
      await copyText(url);
      onNotice(`商品链接已复制：${url}`);
    } catch {
      onNotice("链接复制失败，请进入编辑区手动复制详情页地址");
    }
  };

  return (
    <Accordion className="home-settings-accordion" type="multiple" defaultValue={["categories", "products"]}>
      <AccordionItem value="categories">
        <AccordionTrigger><SectionHeading title="商品分类" description="添加、排序、停用或删除商城分类" count={settings.categories.length} /></AccordionTrigger>
        <AccordionContent>
          <div className="commerce-category-list">
            {settings.categories.map((category, index) => <Card size="sm" key={category.id}><CardContent className="commerce-category-row"><div className="commerce-category-fields"><TextControl id={`category-name-${category.id}`} label="分类名称" value={category.name} onChange={(value) => edit((next) => { next.categories[index].name = value; })} /><TextControl id={`category-slug-${category.id}`} label="分类标识" value={category.slug} onChange={(value) => edit((next) => { next.categories[index].slug = slugify(value, `category-${index + 1}`); })} /><TextControl id={`category-description-${category.id}`} label="分类说明" value={category.description} onChange={(value) => edit((next) => { next.categories[index].description = value; })} /><TextControl id={`category-order-${category.id}`} label="排序" type="number" value={category.sortOrder} onChange={(value) => edit((next) => { next.categories[index].sortOrder = value; })} /></div><div className="commerce-category-actions"><Switch size="sm" checked={category.enabled} onCheckedChange={(value) => edit((next) => { next.categories[index].enabled = value; })} aria-label={`${category.name}启用状态`} /><DeleteButton iconOnly label={category.name} description="使用该分类的商品会自动移动到剩余的第一个分类。" onConfirm={() => removeCategory(index)} /></div></CardContent></Card>)}
          </div>
          <Button variant="outline" size="sm" onClick={addCategory}><Plus />添加分类</Button>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="products">
        <AccordionTrigger><SectionHeading title="商品列表" description="每个型号对应一个商品，商品内管理多条跑算规格" count={settings.items.length} /></AccordionTrigger>
        <AccordionContent>
          <Card size="sm" className="commerce-table-card">
            <CardHeader><CardTitle>全部商品</CardTitle><CardDescription>分享链接始终指向继承公共顶部导航和页脚的商品详情页。</CardDescription><CardAction><Button variant="outline" size="sm" onClick={addProduct}><PackagePlus />添加商品</Button></CardAction></CardHeader>
            <CardContent className="commerce-table-content"><div className="commerce-table-scroll"><Table className="commerce-product-table"><TableHeader><TableRow><TableHead>商品</TableHead><TableHead>分类 / 规格</TableHead><TableHead>计费</TableHead><TableHead>库存</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader><TableBody>
              {settings.items.map((item, index) => <TableRow key={item.id} data-state={editingId === item.id ? "selected" : undefined}>
                <TableCell><div className="commerce-product-identity"><img src={item.image} alt="" /><div><strong>{item.name}</strong><small>{item.sku}</small></div></div></TableCell>
                <TableCell><div className="commerce-product-summary"><strong>{item.gpuModel}</strong><small>{categoryMap.get(item.categoryId) || "未分类"} · {item.specs.length} 个维度 · {item.variants.length} 个 SKU</small></div></TableCell>
                <TableCell><div className="commerce-product-billing"><Badge variant="outline">{item.billingType === "rental" ? "租用" : item.billingType === "buyout" ? "买断" : "租用 + 买断"}</Badge><small>{item.billingType === "buyout" ? money(item.buyoutPrice) : `${money(Math.min(...item.variants.map((entry) => Number(entry.price) || 0)))} 起 / 月`}</small></div></TableCell>
                <TableCell>{item.inventory}</TableCell>
                <TableCell><div className="commerce-status-control"><Switch size="sm" checked={item.enabled} onCheckedChange={(value) => edit((next) => { next.items[index].enabled = value; })} aria-label={`${item.name}上架状态`} /><Badge variant={item.enabled ? "secondary" : "outline"}>{item.enabled ? "已上架" : "已下架"}</Badge></div></TableCell>
                <TableCell className="text-right"><div className="commerce-row-actions"><Button variant="ghost" size="xs" onClick={() => setEditingId(item.id)}><Pencil />编辑</Button><Button variant="ghost" size="xs" onClick={() => copyProductLink(item)}><Copy />复制链接</Button><DeleteButton iconOnly label={item.name} onConfirm={() => { edit((next) => { next.items.splice(index, 1); }); if (editingId === item.id) setEditingId(null); }} /></div></TableCell>
              </TableRow>)}
              {settings.items.length === 0 ? <TableRow><TableCell colSpan={6} className="commerce-empty-row">暂无商品，点击“添加商品”开始配置。</TableCell></TableRow> : null}
            </TableBody></Table></div></CardContent>
          </Card>
        </AccordionContent>
      </AccordionItem>
      {editingProduct ? <ProductEditorDialog product={editingProduct} index={editingIndex} categories={settings.categories} edit={edit} dirty={dirty} pending={pending} onClose={() => setEditingId(null)} onPublish={onPublish} onShare={() => copyProductLink(editingProduct)} /> : null}
    </Accordion>
  );
}

function ProductEditorDialog({ product, index, categories, edit, dirty, pending, onClose, onPublish, onShare }) {
  const set = (field, value) => edit((next) => { next.items[index][field] = value; });
  const supportsRental = product.billingType !== "buyout";
  const supportsBuyout = product.billingType !== "rental";
  const shareUrl = typeof window === "undefined" ? productPath(product) : new URL(productPath(product), window.location.origin).toString();
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="commerce-product-dialog" onInteractOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>编辑商品 · {product.name}</DialogTitle>
          <DialogDescription className="commerce-product-dialog-description">上传或编辑后点击“保存并发布”，商品详情页会同步刷新。地址：{shareUrl}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="commerce-product-dialog-scroll">
          <div className="commerce-editor-content">
        <ImageControls prefix={`store-product-${product.id}`} image={product.image} position={product.imagePosition} onImage={(value) => set("image", value)} onPosition={(value) => set("imagePosition", value)} previewAspect="1 / 1" />
        <FieldGroup className="home-fields-grid"><TextControl id={`product-name-${product.id}`} label="商品名称" value={product.name} onChange={(value) => set("name", value)} /><TextControl id={`product-sku-${product.id}`} label="SKU" value={product.sku} onChange={(value) => set("sku", value)} /><SelectControl id={`product-category-${product.id}`} label="商品分类" value={product.categoryId || "__none__"} options={[["__none__", "未分类"], ...categories.map((item) => [item.id, item.name])]} onChange={(value) => set("categoryId", value === "__none__" ? "" : value)} /><TextControl id={`product-slug-${product.id}`} label="SEO 标识" value={product.slug} onChange={(value) => set("slug", slugify(value, `product-${index + 1}`))} description="分享路径固定为 /estates/商品分类ID/商品ID" /><TextControl id={`product-share-${product.id}`} label="分享标识（兼容）" value={product.shareToken} onChange={(value) => set("shareToken", value.replace(/[^a-zA-Z0-9_-]/g, ""))} /><TextControl id={`product-order-${product.id}`} label="显示顺序" type="number" value={product.sortOrder} onChange={(value) => set("sortOrder", value)} /></FieldGroup>
        <TextControl id={`product-summary-${product.id}`} label="商品摘要" textarea value={product.summary} onChange={(value) => set("summary", value)} />
        <FieldGroup className="home-fields-grid"><TextControl id={`product-gpu-${product.id}`} label="GPU 型号（唯一）" value={product.gpuModel} onChange={(value) => set("gpuModel", value)} description="同一型号只建立一个商品；不同方案请在下方添加多条跑算规格。" /><TextControl id={`product-vram-${product.id}`} label="显存" value={product.vram} onChange={(value) => set("vram", value)} /><TextControl id={`product-term-${product.id}`} label="托管 / 交付说明" value={product.hostingTerm} onChange={(value) => set("hostingTerm", value)} /><TextControl id={`product-stock-${product.id}`} label="商品库存（默认值）" type="number" min="0" value={product.inventory} onChange={(value) => set("inventory", value)} description="SKU 库存未单独设置时使用；下方价格区可逐行覆盖。" /></FieldGroup>
        <Card size="sm" className="commerce-billing-card"><CardHeader><CardTitle>计费与续费</CardTitle><CardDescription>租赁价格由下方 SKU 价格表决定，订单创建时保存不可变规格与价格快照。</CardDescription></CardHeader><CardContent className="commerce-editor-content"><SelectControl id={`product-billing-${product.id}`} label="计费方式" value={product.billingType} options={[["rental", "仅租用"], ["buyout", "仅买断"], ["both", "租用与买断"]]} onChange={(value) => set("billingType", value)} />{supportsRental ? <><div className="commerce-spec-source-note">先维护四个规格维度，再在 SKU 价格区逐行填写每一种组合的月租价格。</div><ToggleControl id={`product-renewable-${product.id}`} label="允许到期续费" description="关闭后支付 API 会拒绝为该商品创建续费订单" checked={product.renewable} onChange={(value) => set("renewable", value)} /></> : null}{supportsBuyout ? <TextControl id={`product-buyout-${product.id}`} label="买断价格" type="number" min="0" value={product.buyoutPrice} onChange={(value) => set("buyoutPrice", value)} /> : null}</CardContent></Card>
        <div className="commerce-variant-editor commerce-specification-block">
          <div className="commerce-subheading"><div><strong>1. 规格区块</strong><span>规格只负责定义选项；四个维度的选项会自动组合成商城 SKU</span></div><Button variant="outline" size="xs" disabled={product.specs.length >= 4} onClick={() => edit((next) => { const target = next.items[index]; const used = new Set(target.specs.map((level) => level.field)); const field = commerceSpecificationFields.find((item) => !used.has(item.value))?.value ?? commerceSpecificationFields[0].value; target.specs.push(makeSpecificationLevel(field)); syncProductVariants(target); })}><Plus />添加规格维度</Button></div>
          <Accordion type="multiple" defaultValue={product.specs.map((level) => level.id)} className="commerce-spec-levels">{product.specs.map((level, levelIndex) => <AccordionItem value={level.id} key={level.id} className="commerce-spec-level"><AccordionTrigger><div className="commerce-spec-level-heading"><Badge variant="outline">{["一级", "二级", "三级", "四级"][levelIndex] ?? `${levelIndex + 1}级`}</Badge><div><strong>{level.name}</strong><span>{level.options.length} 个可选值 · {level.options.map((option) => `${option.value}${level.unit}`).join("、")}</span></div></div></AccordionTrigger><AccordionContent><div className="commerce-spec-level-editor"><div className="commerce-spec-level-meta commerce-spec-level-meta-simple"><TextControl id={`spec-level-name-${level.id}`} label="规格名称" value={level.name} onChange={(value) => edit((next) => { next.items[index].specs[levelIndex].name = value; })} /><TextControl id={`spec-level-unit-${level.id}`} label="单位" value={level.unit} onChange={(value) => edit((next) => { next.items[index].specs[levelIndex].unit = value; })} /></div><div className="commerce-spec-options-heading"><strong>可选规格值</strong><Button variant="outline" size="xs" onClick={() => edit((next) => { const target = next.items[index]; target.specs[levelIndex].options.push({ id: uid("spec-option"), value: "0" }); syncProductVariants(target); })}><Plus />添加值</Button></div><div className="commerce-spec-option-list">{level.options.map((option, optionIndex) => <div key={option.id}><Badge variant="secondary">{optionIndex + 1}</Badge><Input aria-label={`${level.name}选项 ${optionIndex + 1}`} value={option.value} onChange={(event) => edit((next) => { next.items[index].specs[levelIndex].options[optionIndex].value = event.target.value; })} /><span>{level.unit || "无单位"}</span>{level.options.length > 1 ? <Button variant="ghost" size="icon-xs" onClick={() => edit((next) => { const target = next.items[index]; target.specs[levelIndex].options.splice(optionIndex, 1); syncProductVariants(target); })} aria-label={`删除${level.name}选项 ${optionIndex + 1}`}><Trash2 /></Button> : null}</div>)}</div>{product.specs.length > 1 ? <Button className="commerce-delete-level" variant="ghost" size="xs" onClick={() => edit((next) => { const target = next.items[index]; target.specs.splice(levelIndex, 1); syncProductVariants(target); })}><Trash2 />删除该规格维度</Button> : null}</div></AccordionContent></AccordionItem>)}</Accordion>
        </div>
        <div className="commerce-variant-editor commerce-price-block">
          <div className="commerce-subheading"><div><strong>2. SKU 价格与库存区块</strong><span>{product.specs.map((level) => level.options.length).join(" × ")} = {product.variants.length} 个规格组合，每行独立编辑月租价格和库存</span></div><Badge variant="secondary">{product.variants.length} 个 SKU</Badge></div>
          <div className="commerce-sku-price-table"><Table><TableHeader><TableRow><TableHead className="commerce-sku-index">#</TableHead>{product.specs.map((level) => <TableHead key={level.id}>{level.name}</TableHead>)}<TableHead className="commerce-sku-price-column">月租价格（元）</TableHead><TableHead className="commerce-sku-inventory-column">库存（台）</TableHead></TableRow></TableHeader><TableBody>{product.variants.map((variant, variantIndex) => <TableRow key={variant.id}><TableCell className="commerce-sku-index">{variantIndex + 1}</TableCell>{product.specs.map((level) => { const option = level.options.find((entry) => entry.id === variant.selections[level.id]); return <TableCell key={level.id}><Badge variant="outline">{option?.value ?? "-"}{level.unit}</Badge></TableCell>; })}<TableCell className="commerce-sku-price-column"><Input type="number" min="0" aria-label={`SKU ${variantIndex + 1} 月租价格`} value={variant.price} onChange={(event) => edit((next) => { next.items[index].variants[variantIndex].price = event.target.value; })} /></TableCell><TableCell className="commerce-sku-inventory-column"><Input type="number" min="0" step="1" aria-label={`SKU ${variantIndex + 1} 库存`} value={variant.inventory ?? "0"} onChange={(event) => edit((next) => { next.items[index].variants[variantIndex].inventory = event.target.value; })} /></TableCell></TableRow>)}</TableBody></Table></div>
        </div>
        <TextControl id={`product-details-${product.id}`} label="商品详情" textarea value={product.details} onChange={(value) => set("details", value)} description="支持纯文本换行，详情页会保留段落结构。" />
          </div>
        </ScrollArea>
        <DialogFooter className="commerce-product-dialog-footer">
          <ToggleControl id={`product-enabled-${product.id}`} label="上架该商品" checked={product.enabled} onChange={(value) => set("enabled", value)} />
          <Button variant="outline" size="sm" onClick={onShare}><Copy />复制链接</Button>
          <Button variant="outline" size="sm" disabled={dirty || pending} onClick={() => window.open(shareUrl, "_blank", "noopener,noreferrer")}><ExternalLink />{dirty ? "请先保存发布" : "预览详情"}</Button>
          <Button variant="outline" size="sm" onClick={onClose}>完成编辑</Button>
          <Button size="sm" disabled={!dirty || pending} onClick={onPublish}><CheckCircle2 />{pending ? "发布中..." : dirty ? "保存并发布" : "已发布"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
