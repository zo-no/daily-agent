/**
 * @fileoverview 首页搜索和设置工具工作区的渲染边界。
 */

import { SearchDialog } from "../../search-dialog";
import { SettingsPage } from "../../settings/settings-page";

/** Renders one embedded tool while the page owns navigation and selection state. */
export function HomeToolWorkspace({
  categoryMap,
  entries,
  locale,
  onCloseSearch,
  onCloseSettings,
  onOpenEntry,
  searchOpen,
  setSelectedDate,
  settingsOpen,
  t,
  toolReturnScrollRef
}) {
  if (!searchOpen && !settingsOpen) return null;

  return (
    <div className="home-tool-workspace home-record-stream">
      {searchOpen ? (
        <SearchDialog
          embedded
          open
          entries={entries}
          categoryMap={categoryMap}
          locale={locale}
          onClose={onCloseSearch}
          onSelect={(entry) => {
            toolReturnScrollRef.current = null;
            setSelectedDate(entry.date);
            onOpenEntry(entry);
          }}
          t={t}
        />
      ) : (
        <SettingsPage embedded workspace onClose={onCloseSettings} />
      )}
    </div>
  );
}
