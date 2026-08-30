"use client";

/** Local, read-only review of the active account's recent records. */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildDomainInsights } from "@/lib/analytics-model.mjs";
import { localizeDomainName } from "@/lib/i18n.mjs";
import { useAuth } from "../auth-provider";
import { useI18n } from "../i18n";
import { useLogNoteData } from "../use-log-note-data";
import { ManagementHeader } from "../management-header";
import { TrendChart } from "./trend-chart";

function displayDomainName(review, locale) {
  return localizeDomainName({ id: review.domainId, name: review.name }, locale);
}

function Metric({ id, label, value }) {
  return (
    <div className="insights-metric" data-insights-metric={id} data-value={value} data-insights-required>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function PageState({ body, title }) {
  return (
    <section className="insights-state" data-insights-required>
      <span aria-hidden="true">Log Note</span>
      <h2>{title}</h2>
      <p>{body}</p>
    </section>
  );
}

function UnresolvedNotice({ count, t }) {
  return (
    <aside className="insights-unresolved" data-insights-unresolved data-insights-required>
      <h3>{t("insights.unresolvedTitle")}</h3>
      <p>{t("insights.unresolvedBody", { count })}</p>
    </aside>
  );
}

export function InsightsPage() {
  const { identity } = useAuth();
  const { locale, t } = useI18n();
  const { data, hydrated, recovery } = useLogNoteData();
  const accountId = String(identity?.id || "");
  const [analysisAccountId, setAnalysisAccountId] = useState(accountId);
  const [requestedDomainId, setRequestedDomainId] = useState("");
  const [queryReady, setQueryReady] = useState(false);
  const [selectedDomainId, setSelectedDomainId] = useState("");
  const observedAccountRef = useRef(accountId);
  const transitionAccountRef = useRef(null);
  const pageRef = useRef(null);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("domain") || "";
    setRequestedDomainId(requested);
    setQueryReady(true);
  }, []);

  useEffect(() => {
    if (accountId === observedAccountRef.current) return;
    observedAccountRef.current = accountId;
    transitionAccountRef.current = { accountId, previousData: data };
    setAnalysisAccountId("");
  }, [accountId, data]);

  useEffect(() => {
    const transition = transitionAccountRef.current;
    if (!transition || transition.accountId !== accountId || !hydrated || data === transition.previousData) return;
    transitionAccountRef.current = null;
    setAnalysisAccountId(accountId);
  }, [accountId, data, hydrated]);

  const dataReady = Boolean(accountId) && hydrated && queryReady && accountId === analysisAccountId;
  const calculation = useMemo(() => {
    if (!dataReady || recovery) return { review: null, modelMs: 0, renderStartedAt: 0 };
    const started = typeof performance === "undefined" ? 0 : performance.now();
    const review = buildDomainInsights(data);
    return {
      review,
      modelMs: typeof performance === "undefined" ? 0 : performance.now() - started,
      renderStartedAt: started
    };
  }, [data, dataReady, recovery]);

  useEffect(() => {
    if (!pageRef.current || !calculation.review || !calculation.renderStartedAt) return;
    pageRef.current.dataset.renderMs = (performance.now() - calculation.renderStartedAt).toFixed(2);
  }, [calculation.renderStartedAt, calculation.review]);

  useEffect(() => {
    const domains = calculation.review?.domains || [];
    if (!domains.length) {
      setSelectedDomainId("");
      return;
    }
    setSelectedDomainId((current) => {
      if (requestedDomainId && domains.some((domain) => domain.domainId === requestedDomainId)) return requestedDomainId;
      if (current && domains.some((domain) => domain.domainId === current)) return current;
      return domains.find((domain) => domain.totalRecords > 0)?.domainId || domains[0].domainId;
    });
  }, [calculation.review, requestedDomainId]);

  const selectDomain = (domainId) => {
    setRequestedDomainId("");
    setSelectedDomainId(domainId);
    const url = new URL(window.location.href);
    url.searchParams.set("domain", domainId);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
  };

  const review = calculation.review;
  const selected = review?.domains.find((domain) => domain.domainId === selectedDomainId) || null;
  const selectedName = selected ? displayDomainName(selected, locale) : "";
  const pageState = !dataReady ? "loading" : recovery ? "recovery" : !selected ? "empty" : selected.evidenceState;

  return (
    <main
      ref={pageRef}
      className="insights-page"
      data-insights-page
      data-insights-state={pageState}
      data-model-ms={calculation.modelMs.toFixed(2)}
      data-render-ms="0.00"
    >
      <ManagementHeader backHref="/" backLabel={t("insights.back")} title={t("insights.title")} />
      <div className="insights-shell">
        {!dataReady && <PageState title={t("insights.title")} body={t("insights.loading")} />}
        {dataReady && recovery && <PageState title={t("insights.recoveryTitle")} body={t("insights.recoveryBody")} />}
        {dataReady && !recovery && !selected && (
          <>
            <PageState title={t("insights.emptyTitle")} body={t("insights.emptyBody")} />
            {review?.unresolved && <UnresolvedNotice count={review.unresolved.totalRecords} t={t} />}
          </>
        )}

        {dataReady && !recovery && selected && (
          <article className="insights-report">
            <header className="insights-report-heading" data-insights-required>
              <div>
                <p>{t("insights.windowLabel", { start: review.window.startDate, end: review.window.endDate })}</p>
                <h2>{selectedName}</h2>
              </div>
              <p className={`insights-evidence-state is-${selected.evidenceState}`}>
                {t(`insights.evidence.${selected.evidenceState}`)}
              </p>
            </header>

            <nav className="insights-domain-nav" aria-label={t("insights.domainNavigation")}>
              {review.domains.map((domain) => {
                const name = displayDomainName(domain, locale);
                const current = domain.domainId === selected.domainId;
                return (
                  <button
                    key={domain.domainId}
                    type="button"
                    data-insights-control
                    data-insights-domain-id={domain.domainId}
                    aria-pressed={current}
                    aria-label={t("insights.switchDomain", { domain: name })}
                    onClick={() => selectDomain(domain.domainId)}
                  >
                    <span>{name}</span>
                    <small>{domain.totalRecords}</small>
                  </button>
                );
              })}
            </nav>

            <section className="insights-activity" aria-labelledby="insights-activity-title">
              <div className="insights-section-heading" data-insights-required>
                <h3 id="insights-activity-title">{t("insights.activityTitle")}</h3>
                <p>{t(`insights.trend.${selected.trendDirection}`)}</p>
              </div>
              <div className="insights-metrics">
                <Metric id="records" label={t("insights.records")} value={selected.totalRecords} />
                <Metric id="active-days" label={t("insights.activeDays")} value={selected.activeDays} />
                <Metric id="ordinary-records" label={t("insights.ordinaryRecords")} value={selected.ordinaryRecords} />
                <Metric id="periodic-records" label={t("insights.periodicRecords")} value={selected.periodicRecords} />
              </div>
              <TrendChart domainName={selectedName} locale={locale} series={selected.series} t={t} />
              <p className="insights-trend-evidence" data-insights-required>
                {t("insights.trendEvidence", {
                  latest: selected.trendEvidence.latestSeven,
                  previous: selected.trendEvidence.previousSeven
                })}
              </p>
              {selected.promptKey && (
                <aside className="insights-reflection" data-insights-required>
                  <span>{t("insights.promptTitle")}</span>
                  <p>{t(selected.promptKey)}</p>
                </aside>
              )}
            </section>

            {selected.investmentLike && (
              <section className="insights-investment" aria-labelledby="insights-investment-title">
                <div className="insights-section-heading" data-insights-required>
                  <div>
                    <h3 id="insights-investment-title">{t("insights.investmentTitle")}</h3>
                    <p>{t("insights.investmentEvidence", { count: selected.investmentSourceIds.length })}</p>
                  </div>
                </div>
                <p className="insights-investment-boundary" data-investment-boundary data-insights-required>
                  {t("insights.investmentBoundary")}
                </p>
                <dl className="insights-investment-coverage">
                  {[
                    ["rationale", "insights.investmentRationale"],
                    ["outcome", "insights.investmentOutcome"],
                    ["riskBoundary", "insights.investmentRiskBoundary"]
                  ].map(([key, labelKey]) => (
                    <div key={key} data-investment-coverage data-insights-required>
                      <dt>{t(labelKey)}</dt>
                      <dd>{t("insights.investmentCoverageCount", { count: selected.investmentCoverage[key] })}</dd>
                    </div>
                  ))}
                </dl>
                <aside className="insights-investment-prompt" data-insights-required>
                  <span>{t("insights.investmentPromptTitle")}</span>
                  <p>{t(selected.investmentPromptKey)}</p>
                </aside>
              </section>
            )}

            <section className="insights-sources" aria-labelledby="insights-sources-title">
              <div className="insights-section-heading" data-insights-required>
                <h3 id="insights-sources-title">{t("insights.recentSources")}</h3>
              </div>
              {selected.recentSources.length ? (
                <ol>
                  {selected.recentSources.map((source) => (
                    <li key={source.id} data-insights-source>
                      <Link href={`/?entry=${encodeURIComponent(source.id)}`} data-insights-control>
                        <span className="insights-source-meta">
                          <time dateTime={`${source.date}${source.time ? `T${source.time}` : ""}`}>{source.date}{source.time ? ` · ${source.time}` : ""}</time>
                          <small>{t(source.periodic ? "insights.sourcePeriodic" : "insights.sourceOrdinary")}</small>
                        </span>
                        <p>{source.excerpt || t("insights.emptyExcerpt")}</p>
                      </Link>
                    </li>
                  ))}
                </ol>
              ) : <p className="insights-no-sources">{t("insights.noSources")}</p>}
            </section>

            {review.unresolved && <UnresolvedNotice count={review.unresolved.totalRecords} t={t} />}
          </article>
        )}
      </div>
    </main>
  );
}
