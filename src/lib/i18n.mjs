/**
 * @fileoverview 提供 Log Note 的英文、中文翻译和内置数据展示名称。
 */

export const DEFAULT_LOCALE = "en";
export const SUPPORTED_LOCALES = ["en", "zh-CN"];
export const LOCALE_STORAGE_KEY = "log-note:locale";

const EN = {
  "common.category": "Category",
  "common.close": "Close",
  "common.date": "Date",
  "common.done": "Done",
  "common.edit": "Edit",
  "common.more": "More",
  "common.record": "Record",
  "common.search": "Search",
  "common.tags": "Tags",
  "common.templates": "Record setup",
  "common.time": "Time",
  "common.today": "Today",
  "common.uncategorized": "Uncategorized",
  "common.yesterday": "Yesterday",

  "home.addRecord": "Add record",
  "home.backToday": "Back to today",
  "home.categoryView": "Category",
  "home.exportCurrent": "Export {date} Markdown",
  "home.loading": "Opening today…",
  "home.nextDay": "Next day",
  "home.noRecords": "No records for this day",
  "home.noTimelineRecords": "No timeline records for this day",
  "home.previousDay": "Previous day",
  "home.quickActions": "Quick actions",
  "home.returnToday": "Return to today",
  "home.settings": "Settings",
  "home.timeView": "Time",
  "home.timelineView": "Timeline view",
  "home.categoryViewLabel": "Category view",
  "home.domainCategoryCount": "{count} categories",
  "home.categoryItemCount": "{count} items",
  "home.viewMode": "Record view",
  "home.fixedRecordsHint": "Daily and scheduled items stay visible before you record them.",
  "home.recordFixedNow": "Record",
  "home.fixedRecordsInlineHint": "Type values here; open forms expand in place.",
  "home.fixedRecordsProgress": "{completed} completed, {remaining} remaining",
  "home.fixedRecordsRemaining": "{count} remaining",
  "home.adjustFixedRecords": "Adjust",
  "home.fixedRecordsPaused": "No fixed records are shown here. You can restore them in Adjust.",
  "home.fillInline": "Fill in",
  "home.saveFixed": "Save {name}",

  "composer.addTitle": "New record",
  "composer.bold": "Bold",
  "composer.body": "Body",
  "composer.delete": "Delete record",
  "composer.editTitle": "Edit record",
  "composer.placeholder": "Capture this moment…",
  "composer.tagPlaceholder": "work idea",
  "composer.useTemplate": "Choose how to record",
  "composer.fixedValue": "Value",
  "composer.fixedValuePlaceholder": "Enter the current value",
  "composer.fixedEmptyDeletes": "Leaving the value empty and tapping Done deletes this fixed record.",
  "composer.formTemplate": "Guided fields",
  "composer.italic": "Italic",
  "composer.mixedStyle": "Mixed",
  "composer.valueTemplate": "One value",
  "composer.freeTemplate": "Write freely",
  "composer.saveShortcut": "⌘ / Ctrl + Enter to save",
  "composer.subtitle": "Subtitle",
  "composer.textStyle": "Text style",
  "composer.title": "Title",

  "search.label": "Search records",
  "search.placeholder": "Search content, tags, or categories",
  "search.recent": "Recent records",
  "search.results": "{count} results",
  "search.empty": "No matching records",

  "settings.title": "Settings",
  "settings.loading": "Opening settings…",
  "settings.general": "General",
  "settings.data": "Data",
  "settings.language": "Language",
  "settings.languageDescription": "Choose the interface language. Your record content is never translated.",
  "settings.english": "English",
  "settings.chinese": "简体中文",
  "settings.exportTitle": "Take your records with you",
  "settings.exportDescription": "Markdown is for reading and archiving. JSON keeps a complete restorable backup.",
  "settings.markdownOutputTitle": "Markdown output",
  "settings.markdownOutputDescription": "Export today or your full archive, then tune the format beside a live current-day preview.",
  "settings.markdownExports": "Markdown exports",
  "settings.exportAll": "Export all Markdown",
  "settings.exportAllDetail": "All records grouped by date",
  "settings.exportJson": "Export full JSON backup",
  "settings.exportJsonDetail": "Includes categories, templates, and every record",
  "settings.restoreJson": "Restore from JSON",
  "settings.restoreJsonDetail": "Replaces all data on this device",
  "settings.markdownTitle": "Markdown format",
  "settings.markdownDescription": "Adjust the structure used by current-day and full exports.",
  "settings.markdownLayout": "Record layout",
  "settings.markdownGrouped": "Grouped by category",
  "settings.markdownTimeline": "Flat timeline",
  "settings.markdownEntryLine": "Record line",
  "settings.markdownDateHeading": "Date heading in full export",
  "settings.markdownDaySeparator": "Separator between days",
  "settings.markdownPreview": "Current-day preview",
  "settings.markdownReset": "Reset defaults",
  "settings.markdownEmptyPreview": "No records to preview for this day.",
  "settings.localFirst": "Local first",
  "settings.storageNote": "{count} records are stored in this browser. Export a JSON backup regularly.",
  "settings.backupStatusTitle": "Backup protection",
  "settings.backupTitle": "Backup & restore",
  "settings.backupStatusDetail": "{count} records are ready for a full JSON backup.",
  "settings.backupRisk": "Export a full backup before clearing browser data or changing browser, device, domain, or port.",
  "settings.restoreSafety": "A backup is checked before it can replace this browser’s records. Invalid files leave current data unchanged.",
  "settings.structureTitle": "Record structure & starter example",
  "settings.structureDescription": "Export the current setup without records, or download a general example for editing elsewhere.",
  "settings.localTitle": "Local use",
  "settings.install": "Install Log Note",
  "settings.installTip": "Use your mobile browser’s Share menu and choose “Add to Home Screen”.",

  "toast.writeSomething": "Write something first",
  "toast.required": "Complete {field}",
  "toast.recordUpdated": "Record updated",
  "toast.recordAdded": "Saved",
  "toast.recordDeleted": "Record deleted",
  "toast.keepCategory": "Keep at least one category",
  "toast.exported": "Markdown exported",
  "toast.exportedAll": "All Markdown exported",
  "toast.backupExported": "Backup exported",
  "toast.backupRestored": "Backup restored",
  "toast.restoreFailed": "Could not restore backup",
  "toast.markdownReset": "Markdown format reset",
  "toast.fixedNameRequired": "Enter a fixed item name",
  "toast.fixedValueRequired": "Enter a value",
  "toast.emptyRecordDeleted": "Empty record deleted",
  "toast.loadFailed": "Could not read local data. Your saved data has not been changed.",
  "toast.saveFailed": "Could not save local data. Export a backup before closing the page.",

  "confirm.deleteRecord": "Delete this record? This cannot be undone.",
  "confirm.deleteCategory": "Delete “{name}”? Its records and templates will move to the first category.",
  "confirm.restore": "This verified backup contains {entries} records and will replace all data in this browser. Continue?",
  "confirm.deleteTemplate": "Delete this template? Existing records will not be changed.",
  "confirm.discardDraft": "Discard these unsaved changes?",

  "templates.recordSetup": "Record setup",
  "templates.new": "New",
  "templates.newCategory": "New category",
  "templates.export": "Export",
  "templates.exportOptions": "Export options",
  "templates.exportTitle": "Export records",
  "templates.templateLabel": "Way to record",
  "templates.categoryLabel": "Category",
  "templates.categorySetup": "Category setup",
  "templates.categoryName": "Category name",
  "templates.recordBehavior": "Where it appears",
  "templates.newTemplateInCategory": "Add a way to record in this category",
  "templates.deleteCategory": "Delete category",
  "templates.untitledCategory": "Untitled category",
  "templates.templateCount": "{count} templates",
  "templates.itemCount": "{count} fields",
  "templates.backRecords": "Back to records",
  "templates.edit": "Edit way to record",
  "templates.autoSaved": "Saved automatically",
  "templates.inputStyle": "How you fill it in",
  "templates.freeTextStyle": "Write freely",
  "templates.formStyle": "Guided fields",
  "templates.untitled": "Untitled way to record",
  "templates.name": "Name",
  "templates.fields": "Things to fill in",
  "templates.addField": "Add item",
  "templates.required": "Required",
  "templates.optionsPlaceholder": "Separate options with commas",
  "templates.hintPlaceholder": "Input hint (optional)",
  "templates.prefill": "Prefill text",
  "templates.defaults": "Default category, tags, and prompt",
  "templates.defaultCategory": "Default category",
  "templates.defaultTags": "Default tags",
  "templates.prompt": "Input prompt",
  "templates.delete": "Delete template",
  "templates.loading": "Opening templates…",
  "templates.newField": "New field",
  "templates.contentField": "Content",
  "templates.contentPlaceholder": "Record content",
  "templates.fieldType.text": "Single line",
  "templates.fieldType.textarea": "Multiline",
  "templates.fieldType.number": "Number",
  "templates.fieldType.select": "Options",
  "templates.fieldType.rating": "1–5 rating",
  "templates.deleteField": "Delete field",
  "templates.duplicate": "Duplicate template",
  "templates.copyName": "{name} copy",
  "templates.preview": "Recording preview",
  "templates.previewHint": "How this template appears while recording",
  "templates.previewEmpty": "Enter a value",
  "templates.presetQuickName": "Quick note",
  "templates.presetQuickPrompt": "What happened? Add a result or next step if useful.",
  "templates.presetQuickDetail": "One open writing area",
  "templates.presetReflectionName": "Observation & next step",
  "templates.presetReflectionPrompt": "Capture the observation first, then the next action.",
  "templates.presetReflectionDetail": "Write what changed and what you will do next",
  "templates.presetObservation": "Observation",
  "templates.presetObservationHint": "What happened or changed?",
  "templates.presetNextStep": "Next step",
  "templates.presetNextStepHint": "What will you do next?",
  "templates.presetValueName": "Daily value",
  "templates.presetValuePrompt": "Enter today's value and unit.",
  "templates.presetValueDetail": "One recurring daily value",
  "templates.exportRecordsGroup": "Readable records",
  "templates.exportBackupGroup": "Restorable backup",
  "templates.exportStructureGroup": "Structure & starter examples",

  "drag.actions": "Reorder actions",
  "drag.moveUp": "Move up",
  "drag.moveDown": "Move down",
  "drag.moveTo": "Move to…",
  "drag.handle": "Drag {item}",
  "drag.instructions": "To pick up an item, press Space or Enter. Use the arrow keys to move it. Press Space or Enter again to drop, or Escape to cancel.",
  "drag.pickedUp": "Picked up {item}.",
  "drag.over": "{item} is over {target}.",
  "drag.dropped": "Moved {item} to {target}.",
  "drag.cancelled": "Movement cancelled.",
  "drag.emptyCategories": "Drop a category here",
  "drag.emptyTemplates": "Drop a template here",

  "builtin.template.quick": "Quick note",
  "builtin.template.learn": "Learning",
  "builtin.template.market": "Market watch",
  "builtin.prompt.quick": "What happened? Add a result, status, or next step only if useful.",
  "builtin.prompt.meal": "Record what you ate, digestive load, and how you felt afterward.",
  "builtin.prompt.rest": "Record sleep, water, rest, or recovery.",
  "builtin.prompt.learn": "What did you learn, use, produce, or decide to do next?",
  "builtin.prompt.market": "What changed, what is your current view, and when will you check again?"
};

