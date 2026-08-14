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
  "home.viewMode": "Record view",

  "composer.addTitle": "New record",
  "composer.delete": "Delete record",
  "composer.editTitle": "Edit record",
  "composer.placeholder": "Capture this moment…",
  "composer.tagPlaceholder": "work idea",
  "composer.useTemplate": "Use template",
  "composer.fixedValue": "Value",
  "composer.fixedValuePlaceholder": "Enter the current value",
  "composer.fixedEmptyDeletes": "Leaving the value empty and tapping Done deletes this fixed record.",

  "search.label": "Search records",
  "search.placeholder": "Search content, tags, or categories",
  "search.recent": "Recent records",
  "search.results": "{count} results",
  "search.empty": "No matching records",

  "settings.title": "Settings",
  "settings.general": "General",
  "settings.data": "Data",
  "settings.language": "Language",
  "settings.languageDescription": "Choose the interface language. Your record content is never translated.",
  "settings.english": "English",
  "settings.chinese": "简体中文",
  "settings.exportTitle": "Take your records with you",
  "settings.exportDescription": "Markdown is for reading and archiving. JSON keeps a complete restorable backup.",
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
  "toast.loadFailed": "Could not read local data. Default settings were loaded.",

  "confirm.deleteRecord": "Delete this record? This cannot be undone.",
  "confirm.deleteCategory": "Delete “{name}”? Its records and templates will move to the first category.",
  "confirm.restore": "Restoring a backup replaces all data on this device. Continue?",
  "confirm.deleteTemplate": "Delete this template? Existing records will not be changed.",

  "templates.recordSetup": "Record setup",
  "templates.new": "New",
  "templates.newCategory": "New category",
  "templates.export": "Export",
  "templates.exportTitle": "Export records",
  "templates.templateLabel": "Template",
  "templates.categoryLabel": "Category",
  "templates.categorySetup": "Category setup",
  "templates.categoryName": "Category name",
  "templates.recordBehavior": "Record behavior",
  "templates.newTemplateInCategory": "New template in this category",
  "templates.deleteCategory": "Delete category",
  "templates.untitledCategory": "Untitled category",
  "templates.templateCount": "{count} templates",
  "templates.itemCount": "{count} fields",
  "templates.backRecords": "Back to records",
  "templates.edit": "Edit template",
  "templates.autoSaved": "Saved automatically",
  "templates.inputStyle": "Input style",
  "templates.freeTextStyle": "Free text",
  "templates.formStyle": "Form fields",
  "templates.untitled": "Untitled template",
  "templates.name": "Template name",
  "templates.fields": "Record fields",
  "templates.addField": "Add field",
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
  "common.category": "分类", "common.close": "关闭", "common.date": "日期", "common.done": "完成", "common.edit": "编辑", "common.more": "更多", "common.record": "记录", "common.search": "搜索", "common.tags": "标签", "common.templates": "记录结构", "common.time": "时间", "common.today": "今天", "common.uncategorized": "未分类", "common.yesterday": "昨天",
  "home.addRecord": "新增记录", "home.backToday": "回到今天", "home.categoryView": "分类", "home.exportCurrent": "导出{date} Markdown", "home.loading": "正在打开今天…", "home.nextDay": "后一天", "home.noRecords": "这一天还没有记录", "home.noTimelineRecords": "这一天还没有时间记录", "home.previousDay": "前一天", "home.quickActions": "快捷操作", "home.returnToday": "返回今天", "home.settings": "设置", "home.timeView": "时间", "home.timelineView": "时间视图", "home.categoryViewLabel": "分类视图", "home.viewMode": "记录视图",
  "composer.addTitle": "新增记录", "composer.delete": "删除记录", "composer.editTitle": "编辑记录", "composer.placeholder": "记录此刻…", "composer.tagPlaceholder": "工作 灵感", "composer.useTemplate": "使用模板", "composer.fixedValue": "当前值", "composer.fixedValuePlaceholder": "填写当前值", "composer.fixedEmptyDeletes": "清空当前值并点击完成，将直接删除这条固定记录。",
  "search.label": "搜索记录", "search.placeholder": "搜索内容、标签或分类", "search.recent": "最近记录", "search.results": "找到 {count} 条", "search.empty": "没有匹配的记录",
  "settings.title": "管理", "settings.general": "通用", "settings.data": "数据", "settings.language": "语言", "settings.languageDescription": "选择界面语言，记录正文不会被翻译。", "settings.english": "English", "settings.chinese": "简体中文", "settings.exportTitle": "带走你的记录", "settings.exportDescription": "Markdown 用于阅读与归档，JSON 用于完整迁移和恢复。", "settings.exportAll": "导出全部 Markdown", "settings.exportAllDetail": "按日期汇总所有记录", "settings.exportJson": "导出完整 JSON 备份", "settings.exportJsonDetail": "包含分类、模板和全部记录", "settings.restoreJson": "从 JSON 恢复", "settings.restoreJsonDetail": "将覆盖当前设备上的数据", "settings.markdownTitle": "Markdown 格式", "settings.markdownDescription": "调整单日和全部记录导出时使用的结构。", "settings.markdownLayout": "记录布局", "settings.markdownGrouped": "按分类分组", "settings.markdownTimeline": "扁平时间线", "settings.markdownEntryLine": "记录行", "settings.markdownDateHeading": "全部导出的日期标题", "settings.markdownDaySeparator": "日期之间的分隔符", "settings.markdownPreview": "当前日期预览", "settings.markdownReset": "恢复默认", "settings.markdownEmptyPreview": "这一天没有可预览的记录。", "settings.localFirst": "本地优先", "settings.storageNote": "当前共有 {count} 条记录，数据保存在这个浏览器中。建议定期导出 JSON 备份。", "settings.install": "安装 Log Note 到设备", "settings.installTip": "在手机浏览器的分享菜单中选择“添加到主屏幕”，即可像 App 一样打开。",
  "toast.writeSomething": "先写下一点内容", "toast.required": "请填写{field}", "toast.recordUpdated": "记录已更新", "toast.recordAdded": "已记下", "toast.recordDeleted": "记录已删除", "toast.keepCategory": "至少保留一个分类", "toast.exported": "Markdown 已导出", "toast.exportedAll": "全部 Markdown 已导出", "toast.backupExported": "完整备份已导出", "toast.backupRestored": "备份已恢复", "toast.restoreFailed": "备份恢复失败", "toast.markdownReset": "Markdown 格式已恢复默认", "toast.fixedNameRequired": "请填写固定项名称", "toast.fixedValueRequired": "请填写当前值", "toast.emptyRecordDeleted": "空记录已删除", "toast.loadFailed": "本地数据读取失败，已使用初始设置",
  "confirm.deleteRecord": "删除这条记录？此操作无法撤销。", "confirm.deleteCategory": "删除“{name}”？相关记录和模板会移到第一个分类。", "confirm.restore": "恢复备份会覆盖当前设备上的全部数据。是否继续？", "confirm.deleteTemplate": "删除这个模板？已有记录不会受影响。",
  "templates.recordSetup": "记录结构", "templates.new": "新建", "templates.newCategory": "新建分类", "templates.export": "导出", "templates.exportTitle": "导出记录", "templates.templateLabel": "模板", "templates.categoryLabel": "分类", "templates.categorySetup": "分类设置", "templates.categoryName": "分类名称", "templates.recordBehavior": "记录行为", "templates.newTemplateInCategory": "在此分类中新建模板", "templates.deleteCategory": "删除分类", "templates.untitledCategory": "未命名分类", "templates.templateCount": "{count} 个模板", "templates.itemCount": "{count} 个字段", "templates.backRecords": "返回记录页", "templates.edit": "编辑模板", "templates.autoSaved": "已自动保存", "templates.inputStyle": "输入方式", "templates.freeTextStyle": "自由文本", "templates.formStyle": "表单字段", "templates.untitled": "未命名模板", "templates.name": "模板名称", "templates.fields": "记录字段", "templates.addField": "添加字段", "templates.required": "必填", "templates.optionsPlaceholder": "选项之间用逗号分隔", "templates.hintPlaceholder": "输入提示（可选）", "templates.prefill": "预填文字", "templates.defaults": "默认分类、标签与提示", "templates.defaultCategory": "默认分类", "templates.defaultTags": "默认标签", "templates.prompt": "输入提示", "templates.delete": "删除模板", "templates.loading": "正在打开模板…", "templates.newField": "新字段", "templates.contentField": "内容", "templates.contentPlaceholder": "记录内容", "templates.fieldType.text": "单行文字", "templates.fieldType.textarea": "多行文字", "templates.fieldType.number": "数字", "templates.fieldType.select": "选项", "templates.fieldType.rating": "1–5 评分",
  "builtin.template.quick": "随手记", "builtin.template.learn": "学习", "builtin.template.market": "市场观察", "builtin.prompt.quick": "做了什么？必要时补充结果、状态或下一步。", "builtin.prompt.meal": "记录吃了什么、胃肠负担和饭后反馈。", "builtin.prompt.rest": "记录起床、入睡、饮水或恢复情况。", "builtin.prompt.learn": "学了什么？使用了什么材料？有什么输出或后续动作？", "builtin.prompt.market": "观察到什么？当前判断是什么？何时重新检查？"
};

