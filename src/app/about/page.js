import Link from "next/link";
import { PUBLIC_POLICY_DOCUMENTS } from "@/lib/public-policies.mjs";
import { PublicMasthead, PublicPageFooter } from "../public-page-shell";

const document = PUBLIC_POLICY_DOCUMENTS.about;
const marketing = document.marketing;

export const metadata = {
  title: document.title.en,
  description: document.description.en
};

function LocalizedPair({ copy, className = "" }) {
  return (
    <span className={className}>
      <span lang="en">{copy.en}</span>
      <span lang="zh-CN">{copy["zh-CN"]}</span>
    </span>
  );
}

function ProductPreview() {
  return (
    <figure
      className="public-about-product"
      data-about-static-preview="true"
      aria-labelledby="about-product-caption"
    >
      <figcaption id="about-product-caption">
        <LocalizedPair copy={marketing.preview.label} />
      </figcaption>
      <div className="public-about-product-paper">
        <div className="public-about-product-head">
          <div>
            <span className="public-about-product-name">Log Note</span>
            <LocalizedPair copy={marketing.preview.date} className="public-about-product-date" />
          </div>
          <span className="public-about-product-mode" aria-hidden="true">Diary · Plan</span>
        </div>

        <div className="public-about-product-workspace">
          <section className="public-about-product-diary" aria-label="Illustrative daily records / 示例日记">
            <p className="public-about-product-label">Record / 记录</p>
            <div className="public-about-entry-list">
              {marketing.preview.entries.map((entry) => (
                <div className="public-about-entry" key={entry.time}>
                  <time>{entry.time}</time>
                  <LocalizedPair copy={entry.text} />
                </div>
              ))}
            </div>
          </section>

          <section className="public-about-product-plan" aria-label="Illustrative day plan / 示例日计划">
            <p className="public-about-product-label">Plan / 计划</p>
            <div className="public-about-plan-list">
              {marketing.preview.plans.map((plan) => (
                <div className={`public-about-plan ${plan.readOnly ? "is-read-only" : ""}`} key={`${plan.time}-${plan.title.en}`}>
                  <time>{plan.time}</time>
                  <div>
                    <LocalizedPair copy={plan.title} />
                    <LocalizedPair copy={plan.source} className="public-about-plan-source" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </figure>
  );
}

function CalendarIllustration() {
  return (
    <figure className="public-about-calendar-figure" aria-label="Optional Calendar context / 可选日历上下文">
      <div className="public-about-calendar-axis" aria-hidden="true" />
      {marketing.preview.plans.map((plan) => (
        <div className={`public-about-calendar-event ${plan.readOnly ? "is-read-only" : ""}`} key={`calendar-${plan.time}`}>
          <time>{plan.time}</time>
          <div>
            <LocalizedPair copy={plan.title} />
            <LocalizedPair copy={plan.source} className="public-about-plan-source" />
          </div>
        </div>
      ))}
    </figure>
  );
}

export default function AboutPage() {
  return (
    <main className="public-policy-page public-about-page">
      <section className="public-about-hero" aria-labelledby="about-hero-title">
        <div className="public-about-chrome"><PublicMasthead activeSlug={document.slug} /></div>
        <div className="public-about-hero-grid">
          <div className="public-about-hero-copy">
            <p className="public-about-kicker"><LocalizedPair copy={marketing.hero.eyebrow} /></p>
            <h1 id="about-hero-title">
              <span className="public-about-title-brand">Log Note</span>
              <LocalizedPair copy={marketing.hero.headline} className="public-about-title-promise" />
            </h1>
            <LocalizedPair copy={marketing.hero.body} className="public-about-lede" />
            <div className="public-about-actions">
              <Link className="public-about-primary" href="/">
                <LocalizedPair copy={marketing.hero.primaryAction} />
              </Link>
              <Link className="public-about-secondary" href="/privacy">
                <LocalizedPair copy={marketing.hero.secondaryAction} />
              </Link>
            </div>
          </div>
          <ProductPreview />
        </div>
        <a className="public-about-scroll" href="#about-loop">
          <span>Explore / 继续了解</span>
          <span aria-hidden="true">↓</span>
        </a>
      </section>

      <article className="public-about-story" aria-label="About Log Note / 关于 Log Note">
        <section id="about-loop" className="public-about-section public-about-loop public-about-reveal" data-about-section="core-loop">
          <div className="public-about-section-heading">
            <p className="public-about-kicker"><LocalizedPair copy={marketing.coreLoop.eyebrow} /></p>
            <h2><LocalizedPair copy={marketing.coreLoop.title} /></h2>
            <LocalizedPair copy={marketing.coreLoop.body} className="public-about-section-intro" />
          </div>
          <ol className="public-about-loop-list">
            {marketing.coreLoop.steps.map((step, index) => (
              <li key={step.id}>
                <span className="public-about-loop-number">{String(index + 1).padStart(2, "0")}</span>
                <h3><LocalizedPair copy={step.label} /></h3>
                <LocalizedPair copy={step.detail} />
              </li>
            ))}
          </ol>
        </section>

        <section className="public-about-principles public-about-reveal" data-about-section="principles">
          <div className="public-about-principles-inner">
            <div className="public-about-section-heading">
              <p className="public-about-kicker"><LocalizedPair copy={marketing.principles.eyebrow} /></p>
              <h2><LocalizedPair copy={marketing.principles.title} /></h2>
            </div>
            <ol className="public-about-principle-list">
              {marketing.principles.items.map((item, index) => (
                <li key={item.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3><LocalizedPair copy={item.title} /></h3>
                    <LocalizedPair copy={item.body} />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="public-about-section public-about-calendar public-about-reveal" data-about-section="calendar">
          <div className="public-about-section-heading">
            <p className="public-about-kicker"><LocalizedPair copy={marketing.calendar.eyebrow} /></p>
            <h2><LocalizedPair copy={marketing.calendar.title} /></h2>
            <LocalizedPair copy={marketing.calendar.body} className="public-about-section-intro" />
            <Link className="public-about-text-link" href="/privacy#en-google-calendar">
              <LocalizedPair copy={marketing.calendar.link} />
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <CalendarIllustration />
        </section>

        <section className="public-about-final public-about-reveal" data-about-section="final-cta">
          <p className="public-about-kicker"><LocalizedPair copy={marketing.finalCta.eyebrow} /></p>
          <h2><LocalizedPair copy={marketing.finalCta.title} /></h2>
          <LocalizedPair copy={marketing.finalCta.body} className="public-about-section-intro" />
          <div className="public-about-actions">
            <Link className="public-about-primary" href="/">
              <LocalizedPair copy={marketing.finalCta.primaryAction} />
            </Link>
            <Link className="public-about-secondary" href="/terms">
              <LocalizedPair copy={marketing.finalCta.secondaryAction} />
            </Link>
          </div>
        </section>
      </article>

      <div className="public-about-footer-wrap"><PublicPageFooter document={document} /></div>
    </main>
  );
}