const ZH = {
  ...EN,
  "settings.loading": "正在打开管理页…",
  "common.category": "分类", "common.close": "关闭", "common.date": "日期", "common.done": "完成", "common.edit": "编辑", "common.more": "更多", "common.record": "记录", "common.search": "搜索", "common.tags": "标签", "common.templates": "记录结构", "common.time": "时间", "common.today": "今天", "common.uncategorized": "未分类", "common.yesterday": "昨天",
  "home.addRecord": "新增记录", "home.backToday": "回到今天", "home.categoryView": "分类", "home.exportCurrent": "导出{date} Markdown", "home.loading": "正在打开今天…", "home.nextDay": "后一天", "home.noRecords": "这一天还没有记录", "home.noTimelineRecords": "这一天还没有时间记录", "home.previousDay": "前一天", "home.quickActions": "快捷操作", "home.returnToday": "返回今天", "home.settings": "设置", "home.timeView": "时间", "home.timelineView": "时间视图", "home.categoryViewLabel": "分类视图", "home.domainCategoryCount": "{count}类", "home.categoryItemCount": "{count}项", "home.viewMode": "记录视图", "home.fixedRecordsHint": "每日与定期项目在填写前也会保持可见。", "home.recordFixedNow": "去记录", "home.fixedRecordsInlineHint": "数值直接填写，表单在当前列表展开。", "home.fixedRecordsProgress": "已完成{completed}项，剩余{remaining}项", "home.fixedRecordsRemaining": "剩余{count}项", "home.fillInline": "填写", "home.saveFixed": "保存{name}",
  "composer.addTitle": "新增记录", "composer.bold": "粗体", "composer.body": "正文", "composer.delete": "删除记录", "composer.editTitle": "编辑记录", "composer.placeholder": "记录此刻…", "composer.tagPlaceholder": "工作 灵感", "composer.useTemplate": "选择怎样记录", "composer.fixedValue": "当前值", "composer.fixedValuePlaceholder": "填写当前值", "composer.fixedEmptyDeletes": "清空当前值并点击完成，将直接删除这条固定记录。", "composer.formTemplate": "分项填写", "composer.italic": "斜体", "composer.mixedStyle": "混合", "composer.subtitle": "副标题", "composer.textStyle": "文字样式", "composer.title": "标题", "composer.valueTemplate": "填写一个值", "composer.freeTemplate": "直接写一段", "composer.saveShortcut": "⌘ / Ctrl + Enter 保存",
  "search.label": "搜索记录", "search.placeholder": "搜索内容、标签或分类", "search.recent": "最近记录", "search.results": "找到 {count} 条", "search.empty": "没有匹配的记录",
  "settings.title": "管理", "settings.general": "通用", "settings.data": "数据", "settings.language": "语言", "settings.languageDescription": "选择界面语言，记录正文不会被翻译。", "settings.english": "English", "settings.chinese": "简体中文", "settings.exportTitle": "带走你的记录", "settings.exportDescription": "Markdown 用于阅读与归档，JSON 用于完整迁移和恢复。", "settings.markdownOutputTitle": "Markdown 输出", "settings.markdownOutputDescription": "导出今天或全部记录，并在当前日预览旁调整输出格式。", "settings.markdownExports": "Markdown 导出", "settings.exportAll": "导出全部 Markdown", "settings.exportAllDetail": "按日期汇总所有记录", "settings.exportJson": "导出完整 JSON 备份", "settings.exportJsonDetail": "包含分类、模板和全部记录", "settings.restoreJson": "从 JSON 恢复", "settings.restoreJsonDetail": "将覆盖当前设备上的数据", "settings.markdownTitle": "Markdown 格式", "settings.markdownDescription": "调整单日和全部记录导出时使用的结构。", "settings.markdownLayout": "记录布局", "settings.markdownGrouped": "按分类分组", "settings.markdownTimeline": "扁平时间线", "settings.markdownEntryLine": "记录行", "settings.markdownDateHeading": "全部导出的日期标题", "settings.markdownDaySeparator": "日期之间的分隔符", "settings.markdownPreview": "当前日期预览", "settings.markdownReset": "恢复默认", "settings.markdownEmptyPreview": "这一天没有可预览的记录。", "settings.localFirst": "本地优先", "settings.storageNote": "当前共有 {count} 条记录，数据保存在这个浏览器中。建议定期导出 JSON 备份。", "settings.backupStatusTitle": "备份保护", "settings.backupTitle": "备份与恢复", "settings.backupStatusDetail": "已有 {count} 条记录可导出为完整 JSON 备份。", "settings.backupRisk": "清除浏览器数据，或更换浏览器、设备、域名或端口前，请先导出完整备份。", "settings.restoreSafety": "备份会先经过校验，再替换此浏览器中的记录；无效文件不会改动当前数据。", "settings.structureTitle": "记录结构与起步示例", "settings.structureDescription": "导出不含记录的当前结构，或下载可在外部编辑的通用示例。", "settings.localTitle": "本地使用", "settings.install": "安装 Log Note 到设备", "settings.installTip": "在手机浏览器的分享菜单中选择“添加到主屏幕”，即可像 App 一样打开。",
  "toast.writeSomething": "先写下一点内容", "toast.required": "请填写{field}", "toast.recordUpdated": "记录已更新", "toast.recordAdded": "已记下", "toast.recordDeleted": "记录已删除", "toast.keepCategory": "至少保留一个分类", "toast.exported": "Markdown 已导出", "toast.exportedAll": "全部 Markdown 已导出", "toast.backupExported": "完整备份已导出", "toast.backupRestored": "备份已恢复", "toast.restoreFailed": "备份恢复失败", "toast.markdownReset": "Markdown 格式已恢复默认", "toast.fixedNameRequired": "请填写固定项名称", "toast.fixedValueRequired": "请填写当前值", "toast.emptyRecordDeleted": "空记录已删除", "toast.loadFailed": "本地数据读取失败，已保留原有数据。", "toast.saveFailed": "本地数据保存失败，请在关闭页面前导出备份。",
  "confirm.deleteRecord": "删除这条记录？此操作无法撤销。", "confirm.deleteCategory": "删除“{name}”？相关记录和模板会移到第一个分类。", "confirm.restore": "此备份已验证，包含 {entries} 条记录，将替换此浏览器中的全部数据。是否继续？", "confirm.deleteTemplate": "删除这个模板？已有记录不会受影响。", "confirm.discardDraft": "放弃尚未保存的更改？",
  "templates.recordSetup": "记录结构", "templates.new": "新建", "templates.newCategory": "新建分类", "templates.export": "导出", "templates.exportTitle": "导出记录", "templates.templateLabel": "记录方式", "templates.categoryLabel": "分类", "templates.categorySetup": "分类设置", "templates.categoryName": "分类名称", "templates.recordBehavior": "出现方式", "templates.newTemplateInCategory": "在此分类中新建记录方式", "templates.deleteCategory": "删除分类", "templates.untitledCategory": "未命名分类", "templates.templateCount": "{count} 个记录方式", "templates.itemCount": "{count} 个填写项", "templates.backRecords": "返回记录页", "templates.edit": "编辑记录方式", "templates.autoSaved": "已自动保存", "templates.inputStyle": "怎样填写", "templates.freeTextStyle": "直接写一段", "templates.formStyle": "分项填写", "templates.untitled": "未命名记录方式", "templates.name": "名称", "templates.fields": "填写项", "templates.addField": "添加填写项", "templates.required": "必填", "templates.optionsPlaceholder": "选项之间用逗号分隔", "templates.hintPlaceholder": "填写提示（可选）", "templates.prefill": "起始文字", "templates.defaults": "标签、提示与起始内容", "templates.defaultCategory": "所在分类", "templates.defaultTags": "默认标签", "templates.prompt": "填写时提示", "templates.delete": "删除记录方式", "templates.loading": "正在打开记录结构…", "templates.newField": "新填写项", "templates.contentField": "内容", "templates.contentPlaceholder": "写下内容", "templates.fieldType.text": "简短文字", "templates.fieldType.textarea": "长段文字", "templates.fieldType.number": "数字", "templates.fieldType.select": "从选项选择", "templates.fieldType.rating": "1–5 评分",
  "templates.deleteField": "删除填写项", "templates.duplicate": "复制记录方式", "templates.copyName": "{name} 副本", "templates.preview": "记录时预览", "templates.previewHint": "实际记录时会看到的结构", "templates.previewEmpty": "填写内容", "templates.presetQuickName": "随手记", "templates.presetQuickPrompt": "发生了什么？必要时补充结果或下一步。", "templates.presetQuickDetail": "直接写下一段内容", "templates.presetReflectionName": "观察与下一步", "templates.presetReflectionPrompt": "先记录观察，再写下一步行动。", "templates.presetReflectionDetail": "写下变化，以及接下来准备做什么", "templates.presetObservation": "观察", "templates.presetObservationHint": "发生或变化了什么？", "templates.presetNextStep": "下一步", "templates.presetNextStepHint": "接下来准备做什么？", "templates.presetValueName": "每日数值", "templates.presetValuePrompt": "填写今天的数值和单位。", "templates.presetValueDetail": "每天填写一个数值", "templates.exportRecordsGroup": "可阅读记录", "templates.exportBackupGroup": "可恢复备份", "templates.exportStructureGroup": "结构与起步示例",
  "drag.actions": "排序操作", "drag.moveUp": "上移", "drag.moveDown": "下移", "drag.moveTo": "移动到…", "drag.handle": "拖动{item}",
  "drag.instructions": "按空格键或回车键拾取条目，使用方向键移动，再次按空格键或回车键放下，按 Escape 取消。",
  "drag.pickedUp": "已拾取{item}。", "drag.over": "{item}位于{target}上方。", "drag.dropped": "已将{item}移动到{target}。", "drag.cancelled": "已取消移动。",
  "drag.emptyCategories": "将分类拖到这里", "drag.emptyTemplates": "将模板拖到这里",
  "builtin.template.quick": "随手记", "builtin.template.learn": "学习", "builtin.template.market": "市场观察", "builtin.prompt.quick": "做了什么？必要时补充结果、状态或下一步。", "builtin.prompt.meal": "记录吃了什么、胃肠负担和饭后反馈。", "builtin.prompt.rest": "记录起床、入睡、饮水或恢复情况。", "builtin.prompt.learn": "学了什么？使用了什么材料？有什么输出或后续动作？", "builtin.prompt.market": "观察到什么？当前判断是什么？何时重新检查？"
};

