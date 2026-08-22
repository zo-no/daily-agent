/**
 * @fileoverview Read-only daily overview with traceable chronological source records.
 */

function segmentTime(segment, t) {
  if (!segment.startTime) return "—";
  return segment.startTime === segment.endTime ? segment.startTime : `${segment.startTime}–${segment.endTime}`;
}

export function DailyReviewResults({ entryMap, result, t }) {
  return (
    <div className="daily-review-results">
      {result.fallbackReason && <p className="daily-review-fallback" role="status">{t("review.localFallback")}</p>}
      {result.overview && (
        <section className="daily-review-overview" aria-labelledby="daily-review-overview-title">
          <h3 id="daily-review-overview-title">{t("review.overview")}</h3>
          <p>{result.overview}</p>
        </section>
      )}
      <ol className="daily-review-timeline" aria-label={t("review.timelineLabel")}>
        {result.segments.map((segment) => (
          <li className="daily-review-segment" key={segment.id}>
            <time aria-label={!segment.startTime ? t("review.timeUnspecified") : undefined}>{segmentTime(segment, t)}</time>
            <div>
              <h3>{segment.title || t(`review.period.${segment.period}`)}</h3>
              {segment.summary && <p className="daily-review-summary">{segment.summary}</p>}
              <ul className="daily-review-sources" aria-label={t("review.sources")}>
                {segment.entryIds.map((entryId) => {
                  const entry = entryMap.get(entryId);
                  if (!entry) return null;
                  return (
                    <li key={entryId}>
                      <time aria-label={!entry.time ? t("review.timeUnspecified") : undefined}>{entry.time || "—"}</time>
                      <span>{entry.content}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