Object.assign(EN, {
  "common.template": "Template",
  "common.periodicRecords": "Periodic records",
  "home.exportToday": "Export today's Markdown",
  "settings.exportTodayDetail": "Today's records in the configured Markdown format",
  "settings.exportStructure": "Export structure JSON",
  "settings.exportStructureDetail": "Domains, categories, templates, order, and Markdown settings — no records",
  "settings.exportGeneralTemplate": "Download general JSON template",
  "settings.exportGeneralTemplateDetail": "A reusable example structure for editing or sharing",
  "settings.markdownDomainHeading": "Domain heading",
  "settings.markdownCategoryHeading": "Category heading",
  "settings.markdownPlaceholders": "Placeholders: {{date}}, {{domain}}, {{category}}, {{time}}, {{content}}, {{tags}}",
  "toast.structureExported": "Structure JSON exported",
  "toast.keepDomain": "Keep at least one domain",
  "confirm.deleteDomain": "Delete “{name}”? Its categories will move to the first domain.",
  "templates.domainsCategories": "Domains & categories",
  "templates.templatesTab": "Templates",
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
  "templates.linear": "Linear",
  "templates.periodic": "Periodic",
  "templates.cadence": "Cadence",
  "templates.timepoint": "Timepoint",
  "templates.daily": "Daily",
  "templates.weekly": "Weekly",
  "templates.weekday": "Weekday",
  "templates.valueStyle": "Single value",
  "templates.input.free": "Free text",
  "templates.input.structured": "Form",
  "templates.input.value": "Value",
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
  "common.template": "模板",
  "common.periodicRecords": "周期记录",
  "home.exportToday": "导出今天的 Markdown",
  "settings.exportTodayDetail": "按照当前格式导出今天的记录",
  "settings.exportStructure": "导出结构 JSON",
  "settings.exportStructureDetail": "包含领域、分类、模板、顺序和 Markdown 设置，不包含记录",
  "settings.exportGeneralTemplate": "下载通用 JSON 模板",
  "settings.exportGeneralTemplateDetail": "可直接编辑或交给我继续微调的通用结构示例",
  "settings.markdownDomainHeading": "领域标题",
  "settings.markdownCategoryHeading": "分类标题",
  "settings.markdownPlaceholders": "可用占位符：{{date}}、{{domain}}、{{category}}、{{time}}、{{content}}、{{tags}}",
  "toast.structureExported": "结构 JSON 已导出",
  "toast.keepDomain": "至少保留一个领域",
  "confirm.deleteDomain": "删除“{name}”？其中分类会移到第一个领域。",
  "templates.domainsCategories": "领域与分类",
  "templates.templatesTab": "模板",
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
  "templates.oneTemplate": "1 个模板",
  "templates.linear": "线性记录",
  "templates.periodic": "周期记录",
  "templates.cadence": "记录周期",
  "templates.timepoint": "每日时间点",
  "templates.daily": "按天",
  "templates.weekly": "按周",
  "templates.weekday": "星期",
  "templates.valueStyle": "单值输入",
  "templates.input.free": "自由文本",
  "templates.input.structured": "表单",
  "templates.input.value": "单值",
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

export function localizeTemplateName(template, locale = DEFAULT_LOCALE) {
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