Object.assign(EN, {
  "common.template": "Way to record",
  "common.periodicRecords": "Fixed records",
  "home.exportToday": "Export today's Markdown",
  "settings.exportTodayDetail": "Today's records in the configured Markdown format",
  "settings.exportStructure": "Export structure JSON",
  "settings.exportStructureDetail": "Domains, categories, templates, order, and Markdown settings — no records",
  "settings.exportGeneralTemplate": "Download general JSON template",
  "settings.exportGeneralTemplateDetail": "A developer-facing starter example; it contains no records and is not a restorable backup",
  "settings.markdownDomainHeading": "Domain heading",
  "settings.markdownCategoryHeading": "Category heading",
  "settings.markdownPlaceholders": "Placeholders: {{date}}, {{domain}}, {{category}}, {{time}}, {{content}}, {{tags}}",
  "toast.structureExported": "Structure JSON exported",
  "toast.templateDuplicated": "Template duplicated",
  "toast.keepDomain": "Keep at least one domain",
  "confirm.deleteDomain": "Delete “{name}”? Its categories will move to the first domain.",
  "templates.domainsCategories": "Domains & categories",
  "templates.templatesTab": "Templates",
  "templates.structureTree": "Record structure",
  "templates.structureTreeHint": "Manage domains, categories, and ways to record in one continuous structure.",
  "templates.fixedSetup": "Fixed records",
  "templates.fixedSetupHint": "Adjust order, timing, input, or whether an item appears on the record page.",
  "templates.structureHint": "Organize where records belong. Recording behavior stays in templates.",
  "templates.templateHint": "Define how each record is captured and when periodic records are expected.",
  "templates.newDomain": "New domain",
  "templates.untitledDomain": "Untitled domain",
  "templates.domainLabel": "Domain",
  "templates.domainName": "Domain name",
  "templates.domainDescription": "A domain is the top-level folder used to group related categories.",
  "templates.editDomain": "Edit domain",
  "templates.deleteDomain": "Delete domain",
  "templates.categoryCount": "{count} categories",
  "templates.oneCategory": "1 category",
  "templates.oneTemplate": "1 template",
  "templates.linear": "Timeline record",
  "templates.periodic": "Fixed record",
  "templates.cadence": "Repeats",
  "templates.timepoint": "At a time",
  "templates.daily": "Every day",
  "templates.weekly": "Every week",
  "templates.weekday": "Weekday",
  "templates.valueStyle": "Single value",
  "templates.input.free": "Write freely",
  "templates.input.structured": "Guided fields",
  "templates.input.value": "One value",
  "templates.showOnHome": "Show on record page",
  "templates.visibleHint": "This item stays available below the day's records.",
  "templates.paused": "Paused",
  "templates.pausedHint": "Paused items keep their setup and past records and can be restored at any time.",
  "weekday.sun": "Sunday", "weekday.mon": "Monday", "weekday.tue": "Tuesday", "weekday.wed": "Wednesday",
  "weekday.thu": "Thursday", "weekday.fri": "Friday", "weekday.sat": "Saturday",
  "builtin.domain.daily": "Daily life", "builtin.domain.health": "Health", "builtin.domain.learning": "Learning", "builtin.domain.trading": "Trading",
  "builtin.category.daily": "Notes", "builtin.category.healthFixed": "Body metrics", "builtin.category.healthFood": "Meals",
  "builtin.category.healthRest": "Rest & recovery", "builtin.category.study": "Learning log", "builtin.category.trading": "Market",
  "builtin.template.morningWeight": "Morning weight", "builtin.template.eveningWeight": "Evening weight",
  "builtin.template.waist": "Waist", "builtin.template.healthAbnormal": "Health exceptions", "builtin.template.steps": "Daily steps",
  "builtin.template.meal": "Meal log", "builtin.template.sleep": "Sleep", "builtin.template.rest": "Recovery event"
  ,"builtin.prompt.morningWeight": "Enter your morning weight, for example 66.95kg.",
  "builtin.prompt.eveningWeight": "Enter your weight before sleep.", "builtin.prompt.waist": "Enter your waist measurement, for example 78cm.",
  "builtin.prompt.healthAbnormal": "Enter “None” when there are no exceptions.", "builtin.prompt.steps": "Enter today's step count.",
  "builtin.prompt.sleep": "Record wake time, sleep duration, and quality."
});

