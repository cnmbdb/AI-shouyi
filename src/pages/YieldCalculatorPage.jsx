import { useEffect, useMemo, useState } from "react";
import { defaultMarketingPageSettings } from "../data/marketingPages.js";
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
  const plans = config.plans?.length ? config.plans : defaultMarketingPageSettings.calculator.sections[0].calculatorConfig.plans;
  const [activePlanId, setActivePlanId] = useState(plans[0].id);
  const activePlan = plans.find((plan) => plan.id === activePlanId) ?? plans[0];
  const defaultDeviceCount = Math.max(1, numberValue(activePlan.defaultDeviceCount, 1));
  const [deviceCount, setDeviceCount] = useState(defaultDeviceCount);

  useEffect(() => {
    if (!plans.some((plan) => plan.id === activePlanId)) setActivePlanId(plans[0].id);
  }, [activePlanId, plans]);

  useEffect(() => setDeviceCount(defaultDeviceCount), [activePlan.id, defaultDeviceCount]);

  const result = useMemo(() => {
    const count = Math.max(1, numberValue(deviceCount, 1));
    const unitPrice = Math.max(0, numberValue(activePlan.unitPrice));
    const monthlyRate = Math.max(0, numberValue(activePlan.monthlyReturnRate));
    const contractMonths = Math.max(1, numberValue(activePlan.contractMonths, 1));
    const unitMonthlyLease = unitPrice * (monthlyRate / 100);
    const monthlyLease = count * unitMonthlyLease;
    return {
      count,
      unitPrice,
      monthlyRate,
      contractMonths,
      unitMonthlyLease,
      monthlyLease,
      totalPrice: count * unitPrice,
      contractLease: monthlyLease * contractMonths,
    };
  }, [activePlan.contractMonths, activePlan.monthlyReturnRate, activePlan.unitPrice, deviceCount]);

  return (
    <div className="managed-page managed-calculator-page">
      <MarketingHero hero={settings.hero} pageName="calculator" onNavigate={onNavigate} onNotice={onNotice} />

      {calculator?.enabled ? (
        <section className="yield-calculator shell" id="calculator">
          <div className="yield-calculator-form">
            <MarketingSectionHeading section={calculator} />
            <div className="yield-plan-selector" role="tablist" aria-label="选择 GPU 委托租赁方案">
              {plans.map((plan) => <button type="button" role="tab" aria-selected={plan.id === activePlan.id} className={plan.id === activePlan.id ? "active" : ""} key={plan.id} onClick={() => setActivePlanId(plan.id)}>{plan.gpuModel}</button>)}
            </div>
            <div className="yield-plan-grid">
              <article><span>GPU 型号</span><strong>{activePlan.gpuModel}</strong></article>
              <article><span>单台售价</span><strong>{formatCurrency(result.unitPrice)}</strong></article>
              <article><span>月回报率</span><strong>{result.monthlyRate.toFixed(2).replace(/\.00$/, "")}%</strong></article>
              <article><span>闭口协议</span><strong>{result.contractMonths} 个月</strong></article>
            </div>
            <label className="yield-input yield-device-count">
              <span><PageIcon name="HardDrives" weight="thin" />设备数量</span>
              <div><input type="number" min="1" step="1" value={deviceCount} onChange={(event) => setDeviceCount(Math.max(1, numberValue(event.target.value, 1)))} /><b>台</b></div>
              <small>调整参与委托租赁的设备数量，结果会立即重新计算。</small>
            </label>
            <div className="yield-formula">
              <span>{config.monthlyLeaseLabel}</span>
              <strong>{formatCurrency(result.unitPrice)} × {result.monthlyRate.toFixed(2).replace(/\.00$/, "")}% = {formatCurrency(result.unitMonthlyLease)} / 台</strong>
            </div>
            <MarketingAction button={calculator.button} onNavigate={onNavigate} onNotice={onNotice} variant="outline" />
          </div>
          <aside className="yield-results" aria-live="polite">
            <MarketingImage section={calculator} sizes="(max-width: 760px) 100vw, 38vw" />
            <div className="yield-result-heading"><span><PageIcon name="ChartLineUp" weight="thin" /></span><div><strong>本次测算结果</strong><small>示例估算，不代表固定收益</small></div></div>
            <div className="yield-result-grid">
              <article><span>委托设备</span><strong>{activePlan.gpuModel} × {result.count} 台</strong></article>
              <article><span>单台每月委托租赁</span><strong>{formatCurrency(result.unitMonthlyLease)}</strong></article>
              <article className="yield-result-primary"><span>每月委托租赁合计</span><strong>{formatCurrency(result.monthlyLease)}</strong></article>
              <article><span>闭口协议期限</span><strong>{result.contractMonths} 个月</strong></article>
              <article><span>设备总售价</span><strong>{formatCurrency(result.totalPrice)}</strong></article>
              <article><span>协议期累计委托租赁</span><strong>{formatCurrency(result.contractLease)}</strong></article>
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
