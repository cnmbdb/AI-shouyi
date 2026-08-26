import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarBlank,
  CheckCircle,
  Copy,
  GraphicsCard,
  Memory,
  Package,
  ShareNetwork,
} from "@phosphor-icons/react";
import { commerceProductsRefreshKey, createStorePayment, getPublicStoreProduct } from "../lib/platformData.js";
import { responsiveImageProps } from "../lib/assets.js";
import { resolveProductVariant } from "../data/commerceSettings.js";

const money = (value) => `¥${Number(value || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

export function StoreProductPage({ categoryId, productId, legacySlug, user, onNavigate, onNotice }) {
  const isNativeApp = Capacitor.isNativePlatform();
  const query = useQuery({
    queryKey: ["store-product", categoryId, productId, legacySlug],
    queryFn: () => getPublicStoreProduct(categoryId, productId, legacySlug),
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });
  const [billing, setBilling] = useState("rental");
  const [specSelections, setSpecSelections] = useState({});
  const [ordering, setOrdering] = useState(false);
  const product = query.data;
  const levels = product?.specs ?? [];
  const selectedSku = useMemo(() => resolveProductVariant(product, specSelections), [product, specSelections]);
  const selectedSpecs = selectedSku.specification;

  useEffect(() => {
    const syncPublishedProduct = (event) => {
      if (event.key === commerceProductsRefreshKey) void query.refetch();
    };
    window.addEventListener("storage", syncPublishedProduct);
    return () => window.removeEventListener("storage", syncPublishedProduct);
  }, [query.refetch]);
  useEffect(() => setSpecSelections({}), [product?.id]);
  const canonicalUrl = product ? new URL(`/estates/${encodeURIComponent(product.categoryId || "uncategorized")}/${encodeURIComponent(product.id)}`, window.location.origin).toString() : window.location.href;
  const plans = useMemo(() => {
    if (!product) return [];
    const result = [];
    if (product.billingType !== "buyout") result.push({ id: "rental", label: "租用", price: selectedSku.price, suffix: `/ 月 · ${selectedSpecs.rentalDuration?.value ?? product.rentalPeriodCount} 天`, note: `月租回报 ${selectedSpecs.monthlyReturnRate?.value ?? 0}% · 每日 ${Number(selectedSpecs.dailyTokenOutput?.value || 0).toLocaleString("zh-CN")} TOKEN` });
    if (product.billingType !== "rental") result.push({ id: "buyout", label: "买断", price: product.buyoutPrice, suffix: "一次性", note: "支付完成后按订单约定交付设备所有权" });
    return result;
  }, [product, selectedSku.price, selectedSpecs]);

  const copyLink = async () => {
    try {
      await copyText(canonicalUrl);
      onNotice("商品分享链接已复制");
    } catch {
      onNotice("链接复制失败，请从浏览器地址栏复制");
    }
  };

  const share = async () => {
    const url = canonicalUrl;
    try {
      if (navigator.share) await navigator.share({ title: product.name, text: product.summary, url });
      else await copyLink();
    } catch (error) {
      if (error?.name !== "AbortError") onNotice("分享失败，请稍后重试");
    }
  };

  if (query.isLoading) return <section className="store-product-state shell"><Package weight="thin" /><h1>正在读取商品...</h1></section>;
  if (query.isError || !product) return <section className="store-product-state shell"><Package weight="thin" /><h1>商品不存在或已下架</h1><p>这个分享链接可能已失效，也可能商品暂时停止销售。</p><button onClick={() => onNavigate("/estates")}>返回产品列表</button></section>;

  const selectedPlan = plans.find((item) => item.id === billing) ?? plans[0];
  const startOrder = async () => {
    if (isNativeApp) {
      onNotice("Android 版本暂未开放支付，请使用网页版完成购买");
      return;
    }
    if (!user) {
      onNotice("请先登录后创建订单");
      onNavigate(`/auth?next=${encodeURIComponent(`/estates/${product.categoryId || "uncategorized"}/${product.id}`)}`);
      return;
    }
    setOrdering(true);
    try {
      const result = await createStorePayment({ productId: product.id, specSelections, orderType: selectedPlan.id, quantity: 1, cycles: 1 });
      if (result.checkout?.checkout_url) {
        window.location.assign(result.checkout.checkout_url);
        return;
      }
      onNotice(result.checkout?.instructions || `订单 ${result.order?.order_no ?? ""} 已创建`);
      onNavigate("/console/orders");
    } catch (error) {
      onNotice(error.message || "订单创建失败");
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="store-product-page">
      <section className="store-product-hero shell">
        <div className="store-product-breadcrumb"><button onClick={() => onNavigate("/")}>首页</button><span>/</span><button onClick={() => onNavigate("/estates")}>产品</button><span>/</span><strong>{product.name}</strong></div>
        <div className="store-product-grid">
          <div className="store-product-media"><img {...responsiveImageProps(product.image, "(max-width: 760px) 100vw, 52vw")} alt={product.name} style={{ objectPosition: product.imagePosition }} /><span>{product.category?.name || "算力商品"}</span></div>
          <div className="store-product-summary-panel">
            <div className="store-product-heading"><div><small>{product.sku}</small><h1>{product.name}</h1></div><button onClick={share} aria-label="分享商品"><ShareNetwork /></button></div>
            <p>{product.summary}</p>
            <div className="store-product-key-specs"><span><GraphicsCard weight="duotone" />{product.gpuModel}</span><span><Memory weight="duotone" />{selectedSpecs.computePower?.value || product.vram}</span><span><CalendarBlank weight="duotone" />{selectedSpecs.rentalDuration ? `${selectedSpecs.rentalDuration.value} 天` : product.hostingTerm}</span></div>
            {levels.length ? <div className="store-specification-levels"><div className="store-specification-heading"><strong>选择跑算规格</strong><span>{levels.length} 个规格维度</span></div>{levels.map((level, levelIndex) => <fieldset key={level.id}><legend><b>{["一级", "二级", "三级", "四级"][levelIndex] ?? `${levelIndex + 1}级`}</b>{level.name}</legend><div>{level.options.map((option) => { const selectedId = specSelections[level.id] ?? level.options[0]?.id; const active = option.id === selectedId; return <button type="button" key={option.id} className={active ? "active" : ""} onClick={() => setSpecSelections((current) => ({ ...current, [level.id]: option.id }))}>{option.value}<small>{level.unit}</small></button>; })}</div></fieldset>)}</div> : null}
            <div className="store-billing-plans">{plans.map((plan) => <button key={plan.id} className={(selectedPlan?.id ?? plans[0]?.id) === plan.id ? "active" : ""} onClick={() => setBilling(plan.id)}><span><strong>{plan.label}</strong><i>{plan.suffix}</i></span><b>{money(plan.price)}</b><small>{plan.note}</small></button>)}</div>
            <div className="store-product-availability"><CheckCircle weight="fill" /><span>当前规格库存 <strong>{selectedSku.variant?.inventory ?? product.inventory}</strong> 台</span></div>
            <button className="store-product-primary" disabled={ordering || isNativeApp || Number(selectedSku.variant?.inventory ?? product.inventory) <= 0} onClick={startOrder}>{isNativeApp ? "Android 版暂未开放支付" : ordering ? "正在创建订单..." : Number(selectedSku.variant?.inventory ?? product.inventory) <= 0 ? "当前规格暂时缺货" : selectedPlan?.id === "buyout" ? "立即买断" : "立即租用"}</button>
            <button className="store-product-copy" onClick={copyLink}><Copy />复制商品分享链接</button>
          </div>
        </div>
      </section>

      <section className="store-product-content shell">
        <article><span>Product details</span><h2>商品详情</h2><p>{product.details}</p></article>
        <aside><h2>当前跑算规格</h2><dl><div><dt>唯一型号</dt><dd>{product.gpuModel}</dd></div>{levels.map((level) => <div key={level.id}><dt>{level.name}</dt><dd>{selectedSpecs[level.field]?.value}{level.unit}</dd></div>)}<div><dt>月租价格</dt><dd>{money(selectedSku.price)}</dd></div></dl><div className="store-renewal-note"><strong>计费说明</strong><p>{product.billingType === "buyout" ? "本商品支持一次性买断，订单完成后不产生自动续费。" : product.renewable ? "租用订单会保存四项规格选择、SKU 组合和价格快照；到期前可按届时有效的同规格价格续租。" : "本商品按期租用，但当前不开放续费。"}</p></div></aside>
      </section>
    </div>
  );
}