Object.assign(ZH, {
  "common.template": "记录方式",
  "common.periodicRecords": "固定记录",
  "templates.exportOptions": "导出选项",
  "home.adjustFixedRecords": "调整",
  "home.fixedRecordsPaused": "当前没有显示固定记录，可在“调整”中恢复。",
  "home.exportToday": "导出今天的 Markdown",
  "settings.exportTodayDetail": "按照当前格式导出今天的记录",
  "settings.exportStructure": "导出结构 JSON",
  "settings.exportStructureDetail": "包含领域、分类、模板、顺序和 Markdown 设置，不包含记录",
  "settings.exportGeneralTemplate": "下载通用 JSON 模板",
  "settings.exportGeneralTemplateDetail": "面向开发者的起步示例；不含记录，也不能作为完整备份恢复",
  "settings.markdownDomainHeading": "领域标题",
  "settings.markdownCategoryHeading": "分类标题",
  "settings.markdownPlaceholders": "可用占位符：{{date}}、{{domain}}、{{category}}、{{time}}、{{content}}、{{tags}}",
  "toast.structureExported": "结构 JSON 已导出",
  "toast.templateDuplicated": "模板已复制",
  "toast.keepDomain": "至少保留一个领域",
  "confirm.deleteDomain": "删除“{name}”？其中分类会移到第一个领域。",
  "templates.domainsCategories": "领域与分类",
  "templates.templatesTab": "模板",
  "templates.structureTree": "记录结构",
  "templates.structureTreeHint": "在同一层级中管理领域、分类和记录方式。",
  "templates.fixedSetup": "固定记录",
  "templates.fixedSetupHint": "调整顺序、周期、填写方式，或是否显示在记录页。",
  "templates.structureHint": "只维护记录归属；记录方式由模板单独决定。",
  "templates.templateHint": "定义如何填写，以及周期记录在什么时候出现。",
  "templates.newDomain": "新建领域",
  "templates.untitledDomain": "未命名领域",
  "templates.domainLabel": "领域",
  "templates.domainName": "领域名称",
  "templates.domainDescription": "领域是最上层文件夹，用来组织相关分类。",
  "templates.editDomain": "编辑领域",
  "templates.deleteDomain": "删除领域",
  "templates.categoryCount": "{count} 个分类",
  "templates.oneCategory": "1 个分类",
  "templates.oneTemplate": "1 个记录方式",
  "templates.templateCount": "{count} 个记录方式",
  "templates.templateLabel": "记录方式",
  "templates.edit": "编辑记录方式",
  "templates.inputStyle": "怎样填写",
  "templates.freeTextStyle": "直接写一段",
  "templates.formStyle": "分项填写",
  "templates.name": "名称",
  "templates.fields": "填写项",
  "templates.itemCount": "{count} 个填写项",
  "templates.addField": "添加填写项",
  "templates.newTemplateInCategory": "在此分类中新建记录方式",
  "templates.defaultCategory": "所在分类",
  "templates.prompt": "填写时提示",
  "templates.delete": "删除记录方式",
  "templates.linear": "普通记录",
  "templates.periodic": "固定记录",
  "templates.cadence": "多久一次",
  "templates.timepoint": "每日时间点",
  "templates.daily": "按天",
  "templates.weekly": "按周",
  "templates.weekday": "星期",
  "templates.valueStyle": "单值输入",
  "templates.input.free": "直接写一段",
  "templates.input.structured": "分项填写",
  "templates.input.value": "填写一个值",
  "templates.showOnHome": "显示在记录页",
  "templates.visibleHint": "它会出现在当天内容下方，随时可以填写。",
  "templates.paused": "已暂停",
  "templates.pausedHint": "暂停只隐藏入口，设置和历史记录都会保留，可随时恢复。",
  "weekday.sun": "星期日", "weekday.mon": "星期一", "weekday.tue": "星期二", "weekday.wed": "星期三",
  "weekday.thu": "星期四", "weekday.fri": "星期五", "weekday.sat": "星期六",
  "builtin.domain.daily": "日常", "builtin.domain.health": "健康", "builtin.domain.learning": "学习", "builtin.domain.trading": "交易",
  "builtin.category.daily": "记录", "builtin.category.healthFixed": "身体指标", "builtin.category.healthFood": "饮食",
  "builtin.category.healthRest": "作息与恢复", "builtin.category.study": "学习记录", "builtin.category.trading": "市场",
  "builtin.template.morningWeight": "晨重", "builtin.template.eveningWeight": "晚重", "builtin.template.waist": "腰围",
  "builtin.template.healthAbnormal": "异常", "builtin.template.steps": "日均步数", "builtin.template.meal": "饮食记录",
  "builtin.template.sleep": "睡眠", "builtin.template.rest": "恢复事件"
  ,"builtin.prompt.morningWeight": "输入晨起体重，例如 66.95kg。", "builtin.prompt.eveningWeight": "输入睡前体重。",
  "builtin.prompt.waist": "输入腰围，例如 78cm。", "builtin.prompt.healthAbnormal": "没有异常时可填写“无”。",
  "builtin.prompt.steps": "输入当天步数。", "builtin.prompt.sleep": "记录起床时间、睡眠时长和质量。"
});

