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
  const defaults = useMemo(() => Object.fromEntries((calculator?.items ?? []).map((entry) => [entry.id, numberValue(entry.value)])), [calculator?.items]);
  const [inputs, setInputs] = useState(defaults);

  useEffect(() => setInputs(defaults), [defaults]);

  const result = useMemo(() => {
    const deviceCount = Math.max(1, numberValue(inputs.deviceCount, 1));
    const hardwareCost = Math.max(0, numberValue(inputs.hardwareCost));
    const dailyRevenue = Math.max(0, numberValue(inputs.dailyRevenue));
    const dailyHostingCost = Math.max(0, numberValue(inputs.dailyHostingCost));
    const termMonths = Math.max(1, numberValue(inputs.termMonths, 1));
    const days = termMonths * 30;
    const investment = deviceCount * hardwareCost;
    const grossRevenue = deviceCount * dailyRevenue * days;
    const hostingCost = deviceCount * dailyHostingCost * days;
    const netYield = grossRevenue - hostingCost;
    const dailyNet = deviceCount * (dailyRevenue - dailyHostingCost);
    return {
      investment,
      grossRevenue,
      hostingCost,
      netYield,
      roi: investment > 0 ? (netYield / investment) * 100 : 0,
      paybackDays: dailyNet > 0 ? investment / dailyNet : null,
    };
  }, [inputs]);

  return (
    <div className="managed-page managed-calculator-page">
      <MarketingHero hero={settings.hero} pageName="calculator" onNavigate={onNavigate} onNotice={onNotice} />

      {calculator?.enabled ? (
        <section className="yield-calculator shell" id="calculator">
          <div className="yield-calculator-form">
            <MarketingSectionHeading section={calculator} />
            <div className="yield-input-grid">
              {calculator.items.filter((entry) => entry.enabled !== false).map((entry) => (
                <label className="yield-input" key={entry.id}>
                  <span><PageIcon name={entry.icon} weight="thin" />{entry.title}</span>
                  <div><input type="number" min="0" step={entry.id === "dailyHostingCost" ? "0.1" : "1"} value={inputs[entry.id] ?? ""} onChange={(event) => setInputs((current) => ({ ...current, [entry.id]: event.target.value }))} /><b>{entry.suffix}</b></div>
                  <small>{entry.description}</small>
                </label>
              ))}
            </div>
            <MarketingAction button={calculator.button} onNavigate={onNavigate} onNotice={onNotice} variant="outline" />
          </div>
          <aside className="yield-results" aria-live="polite">
            <MarketingImage section={calculator} sizes="(max-width: 760px) 100vw, 38vw" />
            <div className="yield-result-heading"><span><PageIcon name="ChartLineUp" weight="thin" /></span><div><strong>本次测算结果</strong><small>示例估算，不代表固定收益</small></div></div>
            <div className="yield-result-grid">
              <article><span>周期跑算收入</span><strong>{formatCurrency(result.grossRevenue)}</strong></article>
              <article><span>周期托管成本</span><strong>{formatCurrency(result.hostingCost)}</strong></article>
              <article className="yield-result-primary"><span>周期跑算净收益</span><strong>{formatCurrency(result.netYield)}</strong></article>
              <article><span>投入收益率</span><strong>{result.roi.toFixed(1)}%</strong></article>
              <article><span>设备总投入</span><strong>{formatCurrency(result.investment)}</strong></article>
              <article><span>预计回本时间</span><strong>{result.paybackDays ? `${Math.ceil(result.paybackDays)} 天` : "暂无法回本"}</strong></article>
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
