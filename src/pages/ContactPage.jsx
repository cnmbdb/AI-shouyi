import { useState } from "react";
import { ArrowRight, CaretDown } from "@phosphor-icons/react";
import { defaultMarketingPageSettings } from "../data/marketingPages.js";
import {
  getMarketingSection,
  MarketingAction,
  MarketingHero,
  MarketingImage,
  MarketingItem,
  MarketingSectionHeading,
  openMarketingLink,
  PageIcon,
} from "../components/MarketingPageBlocks.jsx";

export function ContactPage({ settings = defaultMarketingPageSettings.contact, onNavigate, onNotice }) {
  const channels = getMarketingSection(settings, "channels");
  const service = getMarketingSection(settings, "service");
  const faq = getMarketingSection(settings, "faq");
  const formSection = getMarketingSection(settings, "contact-form");
  const [form, setForm] = useState({});

  const submit = (event) => {
    event.preventDefault();
    const fields = formSection.items.filter((entry) => entry.enabled !== false);
    if (fields.some((entry) => !String(form[entry.id] ?? "").trim())) {
      onNotice("请完整填写联系信息后再发送");
      return;
    }
    const target = formSection.button?.link ?? "";
    if (/^mailto:/i.test(target)) {
      const subject = String(form.subject || "Aether Lane 页面咨询").trim();
      const body = fields.map((entry) => `${entry.title}：${String(form[entry.id] ?? "").trim()}`).join("\n\n");
      const base = target.split("?")[0];
      window.location.assign(`${base}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
      onNotice("正在打开邮件客户端");
      return;
    }
    openMarketingLink(target, onNavigate, onNotice);
  };

  return (
    <div className="managed-page managed-contact-page">
      <MarketingHero hero={settings.hero} pageName="contact" onNavigate={onNavigate} onNotice={onNotice} />

      {channels?.enabled ? (
        <section className="managed-feature-section managed-contact-channels shell" id="contact-channels">
          <div className="managed-feature-intro">
            <MarketingSectionHeading section={channels} />
            <MarketingImage section={channels} sizes="(max-width: 760px) 100vw, 36vw" />
            <MarketingAction button={channels.button} onNavigate={onNavigate} onNotice={onNotice} variant="outline" />
          </div>
          <div className="managed-feature-list">
            {channels.items.map((entry) => <MarketingItem key={entry.id} entry={entry} onNavigate={onNavigate} onNotice={onNotice} />)}
          </div>
        </section>
      ) : null}

      {service?.enabled ? (
        <section className="managed-process shell" id="contact-service">
          <div className="managed-process-copy">
            <MarketingSectionHeading section={service} />
            <div className="managed-process-list">
              {service.items.map((entry) => <MarketingItem key={entry.id} entry={entry} onNavigate={onNavigate} onNotice={onNotice} />)}
            </div>
            <MarketingAction button={service.button} onNavigate={onNavigate} onNotice={onNotice} />
          </div>
          <MarketingImage section={service} sizes="(max-width: 760px) 100vw, 42vw" />
        </section>
      ) : null}

      {faq?.enabled ? (
        <section className="managed-faq shell" id="contact-faq">
          <div className="managed-faq-intro">
            <MarketingSectionHeading section={faq} />
            <MarketingImage section={faq} sizes="(max-width: 760px) 100vw, 34vw" />
            <MarketingAction button={faq.button} onNavigate={onNavigate} onNotice={onNotice} variant="outline" />
          </div>
          <div className="managed-faq-list">
            {faq.items.filter((entry) => entry.enabled !== false).map((entry, index) => (
              <details key={entry.id} open={index === 0}>
                <summary><span><PageIcon name={entry.icon} weight="thin" /></span><strong>{entry.title}</strong><CaretDown /></summary>
                <div><p>{entry.description}</p>{entry.link ? <button type="button" onClick={() => openMarketingLink(entry.link, onNavigate, onNotice)}>继续了解 <ArrowRight weight="bold" /></button> : null}</div>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {formSection?.enabled ? (
        <section className="managed-contact-form shell" id="contact-form">
          <MarketingImage section={formSection} sizes="(max-width: 760px) 100vw, 42vw" />
          <form onSubmit={submit}>
            <MarketingSectionHeading section={formSection} />
            <div className="managed-contact-fields">
              {formSection.items.filter((entry) => entry.enabled !== false).map((entry) => (
                <label className={entry.fieldType === "textarea" ? "managed-contact-field managed-contact-field-wide" : "managed-contact-field"} key={entry.id}>
                  <span><PageIcon name={entry.icon} weight="thin" />{entry.title}</span>
                  {entry.fieldType === "textarea"
                    ? <textarea rows="5" value={form[entry.id] ?? ""} placeholder={entry.description} onChange={(event) => setForm((current) => ({ ...current, [entry.id]: event.target.value }))} />
                    : <input value={form[entry.id] ?? ""} placeholder={entry.description} onChange={(event) => setForm((current) => ({ ...current, [entry.id]: event.target.value }))} />}
                </label>
              ))}
            </div>
            <button className="managed-action managed-action-primary" type="submit"><span>{formSection.button.label}</span><ArrowRight weight="bold" /></button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