const MESSAGES = { en: EN, "zh-CN": ZH };

export function translate(locale, key, variables = {}) {
  const message = MESSAGES[locale]?.[key] ?? EN[key] ?? key;
  return message.replace(/\{(\w+)\}/g, (_, name) => String(variables[name] ?? `{${name}}`));
}

const CATEGORY_KEYS = {
  daily: "builtin.category.daily",
  "health-fixed": "builtin.category.healthFixed",
  "health-food": "builtin.category.healthFood",
  "health-rest": "builtin.category.healthRest",
  study: "builtin.category.study",
  trading: "builtin.category.trading"
};

const DOMAIN_KEYS = {
  "daily-domain": "builtin.domain.daily",
  "health-domain": "builtin.domain.health",
  "learning-domain": "builtin.domain.learning",
  "trading-domain": "builtin.domain.trading"
};

const TEMPLATE_KEYS = {
  quick: "builtin.template.quick",
  "morning-weight": "builtin.template.morningWeight",
  "evening-weight": "builtin.template.eveningWeight",
  waist: "builtin.template.waist",
  "health-abnormal": "builtin.template.healthAbnormal",
  steps: "builtin.template.steps",
  meal: "builtin.template.meal",
  sleep: "builtin.template.sleep",
  rest: "builtin.template.rest",
  learn: "builtin.template.learn",
  market: "builtin.template.market"
};

