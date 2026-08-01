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

export function AboutPage({ settings = defaultMarketingPageSettings.about, onNavigate, onNotice }) {
  const story = getMarketingSection(settings, "story");
  const principles = getMarketingSection(settings, "principles");
  const operations = getMarketingSection(settings, "operations");
  const cta = getMarketingSection(settings, "cta");

  return (
    <div className="managed-page managed-about-page">
      <MarketingHero hero={settings.hero} pageName="about" onNavigate={onNavigate} onNotice={onNotice} />

      {story?.enabled ? (
        <section className="managed-story shell" id="about-story">
          <MarketingImage section={story} sizes="(max-width: 760px) 100vw, 44vw" />
          <div className="managed-story-copy">
            <span className="managed-section-mark"><PageIcon name={story.icon} weight="thin" /></span>
            <h2>{story.title}</h2>
            <p>{story.description}</p>
            <div className="managed-story-items">
              {story.items.map((entry) => <MarketingItem key={entry.id} entry={entry} onNavigate={onNavigate} onNotice={onNotice} />)}
            </div>
            <MarketingAction button={story.button} onNavigate={onNavigate} onNotice={onNotice} variant="outline" />
          </div>
        </section>
      ) : null}

      {principles?.enabled ? (
        <section className="managed-feature-section shell" id="about-principles">
          <div className="managed-feature-intro">
            <MarketingSectionHeading section={principles} />
            <MarketingImage section={principles} sizes="(max-width: 760px) 100vw, 36vw" />
            <MarketingAction button={principles.button} onNavigate={onNavigate} onNotice={onNotice} variant="outline" />
          </div>
          <div className="managed-feature-list">
            {principles.items.map((entry) => <MarketingItem key={entry.id} entry={entry} onNavigate={onNavigate} onNotice={onNotice} />)}
          </div>
        </section>
      ) : null}

      {operations?.enabled ? (
        <section className="managed-operations shell" id="about-operations">
          <div className="managed-operations-media"><MarketingImage section={operations} sizes="(max-width: 760px) 100vw, 984px" /></div>
          <div className="managed-operations-panel">
            <MarketingSectionHeading section={operations} />
            <div className="managed-operation-list">
              {operations.items.map((entry) => <MarketingItem key={entry.id} entry={entry} onNavigate={onNavigate} onNotice={onNotice} />)}
            </div>
            <MarketingAction button={operations.button} onNavigate={onNavigate} onNotice={onNotice} />
          </div>
        </section>
      ) : null}

      <MarketingCta section={cta} onNavigate={onNavigate} onNotice={onNotice} />
    </div>
  );
}
