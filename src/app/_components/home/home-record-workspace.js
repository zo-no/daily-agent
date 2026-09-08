/**
 * @fileoverview 首页时间线、分类记录和固定记录的渲染工作区。
 */

import { AgentReviewComplete } from "./agent-diary-review";
import { FixedRecords } from "../fixed-records";
import { HomeRecordViews } from "./home-record-views";

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
  locale,
  onAgentRestart,
  onAgentStop,
  onUndoCategory,
  onCalendarOpenChange,
  onCancelQuickEdit,
  onCancelQuickRecord,
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
  onSaveTimelineQuickRecord,
  quickRecordFocusToken,
  quickRecordKey,
  quickRecordOpen,
  planAgentIntro,
  planAgentReviewKey,
  planAgentReviewPanel,
  planAgentStatus,
  planBlocks,
  goals = [],
  planCreateRequest,
  quickEditDraft,
  quickEditableEntryIds,
  registerRailSection,
  selectedDate,
  showDomainQuickRecords,
  t,
  timelineEntries,
  viewMode
}) {
  return (
    <div className="home-diary-workspace">
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
          onCancelQuickRecord={onCancelQuickRecord}
          onOpenClarification={onOpenClarification}
          onChangeQuickEdit={onChangeQuickEdit}
          onSaveFixed={onSaveFixed}
          onSaveQuickRecord={onSaveQuickRecord}
          onSaveTimelineQuickRecord={onSaveTimelineQuickRecord}
          quickRecordFocusToken={quickRecordFocusToken}
          quickRecordKey={quickRecordKey}
          quickRecordOpen={quickRecordOpen}
          onSavePlan={onSavePlan}
          onPlanAgentStart={onPlanAgentStart}
          onPlanAgentStop={onPlanAgentStop}
          onPlanAgentRestart={onPlanAgentStart}
          onPlanEditorOpen={onPlanEditorOpen}
          planCreateRequest={planCreateRequest}
          onPlanCreateRequestHandled={onPlanCreateRequestHandled}
          registerRailSection={registerRailSection}
          planBlocks={planBlocks}
          goals={goals}
          allDayPlans={allDayPlans}
          selectedDate={selectedDate}
          showDomainQuickRecords={showDomainQuickRecords}
          t={t}
          timelineEntries={timelineEntries}
          inlineEditor={inlineEditor}
          viewMode={viewMode}
        />
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
          onSave={onSaveFixed}
          t={t}
        />
      )}
    </div>
  );
}