const PROMPT_KEYS = {
  quick: "builtin.prompt.quick",
  "morning-weight": "builtin.prompt.morningWeight",
  "evening-weight": "builtin.prompt.eveningWeight",
  waist: "builtin.prompt.waist",
  "health-abnormal": "builtin.prompt.healthAbnormal",
  steps: "builtin.prompt.steps",
  meal: "builtin.prompt.meal",
  sleep: "builtin.prompt.sleep",
  rest: "builtin.prompt.rest",
  learn: "builtin.prompt.learn",
  market: "builtin.prompt.market"
};

const FIELD_TRANSLATIONS = {
  meal: {
    meal: { en: "Meal", "zh-CN": "餐次" },
    food: { en: "Food and drinks", "zh-CN": "吃了什么" },
    load: { en: "Digestive load", "zh-CN": "胃肠负担" },
    feedback: { en: "After-meal feedback", "zh-CN": "饭后反馈" }
  },
  rest: {
    event: { en: "Event", "zh-CN": "事件" },
    detail: { en: "Details", "zh-CN": "记录" },
    energy: { en: "Energy", "zh-CN": "精力" }
  },
  sleep: {
    wake: { en: "Wake time", "zh-CN": "起床时间" },
    duration: { en: "Sleep duration", "zh-CN": "睡眠时长" },
    quality: { en: "Sleep quality", "zh-CN": "睡眠质量" }
  },
  learn: {
    topic: { en: "Topic", "zh-CN": "学习内容" },
    material: { en: "Material", "zh-CN": "材料" },
    gain: { en: "Takeaway", "zh-CN": "收获" },
    next: { en: "Next step", "zh-CN": "下一步" }
  },
  market: {
    observation: { en: "Observation", "zh-CN": "观察" },
    judgement: { en: "View", "zh-CN": "判断" },
    next: { en: "Next check", "zh-CN": "下次检查" }
  }
};

