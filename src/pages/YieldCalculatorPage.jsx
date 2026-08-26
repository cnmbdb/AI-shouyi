import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { defaultMarketingPageSettings } from "../data/marketingPages.js";
import { resolveProductVariant } from "../data/commerceSettings.js";
import { commerceProductsRefreshKey, getPublicStoreProducts } from "../lib/platformData.js";
import {
  getMarketingSection,
  MarketingAction,
  MarketingCta,
  MarketingHero,
  MarketingImage,
  MarketingItem,
  MarketingSectionHeading,
  PageIcon,
} from "../components/MarketingPageBlocks.jsx";

const formatCurrency = (value) => `¥${Math.round(Number(value) || 0).toLocaleString("zh-CN")}`;
const numberValue = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function YieldCalculatorPage({ settings = defaultMarketingPageSettings.calculator, onNavigate, onNotice }) {
  const calculator = getMarketingSection(settings, "calculator");
  const assumptions = getMarketingSection(settings, "assumptions");
  const method = getMarketingSection(settings, "method");
  const cta = getMarketingSection(settings, "cta");
  const config = calculator?.calculatorConfig ?? defaultMarketingPageSettings.calculator.sections[0].calculatorConfig;
  const productsQuery = useQuery({
    queryKey: ["public-store-products"],
    queryFn: getPublicStoreProducts,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });
  const allProducts = productsQuery.data?.items ?? [];
  const selectedProductIds = Array.isArray(config.productIds) ? new Set(config.productIds) : null;
  const products = selectedProductIds ? allProducts.filter((product) => selectedProductIds.has(product.id)) : allProducts;
  const [activeProductId, setActiveProductId] = useState("");
  const activeProduct = products.find((product) => product.id === activeProductId) ?? products[0];
  const levels = activeProduct?.specs ?? [];
  const [specSelections, setSpecSelections] = useState({});
  const selectedSku = useMemo(() => resolveProductVariant(activeProduct, specSelections), [activeProduct, specSelections]);
  const selectedSpecs = selectedSku.specification;
  const [deviceCount, setDeviceCount] = useState(1);

  useEffect(() => {
    if (products.length && !products.some((product) => product.id === activeProductId)) setActiveProductId(products[0].id);
  }, [activeProductId, products]);

  useEffect(() => setSpecSelections({}), [activeProduct?.id]);

  useEffect(() => {
    const refresh = (event) => { if (event.key === commerceProductsRefreshKey) void productsQuery.refetch(); };
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [productsQuery.refetch]);

  const result = useMemo(() => {
    const count = Math.max(1, numberValue(deviceCount, 1));
    const monthlyRentalPrice = Math.max(0, selectedSku.price);
    const monthlyRate = Math.max(0, numberValue(selectedSpecs.monthlyReturnRate?.value));
    const rentalDays = Math.max(1, numberValue(selectedSpecs.rentalDuration?.value, 1));
    const rentalMonths = rentalDays / 30;
    const dailyTokenOutput = Math.max(0, numberValue(selectedSpecs.dailyTokenOutput?.value));
    const unitMonthlyYield = monthlyRentalPrice * (monthlyRate / 100);
    const monthlyYield = count * unitMonthlyYield;
    return {
      count,
      monthlyRentalPrice,
      monthlyRate,
      rentalDays,
      rentalMonths,
      dailyTokenOutput,
      unitMonthlyYield,
      monthlyYield,
      monthlyRentalTotal: count * monthlyRentalPrice,
      contractYield: monthlyYield * rentalMonths,
      dailyTokenTotal: count * dailyTokenOutput,
    };
  }, [selectedSku.price, selectedSpecs, deviceCount]);

  return (
    <div className="managed-page managed-calculator-page">
      <MarketingHero hero={settings.hero} pageName="calculator" onNavigate={onNavigate} onNotice={onNotice} />

      {calculator?.enabled ? (
        <section className="yield-calculator shell" id="calculator">
          <div className="yield-calculator-form">
            <MarketingSectionHeading section={calculator} />
            {productsQuery.isLoading ? <div className="yield-product-state">正在读取已上架商品与规格...</div> : null}
            {productsQuery.isError ? <div className="yield-product-state error"><strong>商品数据读取失败</strong><button type="button" onClick={() => productsQuery.refetch()}>重新读取</button></div> : null}
            {!productsQuery.isLoading && !productsQuery.isError && !products.length ? <div className="yield-product-state">当前暂无可测算的上架商品。</div> : null}
            {activeProduct && levels.length ? <>
              <label className="yield-product-select"><span>选择真实商品</span><select value={activeProduct.id} onChange={(event) => setActiveProductId(event.target.value)}><option value="" disabled>请选择商品</option>{products.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select></label>
              <div className="yield-specification-levels">{levels.map((level) => <fieldset key={level.id}><legend>{level.name}</legend><div className="yield-plan-selector" role="radiogroup" aria-label={`选择${level.name}`}>{level.options.map((option) => { const selectedId = specSelections[level.id] ?? level.options[0]?.id; const active = option.id === selectedId; return <button type="button" role="radio" aria-checked={active} className={active ? "active" : ""} key={option.id} onClick={() => setSpecSelections((current) => ({ ...current, [level.id]: option.id }))}><span>{option.value}</span><small>{level.unit || level.name}</small></button>; })}</div></fieldset>)}</div>
              <div className="yield-source-note"><span>实时商品数据</span><button type="button" onClick={() => onNavigate(`/estates/${activeProduct.categoryId || "uncategorized"}/${activeProduct.id}`)}>查看商品详情</button></div>
              <div className="yield-plan-grid yield-plan-grid-live">
                <article><span>唯一型号</span><strong>{activeProduct.gpuModel}</strong></article>
                <article><span>算力规格</span><strong>{selectedSpecs.computePower?.value || "待选择"}</strong></article>
                <article><span>月租价格</span><strong>{formatCurrency(result.monthlyRentalPrice)}</strong></article>
                <article><span>月租回报率</span><strong>{result.monthlyRate.toFixed(2).replace(/\.00$/, "")}%</strong></article>
                <article><span>租赁时长</span><strong>{result.rentalDays} 天</strong></article>
                <article><span>每日 TOKEN 产出</span><strong>{result.dailyTokenOutput.toLocaleString("zh-CN")} TOKEN</strong></article>
              </div>
            <label className="yield-input yield-device-count">
              <span><PageIcon name="HardDrives" weight="fill" />设备数量</span>
              <div><input type="number" min="1" step="1" value={deviceCount} onChange={(event) => setDeviceCount(Math.max(1, numberValue(event.target.value, 1)))} /><b>台</b></div>
              <small>调整参与委托租赁的设备数量，结果会立即重新计算。</small>
            </label>
            <div className="yield-formula">
              <span>{config.monthlyLeaseLabel}</span>
              <strong>{formatCurrency(result.monthlyRentalPrice)} × {result.monthlyRate.toFixed(2).replace(/\.00$/, "")}% = {formatCurrency(result.unitMonthlyYield)} / 台</strong>
            </div>
            <MarketingAction button={calculator.button} onNavigate={onNavigate} onNotice={onNotice} variant="outline" />
            </> : null}
          </div>
          <aside className="yield-results" aria-live="polite">
            <MarketingImage section={calculator} sizes="(max-width: 760px) 100vw, 38vw" />
            <div className="yield-result-heading"><span><PageIcon name="ChartLineUp" /></span><div><strong>本次测算结果</strong><small>示例估算，不代表固定收益</small></div></div>
            <div className="yield-result-grid">
              <article><span>委托设备</span><strong>{activeProduct?.gpuModel || "待选择"} × {result.count} 台</strong></article>
              <article><span>每日 TOKEN 产出</span><strong>{result.dailyTokenTotal.toLocaleString("zh-CN")} TOKEN</strong></article>
              <article className="yield-result-primary"><span>预计每月跑算收益</span><strong>{formatCurrency(result.monthlyYield)}</strong></article>
              <article><span>租赁期限</span><strong>{result.rentalDays} 天</strong></article>
              <article><span>每月租金合计</span><strong>{formatCurrency(result.monthlyRentalTotal)}</strong></article>
              <article><span>租期预计跑算收益</span><strong>{formatCurrency(result.contractYield)}</strong></article>
            </div>
          </aside>
        </section>
      ) : null}

      {assumptions?.enabled ? (
        <section className="managed-feature-section shell" id="calculator-assumptions">
          <div className="managed-feature-intro">
            <MarketingSectionHeading section={assumptions} />
            <MarketingImage section={assumptions} sizes="(max-width: 760px) 100vw, 36vw" />
            <MarketingAction button={assumptions.button} onNavigate={onNavigate} onNotice={onNotice} variant="outline" />
          </div>
          <div className="managed-feature-list">
            {assumptions.items.map((entry) => <MarketingItem key={entry.id} entry={entry} onNavigate={onNavigate} onNotice={onNotice} />)}
          </div>
        </section>
      ) : null}

      {method?.enabled ? (
        <section className="managed-operations shell" id="calculator-method">
          <div className="managed-operations-media"><MarketingImage section={method} sizes="(max-width: 760px) 100vw, 984px" /></div>
          <div className="managed-operations-panel">
            <MarketingSectionHeading section={method} />
            <div className="managed-operation-list">
              {method.items.map((entry) => <MarketingItem key={entry.id} entry={entry} onNavigate={onNavigate} onNotice={onNotice} />)}
            </div>
            <MarketingAction button={method.button} onNavigate={onNavigate} onNotice={onNotice} />
          </div>
        </section>
      ) : null}

      <MarketingCta section={cta} onNavigate={onNavigate} onNotice={onNotice} />
    </div>
  );
}
