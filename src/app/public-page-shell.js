/**
 * @fileoverview Renders versioned bilingual public application documents.
 */

import Link from "next/link";
import { PUBLIC_POLICY_DOCUMENTS, PUBLIC_POLICY_SITE } from "@/lib/public-policies.mjs";

const NAV_ITEMS = ["about", "privacy", "terms"];

function PolicyArticle({ document, locale, label }) {
  return (
    <article className="public-policy-article" lang={locale} aria-labelledby={`${document.slug}-${locale}-title`}>
      <div className="public-policy-language">
        <span>{label}</span>
        <h2 id={`${document.slug}-${locale}-title`}>{document.title[locale]}</h2>
      </div>
      {document.sections[locale].map((section) => (
        <section key={section.id} id={`${locale}-${section.id}`} className="public-policy-section">
          <h3>{section.heading}</h3>
          {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {section.items.length > 0 && <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>}
        </section>
      ))}
    </article>
  );
}

export function PublicPageShell({ document }) {
  return (
    <main className="public-policy-page">
      <header className="public-policy-masthead">
        <Link className="public-policy-brand" href="/" aria-label="Log Note">
          <span className="brand-mark" aria-hidden="true">L</span>
          <strong>Log Note</strong>
        </Link>
        <nav className="public-policy-nav" aria-label="Public documents / 公开文档">
          {NAV_ITEMS.map((slug) => {
            const item = PUBLIC_POLICY_DOCUMENTS[slug];
            return (
              <Link key={slug} href={item.path} aria-current={slug === document.slug ? "page" : undefined}>
                <span lang="en">{item.title.en.replace(" Log Note", "")}</span>
                <span aria-hidden="true"> / </span>
                <span lang="zh-CN">{item.title["zh-CN"].replace(" Log Note", "")}</span>
              </Link>
            );
          })}
        </nav>
      </header>

      <div className="public-policy-heading">
        <p className="eyebrow">Public document · 公开文档</p>
        <h1>
          <span lang="en">{document.title.en}</span>
          <span lang="zh-CN">{document.title["zh-CN"]}</span>
        </h1>
        <p className="public-policy-date">Effective / 生效：<time dateTime={PUBLIC_POLICY_SITE.effectiveDate}>{PUBLIC_POLICY_SITE.effectiveDate}</time></p>
        <div className="public-policy-intro">
          <p lang="en">{document.intro.en}</p>
          <p lang="zh-CN">{document.intro["zh-CN"]}</p>
        </div>
      </div>

      <div className="public-policy-columns">
        <PolicyArticle document={document} locale="en" label="English" />
        <PolicyArticle document={document} locale="zh-CN" label="简体中文" />
      </div>

      <footer className="public-policy-footer">
        <div>
          <strong>Contact / 联系</strong>
          <a href={`mailto:${PUBLIC_POLICY_SITE.supportEmail}`}>{PUBLIC_POLICY_SITE.supportEmail}</a>
        </div>
        {document.slug === "privacy" && (
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer noopener">
            Google API Services User Data Policy
          </a>
        )}
        <Link className="public-policy-open-app" href="/">Open Log Note / 打开 Log Note</Link>
      </footer>
    </main>
  );
}
