"use client";

/** Local, read-only review of the active account's recent records. */

import { useEffect, useMemo, useRef, useState } from "react";
import { buildDomainInsights } from "@/lib/analytics-model.mjs";
import { createRemoteDomainReviewProvider } from "@/lib/domain-review-provider.mjs";
import { localizeDomainName } from "@/lib/i18n.mjs";
import { useAuth } from "../auth-provider";
import { useI18n } from "../i18n";
import { useLogNoteData } from "../use-log-note-data";
import { ManagementHeader } from "../management-header";
import { TrendChart } from "./trend-chart";
import { WeeklySummary } from "./weekly-summary";

const E2E_AUTH_CONFIGURED = process.env.NEXT_PUBLIC_LOG_NOTE_E2E_AUTH === "1";

function reviewAccessToken(session, identity) {
  if (session?.access_token) return session.access_token;
  if (E2E_AUTH_CONFIGURED
    && identity?.provider === "test"
    && typeof window !== "undefined"
    && ["127.0.0.1", "localhost"].includes(window.location.hostname)) {
    return "e2e-domain-review-token";
  }
  return "";
}

function displayDomainName(review, locale) {
  return localizeDomainName({ id: review.domainId, name: review.name }, locale);
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
  const { identity, session } = useAuth();
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
  const weeklyProvider = useMemo(() => createRemoteDomainReviewProvider({
    getAccessToken: () => reviewAccessToken(session, identity)
  }), [identity, session]);

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
  const evidenceLabel = selected?.evidenceState === "ready"
    ? t(`insights.trend.${selected.trendDirection}`)
    : selected ? t(`insights.evidenceShort.${selected.evidenceState}`) : "";

  return (
    <main
      ref={pageRef}
      className="insights-page"
      data-insights-page
      data-insights-state={pageState}
      data-selected-total={selected?.totalRecords || 0}
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

            <header className="insights-report-heading" data-insights-required>
              <div
                className="insights-report-kicker"
                aria-label={t("insights.windowLabel", { start: review.window.startDate, end: review.window.endDate })}
              >
                <h2>{selectedName}</h2>
                <span aria-hidden="true">·</span>
                <p>{t("insights.windowShort")}</p>
              </div>
              <p className={`insights-evidence-state is-${selected.evidenceState}`}>
                {evidenceLabel}
              </p>
            </header>

            <section className="insights-activity" aria-label={t("insights.activityTitle")}>
              <TrendChart
                key={selected.domainId}
                domainName={selectedName}
                locale={locale}
                series={selected.series}
                t={t}
              />
            </section>

            <WeeklySummary
              key={`${accountId}:${selected.domainId}:${locale}`}
              accountId={accountId}
              data={data}
              domainId={selected.domainId}
              domainName={selectedName}
              locale={locale}
              provider={weeklyProvider}
              t={t}
            />

            {selected.investmentLike && (
              <section className="insights-investment" aria-label={t("insights.investmentTitle")}>
                <p className="insights-investment-boundary" data-investment-boundary data-insights-required>
                  {t("insights.investmentBoundary")}
                </p>
              </section>
            )}

            {review.unresolved && <UnresolvedNotice count={review.unresolved.totalRecords} t={t} />}
          </article>
        )}
      </div>
    </main>
  );
}
