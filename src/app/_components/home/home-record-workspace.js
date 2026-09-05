/**
 * @fileoverview 首页时间线、分类记录和固定记录的渲染工作区。
 */

import { AgentReviewComplete } from "./agent-diary-review";
import { FixedRecords } from "../../fixed-records";
import { HomeRecordViews, InlineQuickRecord } from "./home-record-views";

/** Renders the record surface while HomePage owns state, navigation, and side effects. */
export function HomeRecordWorkspace({
  activeAgentItem,
  activeDraftId,
  activePlanAgentItem,
  agentReviewPanel,
  agentSession,
  allDayPlans,
  calendarOpen,
  calendarTriggerRef,
  categoryGroups,
  categoryMap,
  clarificationEntryIds,
  clarificationPlanIds,
  clarificationSourceIdForEntry,
  clarificationSourceIdForPlan,
  dayPlanActive,
  domainMap,
  entries,
  fixedItems,
  fixedGroups,
  googleCalendarSupported,
  inlineEditor,
  inlineQuickRecordKey,
  inlineQuickRecordVisible,
  locale,
  onAgentRestart,
  onAgentStop,
  onUndoCategory,
  onCalendarOpenChange,
  onCancelQuickEdit,
  onChangeQuickEdit,
  onDateChange,
  onDeletePlan,
  onOpenClarification,
  onOpenEntry,
  onOpenEntryTime,
  onOpenQuickEdit,
  onPlanAgentStart,
  onPlanAgentStop,
  onPlanCreateRequestHandled,
  onPlanEditorOpen,
  onSaveFixed,
  onSavePlan,
  onSaveQuickEdit,
  onSaveQuickRecord,
  planAgentIntro,
  planAgentReviewKey,
  planAgentReviewPanel,
  planAgentStatus,
  planBlocks,
  planCreateRequest,
  quickEditDraft,
  quickEditableEntryIds,
  registerRailSection,
  selectedDate,
  showDomainQuickRecords,
  t,
  timelineEntries,
  toolWorkspaceOpen,
  viewMode
}) {
  return (
    <div
      className={`home-diary-workspace${toolWorkspaceOpen ? " is-tool-hidden" : ""}`}
      aria-hidden={toolWorkspaceOpen ? "true" : undefined}
      inert={toolWorkspaceOpen || undefined}
    >
      <div className="home-record-stream">
        <HomeRecordViews
          activeAgentEntryId={activeAgentItem?.entryId || ""}
          activeAgentKind={activeAgentItem?.kind || ""}
          activeDraftId={activeDraftId}
          clarificationEntryIds={clarificationEntryIds}
          clarificationSourceIdForEntry={clarificationSourceIdForEntry}
          clarificationPlanIds={clarificationPlanIds}
          clarificationSourceIdForPlan={clarificationSourceIdForPlan}
          quickEditDraft={quickEditDraft}
          quickEditableEntryIds={quickEditableEntryIds}
          agentReviewPanel={agentReviewPanel}
          activePlanAgentId={activePlanAgentItem?.planId || ""}
          planAgentReviewPanel={planAgentReviewPanel}
          planAgentReviewKey={planAgentReviewKey}
          planAgentStatus={planAgentStatus}
          planAgentIntro={planAgentIntro}
          calendarTriggerRef={calendarTriggerRef}
          calendarOpen={calendarOpen}
          categoryGroups={categoryGroups}
          categoryMap={categoryMap}
          dayPlanActive={dayPlanActive}
          domainMap={domainMap}
          entries={entries}
          googleCalendarSupported={googleCalendarSupported}
          locale={locale}
          onCalendarOpenChange={onCalendarOpenChange}
          onDateChange={onDateChange}
          onDeletePlan={onDeletePlan}
          onOpenEntry={onOpenEntry}
          onOpenQuickEdit={onOpenQuickEdit}
          onOpenEntryTime={onOpenEntryTime}
          onSaveQuickEdit={onSaveQuickEdit}
          onCancelQuickEdit={onCancelQuickEdit}
          onOpenClarification={onOpenClarification}
          onChangeQuickEdit={onChangeQuickEdit}
          onSaveFixed={onSaveFixed}
          onSaveQuickRecord={onSaveQuickRecord}
          onSavePlan={onSavePlan}
          onPlanAgentStart={onPlanAgentStart}
          onPlanAgentStop={onPlanAgentStop}
          onPlanAgentRestart={onPlanAgentStart}
          onPlanEditorOpen={onPlanEditorOpen}
          planCreateRequest={planCreateRequest}
          onPlanCreateRequestHandled={onPlanCreateRequestHandled}
          registerRailSection={registerRailSection}
          planBlocks={planBlocks}
          allDayPlans={allDayPlans}
          selectedDate={selectedDate}
          showDomainQuickRecords={showDomainQuickRecords}
          t={t}
          timelineEntries={timelineEntries}
          inlineEditor={inlineEditor}
          viewMode={viewMode}
        />
        {inlineQuickRecordVisible && (
          <InlineQuickRecord
            key={inlineQuickRecordKey}
            onSave={onSaveQuickRecord}
            t={t}
          />
        )}
        {agentSession.status === "complete" && !dayPlanActive && (
          <div className="agent-review-complete-shell">
            <AgentReviewComplete
              lastCategoryUndo={agentSession.lastCategoryUndo}
              onRestart={onAgentRestart}
              onStop={onAgentStop}
              onUndoCategory={onUndoCategory}
              t={t}
            />
          </div>
        )}
      </div>

      {viewMode === "timeline" && !dayPlanActive && (
        <FixedRecords
          items={fixedItems}
          groups={fixedGroups}
          onRegisterRailSection={registerRailSection}
          onSave={onSaveFixed}
          t={t}
        />
      )}
    </div>
  );
}
