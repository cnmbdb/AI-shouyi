import { useMemo, useState } from "react";
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
import { createStorePayment, getPublicStoreProduct } from "../lib/platformData.js";
import { responsiveImageProps } from "../lib/assets.js";

const money = (value) => `¥${Number(value || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const periodLabels = { day: "天", month: "月", year: "年" };

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
  const query = useQuery({ queryKey: ["store-product", categoryId, productId, legacySlug], queryFn: () => getPublicStoreProduct(categoryId, productId, legacySlug), retry: false, staleTime: 60_000 });
  const [billing, setBilling] = useState("rental");
  const [ordering, setOrdering] = useState(false);
  const product = query.data;
  const canonicalUrl = product ? new URL(`/estates/${encodeURIComponent(product.categoryId || "uncategorized")}/${encodeURIComponent(product.id)}`, window.location.origin).toString() : window.location.href;
  const plans = useMemo(() => {
    if (!product) return [];
    const result = [];
    if (product.billingType !== "buyout") result.push({ id: "rental", label: "租用", price: product.rentalPrice, suffix: `/ ${product.rentalPeriodCount} ${periodLabels[product.rentalPeriodUnit] || "期"}`, note: product.renewable ? `到期可按 ${money(product.renewalPrice)} 续费` : "到期后不支持续费" });
    if (product.billingType !== "rental") result.push({ id: "buyout", label: "买断", price: product.buyoutPrice, suffix: "一次性", note: "支付完成后按订单约定交付设备所有权" });
    return result;
  }, [product]);

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
    if (!user) {
      onNotice("请先登录后创建订单");
      onNavigate(`/auth?next=${encodeURIComponent(`/estates/${product.categoryId || "uncategorized"}/${product.id}`)}`);
      return;
    }
    setOrdering(true);
    try {
      const result = await createStorePayment({ productId: product.id, orderType: selectedPlan.id, quantity: 1, cycles: 1 });
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
            <div className="store-product-key-specs"><span><GraphicsCard weight="duotone" />{product.gpuModel}</span><span><Memory weight="duotone" />{product.vram}</span><span><CalendarBlank weight="duotone" />{product.hostingTerm}</span></div>
            <div className="store-billing-plans">{plans.map((plan) => <button key={plan.id} className={(selectedPlan?.id ?? plans[0]?.id) === plan.id ? "active" : ""} onClick={() => setBilling(plan.id)}><span><strong>{plan.label}</strong><i>{plan.suffix}</i></span><b>{money(plan.price)}</b><small>{plan.note}</small></button>)}</div>
            <div className="store-product-availability"><CheckCircle weight="fill" /><span>现有库存 <strong>{product.inventory}</strong> 台</span></div>
            <button className="store-product-primary" disabled={ordering} onClick={startOrder}>{ordering ? "正在创建订单..." : selectedPlan?.id === "buyout" ? "立即买断" : "立即租用"}</button>
            <button className="store-product-copy" onClick={copyLink}><Copy />复制商品分享链接</button>
          </div>
        </div>
      </section>

      <section className="store-product-content shell">
        <article><span>Product details</span><h2>商品详情</h2><p>{product.details}</p></article>
        <aside><h2>商品规格</h2><dl>{product.specs.map((spec) => <div key={spec.id}><dt>{spec.name}</dt><dd>{spec.value}</dd></div>)}</dl><div className="store-renewal-note"><strong>计费说明</strong><p>{product.billingType === "buyout" ? "本商品为一次性买断，订单完成后不产生自动续费。" : product.renewable ? `租用订单到期前可发起续费；续费按下单时的当前续费价 ${money(product.renewalPrice)} 生成独立订单，并关联原租用订单。` : "本商品按期租用，但当前不开放续费。"}</p></div></aside>
      </section>
    </div>
  );
}
