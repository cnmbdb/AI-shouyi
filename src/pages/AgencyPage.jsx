import { defaultMarketingPageSettings } from "../data/marketingPages.js";
import {
  getMarketingSection,
  MarketingAction,
  MarketingCta,
  MarketingHero,
  MarketingImage,
  MarketingItem,
  MarketingSectionHeading,
} from "../components/MarketingPageBlocks.jsx";

export function AgencyPage({ settings = defaultMarketingPageSettings.agency, onNavigate, onNotice }) {
  const benefits = getMarketingSection(settings, "benefits");
  const process = getMarketingSection(settings, "process");
  const standards = getMarketingSection(settings, "standards");
  const cta = getMarketingSection(settings, "agency-apply");

  return (
    <div className="managed-page managed-agency-page">
      <MarketingHero hero={settings.hero} pageName="agency" onNavigate={onNavigate} onNotice={onNotice} />

      {benefits?.enabled ? (
        <section className="managed-feature-section managed-agency-benefits shell" id="agency-benefits">
          <div className="managed-feature-intro">
            <MarketingSectionHeading section={benefits} />
            <MarketingImage section={benefits} sizes="(max-width: 760px) 100vw, 36vw" />
            <MarketingAction button={benefits.button} onNavigate={onNavigate} onNotice={onNotice} variant="outline" />
          </div>
          <div className="managed-feature-list">
            {benefits.items.map((entry) => <MarketingItem key={entry.id} entry={entry} onNavigate={onNavigate} onNotice={onNotice} />)}
          </div>
        </section>
      ) : null}

      {process?.enabled ? (
        <section className="managed-process shell" id="agency-process">
          <div className="managed-process-copy">
            <MarketingSectionHeading section={process} />
            <div className="managed-process-list">
              {process.items.map((entry) => <MarketingItem key={entry.id} entry={entry} onNavigate={onNavigate} onNotice={onNotice} />)}
            </div>
            <MarketingAction button={process.button} onNavigate={onNavigate} onNotice={onNotice} />
          </div>
          <MarketingImage section={process} sizes="(max-width: 760px) 100vw, 42vw" />
        </section>
      ) : null}

      {standards?.enabled ? (
        <section className="managed-story managed-agency-standards shell" id="agency-standards">
          <MarketingImage section={standards} sizes="(max-width: 760px) 100vw, 44vw" />
          <div className="managed-story-copy">
            <MarketingSectionHeading section={standards} />
            <div className="managed-story-items">
              {standards.items.map((entry) => <MarketingItem key={entry.id} entry={entry} onNavigate={onNavigate} onNotice={onNotice} />)}
            </div>
            <MarketingAction button={standards.button} onNavigate={onNavigate} onNotice={onNotice} variant="outline" />
          </div>
        </section>
      ) : null}

      <MarketingCta section={cta} onNavigate={onNavigate} onNotice={onNotice} />
    </div>
  );
}
