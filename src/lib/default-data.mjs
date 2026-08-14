/**
 * @fileoverview 定义 Log Note v2 的默认领域、分类、模板与克隆构造函数。
 */

function field(id, label, type = "text", options = [], placeholder = "", required = false) {
  return { id, label, type, options, placeholder, required };
}

function template(value) {
  return {
    order: 0,
    recordType: "linear",
    schedule: null,
    inputMode: "free",
    tags: [],
    prompt: "",
    skeleton: "",
    fields: [],
    ...value
  };
}

export const DEFAULT_MARKDOWN_SETTINGS = Object.freeze({
  layout: "grouped",
  domainHeading: "## {{domain}}",
  categoryHeading: "### {{category}}",
  entryLine: "- {{time}}{{content}}{{tags}}",
  allDayHeading: "# {{date}}",
  daySeparator: "---"
});

export const DEFAULT_DOMAINS = Object.freeze([
  { id: "daily-domain", name: "日常", order: 0 },
  { id: "health-domain", name: "健康", order: 1 },
  { id: "learning-domain", name: "学习", order: 2 },
  { id: "trading-domain", name: "交易", order: 3 }
]);

export const DEFAULT_CATEGORIES = Object.freeze([
  { id: "daily", domainId: "daily-domain", name: "记录", order: 0 },
  { id: "health-fixed", domainId: "health-domain", name: "身体指标", order: 0 },
  { id: "health-food", domainId: "health-domain", name: "饮食", order: 1 },
  { id: "health-rest", domainId: "health-domain", name: "作息与恢复", order: 2 },
  { id: "study", domainId: "learning-domain", name: "学习记录", order: 0 },
  { id: "trading", domainId: "trading-domain", name: "市场", order: 0 }
]);

export const DEFAULT_TEMPLATES = Object.freeze([
  template({
    id: "quick", name: "随手记", categoryId: "daily", order: 0,
    prompt: "做了什么？必要时补充结果、状态或下一步。"
  }),
  template({
    id: "morning-weight", name: "晨重", categoryId: "health-fixed", order: 0,
    recordType: "periodic", schedule: { cadence: "timepoint", time: "08:00" }, inputMode: "value",
    prompt: "输入晨起体重，例如 66.95kg。"
  }),
  template({
    id: "evening-weight", name: "晚重", categoryId: "health-fixed", order: 1,
    recordType: "periodic", schedule: { cadence: "timepoint", time: "21:00" }, inputMode: "value",
    prompt: "输入睡前体重。"
  }),
  template({
    id: "waist", name: "腰围", categoryId: "health-fixed", order: 2,
    recordType: "periodic", schedule: { cadence: "weekly", weekday: 1 }, inputMode: "value",
    prompt: "输入腰围，例如 78cm。"
  }),
  template({
    id: "health-abnormal", name: "异常", categoryId: "health-fixed", order: 3,
    recordType: "periodic", schedule: { cadence: "daily" }, inputMode: "value",
    prompt: "没有异常时可填写“无”。"
  }),
  template({
    id: "steps", name: "日均步数", categoryId: "health-fixed", order: 4,
    recordType: "periodic", schedule: { cadence: "daily" }, inputMode: "value",
    prompt: "输入当天步数。"
  }),
  template({
    id: "meal", name: "饮食记录", categoryId: "health-food", order: 0,
    inputMode: "structured", tags: ["饮食"], prompt: "记录吃了什么、胃肠负担和饭后反馈。",
    fields: [
      field("meal", "餐次", "select", ["早餐", "午餐", "晚餐", "加餐"], "", true),
      field("food", "吃了什么", "text", [], "食物和饮品", true),
      field("load", "胃肠负担", "select", ["低", "中", "高"]),
      field("feedback", "饭后反馈", "text", [], "无明显不适")
    ]
  }),
  template({
    id: "sleep", name: "睡眠", categoryId: "health-rest", order: 0,
    recordType: "periodic", schedule: { cadence: "daily" }, inputMode: "structured", tags: ["作息"],
    prompt: "记录起床时间、睡眠时长和质量。",
    fields: [
      field("wake", "起床时间", "text", [], "08:00"),
      field("duration", "睡眠时长", "text", [], "8h", true),
      field("quality", "睡眠质量", "rating")
    ]
  }),
  template({
    id: "rest", name: "恢复事件", categoryId: "health-rest", order: 1,
    inputMode: "structured", tags: ["作息"], prompt: "记录饮水、用药、午休或其他恢复事件。",
    fields: [
      field("event", "事件", "select", ["饮水", "用药", "午休", "排便", "恢复"]),
      field("detail", "记录", "text", [], "时长、饮水量或身体反馈", true),
      field("energy", "精力", "rating")
    ]
  }),
  template({
    id: "learn", name: "学习", categoryId: "study", order: 0,
    inputMode: "structured", tags: ["学习"], prompt: "学了什么？使用了什么材料？有什么输出或后续动作？",
    fields: [
      field("topic", "学习内容", "text", [], "学了什么？", true),
      field("material", "材料", "text", [], "课程、书或文章"),
      field("gain", "收获", "textarea", [], "记下一条最重要的收获"),
      field("next", "下一步", "text")
    ]
  }),
  template({
    id: "market", name: "市场观察", categoryId: "trading", order: 0,
    inputMode: "structured", tags: ["交易"], prompt: "观察到什么？当前判断是什么？何时重新检查？",
    fields: [
      field("observation", "观察", "textarea", [], "市场发生了什么？", true),
      field("judgement", "判断", "text", [], "当前判断"),
      field("next", "下次检查", "text", [], "时间或触发条件")
    ]
  })
]);

export function cloneTemplate(item) {
  return {
    ...item,
    schedule: item.schedule ? { ...item.schedule } : null,
    tags: [...item.tags],
    fields: item.fields.map((templateField) => ({
      ...templateField,
      options: [...templateField.options]
    }))
  };
}
