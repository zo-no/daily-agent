"use client";

import { ManagementHeader } from "../_components/management-header";
import { GoalsWorkspace } from "../_components/goals-workspace";
import { useI18n } from "../_providers/i18n";

export function GoalsPage() {
  const { t } = useI18n();
  return (
    <main className="goals-page">
      <ManagementHeader backLabel={t("goals.back")} title={t("goals.title")} />
      <div className="goals-shell">
        <GoalsWorkspace />
      </div>
    </main>
  );
}