const OPTION_TRANSLATIONS = [
  { en: "In progress", "zh-CN": "进行中" }, { en: "Done", "zh-CN": "已完成" }, { en: "Paused", "zh-CN": "暂停" },
  { en: "Breakfast", "zh-CN": "早餐" }, { en: "Lunch", "zh-CN": "午餐" }, { en: "Dinner", "zh-CN": "晚餐" }, { en: "Snack", "zh-CN": "加餐" },
  { en: "Low", "zh-CN": "低" }, { en: "Medium", "zh-CN": "中" }, { en: "High", "zh-CN": "高" },
  { en: "Wake up", "zh-CN": "起床" }, { en: "Sleep", "zh-CN": "入睡" }, { en: "Nap", "zh-CN": "午休" }, { en: "Water", "zh-CN": "饮水" }, { en: "Bowel movement", "zh-CN": "排便" }, { en: "Recovery", "zh-CN": "恢复" }
];

const PLACEHOLDER_TRANSLATIONS = [
  { en: "What happened?", "zh-CN": "发生了什么？" },
  { en: "What will you do next?", "zh-CN": "接下来准备做什么？" },
  { en: "Food and drinks", "zh-CN": "食物和饮品" },
  { en: "No noticeable discomfort", "zh-CN": "无明显不适" },
  { en: "Duration, amount, or body feedback", "zh-CN": "时长、饮水量或身体反馈" },
  { en: "What did you learn?", "zh-CN": "学了什么？" },
  { en: "Course, book, or article", "zh-CN": "课程、书或文章" },
  { en: "Write down the most important takeaway", "zh-CN": "记下一条最重要的收获" },
  { en: "What changed in the market?", "zh-CN": "市场发生了什么？" },
  { en: "Current view", "zh-CN": "当前判断" },
  { en: "Time or trigger", "zh-CN": "时间或触发条件" }
];

function matchesBuiltin(current, key) {
  return current === EN[key] || current === ZH[key];
}

export function localizeCategoryName(category, locale = DEFAULT_LOCALE) {
  const key = CATEGORY_KEYS[category?.id];
  return key && matchesBuiltin(category.name, key) ? translate(locale, key) : category?.name || translate(locale, "common.uncategorized");
}

export function localizeDomainName(domain, locale = DEFAULT_LOCALE) {
  const key = DOMAIN_KEYS[domain?.id];
  return key && matchesBuiltin(domain.name, key) ? translate(locale, key) : domain?.name || translate(locale, "common.uncategorized");
}

function localizeTemplateName(template, locale = DEFAULT_LOCALE) {
  const key = TEMPLATE_KEYS[template?.id];
  return key && matchesBuiltin(template.name, key) ? translate(locale, key) : template?.name || "";
}

function localizeOption(option, locale) {
  const match = OPTION_TRANSLATIONS.find((item) => item.en === option || item["zh-CN"] === option);
  return match?.[locale] || option;
}

function localizePlaceholder(placeholder, locale) {
  const match = PLACEHOLDER_TRANSLATIONS.find((item) => item.en === placeholder || item["zh-CN"] === placeholder);
  return match?.[locale] || placeholder;
}

export function localizeTemplate(template, locale = DEFAULT_LOCALE) {
  if (!template) return template;
  const promptKey = PROMPT_KEYS[template.id];
  return {
    ...template,
    name: localizeTemplateName(template, locale),
    prompt: promptKey && matchesBuiltin(template.prompt, promptKey) ? translate(locale, promptKey) : template.prompt,
    fields: template.fields.map((field) => {
      const translations = FIELD_TRANSLATIONS[template.id]?.[field.id];
      const knownLabel = translations && (field.label === translations.en || field.label === translations["zh-CN"]);
      return {
        ...field,
        label: knownLabel ? translations[locale] : field.label,
        options: field.options.map((option) => localizeOption(option, locale)),
        placeholder: localizePlaceholder(field.placeholder, locale)
      };
    })
  };
}
