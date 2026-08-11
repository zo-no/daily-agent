"use client";

/**
 * @fileoverview 编排本地记录首页、编辑器与管理弹窗的用户操作。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  STORAGE_KEY,
  backupPayload,
  createInitialState,
  localDate,
  localTime,
  makeId,
  markdownForAll,
  markdownForDate,
  normalizeState,
  sanitizeTags,
  shiftDate
} from "@/lib/data.mjs";

const EMPTY_DRAFT = {
  id: null,
  date: "",
  time: "",
  content: "",
  categoryId: "",
  tags: []
};

function Icon({ name, size = 20 }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
    chevronLeft: <path d="m15 18-6-6 6-6"/>,
    chevronRight: <path d="m9 18 6-6-6-6"/>,
    close: <><path d="m6 6 12 12"/><path d="m18 6-12 12"/></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></>,
    tag: <path d="M20 13 13 20l-9-9V4h7l9 9Z"/>,
    download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></>,
    upload: <><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 21h14"/></>,
    trash: <><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="m7 7 1 14h8l1-14"/></>,
    plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    book: <><path d="M4 5a3 3 0 0 1 3-3h13v17H7a3 3 0 0 0-3 3V5Z"/><path d="M4 19a3 3 0 0 1 3-3h13"/></>,
    inbox: <><path d="M4 4h16v13H4z"/><path d="M4 13h5l2 3h2l2-3h5"/></>
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function prettyDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(new Date(year, month - 1, day));
}

function compactDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const today = localDate();
  if (dateString === today) return "今天";
  if (dateString === shiftDate(today, -1)) return "昨天";
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(date);
}

function Surface({ children, onClose, className = "", label }) {
  return (
    <div className="overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`surface ${className}`} role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </section>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState(createInitialState);
  const [hydrated, setHydrated] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => localDate());
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerDetailsOpen, setComposerDetailsOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState("quick");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState(null);
  const [toast, setToast] = useState("");
  const [installPrompt, setInstallPrompt] = useState(null);
  const [newCategory, setNewCategory] = useState("");
  const [templateDraft, setTemplateDraft] = useState(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setData(normalizeState(JSON.parse(saved)));
    } catch (error) {
      console.error(error);
      setToast("本地数据读取失败，已使用初始设置");
    } finally {
      setHydrated(true);
    }

    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(console.error);
    const handleInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", handleInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleInstall);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handler = (event) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      } else if (!typing && event.key.toLowerCase() === "n") {
        event.preventDefault();
        openNewEntry();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [data.categories, data.templates, selectedDate]);

  const categoryMap = useMemo(() => new Map(data.categories.map((item) => [item.id, item])), [data.categories]);
  const dateEntries = useMemo(
    () => data.entries
      .filter((entry) => entry.date === selectedDate)
      .sort((a, b) => b.time.localeCompare(a.time) || b.createdAt - a.createdAt),
    [data.entries, selectedDate]
  );
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const entries = query
      ? data.entries.filter((entry) => {
        const category = categoryMap.get(entry.categoryId)?.name || "";
        return [entry.content, entry.tags.join(" "), category, entry.date, entry.time].join(" ").toLowerCase().includes(query);
      })
      : data.entries;
    return entries
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
      .slice(0, query ? 80 : 40);
  }, [data.entries, searchQuery, categoryMap]);

  const currentTemplate = data.templates.find((item) => item.id === activeTemplate) || data.templates[0];

  function openNewEntry(templateId = "quick") {
    const template = data.templates.find((item) => item.id === templateId) || data.templates[0];
    setActiveTemplate(template?.id || "");
    setDraft({
      id: null,
      date: selectedDate,
      time: localTime(),
      content: template?.skeleton || "",
      categoryId: template?.categoryId || data.categories[0]?.id || "",
      tags: template?.tags || []
    });
    setComposerDetailsOpen(false);
    setComposerOpen(true);
    setTimeout(() => textareaRef.current?.focus(), 120);
  }

  function openEntry(entry) {
    setActiveTemplate("");
    setDraft({ ...entry, tags: [...entry.tags] });
    setComposerDetailsOpen(false);
    setComposerOpen(true);
    setSearchOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 120);
  }

  function chooseTemplate(template) {
    const previous = currentTemplate;
    const canReplace = !draft.content.trim() || draft.content === previous?.skeleton;
    setActiveTemplate(template.id);
    setDraft((value) => ({
      ...value,
      content: canReplace ? template.skeleton : value.content,
      categoryId: template.categoryId,
      tags: [...template.tags]
    }));
    setTimeout(() => textareaRef.current?.focus(), 80);
  }

  function saveEntry(event) {
    event.preventDefault();
    const content = draft.content.trim();
    if (!content) {
      setToast("先写下一点内容");
      textareaRef.current?.focus();
      return;
    }
    const now = Date.now();
    const entry = {
      ...draft,
      id: draft.id || makeId("entry"),
      content,
      tags: sanitizeTags(draft.tags),
      createdAt: draft.createdAt || now,
      updatedAt: now
    };
    setData((state) => ({
      ...state,
      entries: draft.id ? state.entries.map((item) => item.id === draft.id ? entry : item) : [...state.entries, entry]
    }));
    setSelectedDate(entry.date);
    setComposerOpen(false);
    setToast(draft.id ? "记录已更新" : "已记下");
  }

  function deleteEntry() {
    if (!draft.id || !window.confirm("删除这条记录？此操作无法撤销。")) return;
    setData((state) => ({ ...state, entries: state.entries.filter((item) => item.id !== draft.id) }));
    setComposerOpen(false);
    setToast("记录已删除");
  }

  function addCategory(event) {
    event.preventDefault();
    const name = newCategory.trim();
    if (!name) return;
    setData((state) => ({ ...state, categories: [...state.categories, { id: makeId("category"), name }] }));
    setNewCategory("");
    setToast("分类已添加");
  }

  function renameCategory(id, name) {
    setData((state) => ({
      ...state,
      categories: state.categories.map((item) => item.id === id ? { ...item, name } : item)
    }));
  }

  function deleteCategory(id) {
    if (data.categories.length < 2) return setToast("至少保留一个分类");
    if (!window.confirm(`删除“${categoryMap.get(id)?.name}”？相关记录和模板会移到第一个分类。`)) return;
    const fallback = data.categories.find((item) => item.id !== id).id;
    setData((state) => ({
      ...state,
      categories: state.categories.filter((item) => item.id !== id),
      entries: state.entries.map((item) => item.categoryId === id ? { ...item, categoryId: fallback } : item),
      templates: state.templates.map((item) => item.categoryId === id ? { ...item, categoryId: fallback } : item)
    }));
    setToast("分类已删除");
  }

  function startTemplate(template = null) {
    setTemplateDraft(template ? { ...template, tags: [...template.tags] } : {
      id: null,
      name: "",
      categoryId: data.categories[0]?.id || "",
      tags: [],
      prompt: "",
      skeleton: ""
    });
  }

  function saveTemplate(event) {
    event.preventDefault();
    if (!templateDraft.name.trim()) return setToast("请填写模板名称");
    const template = {
      ...templateDraft,
      id: templateDraft.id || makeId("template"),
      name: templateDraft.name.trim(),
      tags: sanitizeTags(templateDraft.tags)
    };
    setData((state) => ({
      ...state,
      templates: templateDraft.id
        ? state.templates.map((item) => item.id === templateDraft.id ? template : item)
        : [...state.templates, template]
    }));
    setTemplateDraft(null);
    setToast("模板已保存");
  }

  function deleteTemplate(id) {
    if (!window.confirm("删除这个模板？已有记录不会受影响。")) return;
    setData((state) => ({ ...state, templates: state.templates.filter((item) => item.id !== id) }));
    setTemplateDraft(null);
    setToast("模板已删除");
  }

  function exportToday() {
    downloadFile(`${selectedDate.replaceAll("-", "_")}.md`, markdownForDate(data, selectedDate), "text/markdown;charset=utf-8");
    setToast("Markdown 已导出");
  }

  function exportAll() {
    downloadFile("log-note-all.md", markdownForAll(data), "text/markdown;charset=utf-8");
    setToast("全部 Markdown 已导出");
  }

  function exportJson() {
    downloadFile(`log-note-backup-${localDate()}.json`, backupPayload(data), "application/json;charset=utf-8");
    setToast("完整备份已导出");
  }

  async function restoreJson(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!window.confirm("恢复备份会覆盖当前设备上的全部数据。是否继续？")) return;
    try {
      setData(normalizeState(JSON.parse(await file.text())));
      setSelectedDate(localDate());
      setToast("备份已恢复");
    } catch (error) {
      setToast(error.message || "备份恢复失败");
    }
  }

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  if (!hydrated) {
    return <main className="loading-screen"><span className="brand-mark">L</span><p>正在打开今天…</p></main>;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => setSelectedDate(localDate())} aria-label="返回今天">
          <span className="brand-mark">L</span>
          <span>Log Note</span>
        </button>
        <div className="top-actions">
          <button className="icon-button search-wide" type="button" onClick={() => setSearchOpen(true)}>
            <Icon name="search" />
            <span>搜索</span>
            <kbd>⌘ K</kbd>
          </button>
          <button className="icon-button mobile-search" type="button" onClick={() => setSearchOpen(true)} aria-label="搜索"><Icon name="search" /></button>
          <button className="icon-button" type="button" onClick={() => { setTemplateDraft(null); setTemplateManagerOpen(true); }} aria-label="模板"><Icon name="book" /></button>
          <button className="icon-button" type="button" onClick={() => setSettingsTab("categories")} aria-label="设置"><Icon name="settings" /></button>
        </div>
      </header>

      <section className="day-header">
        <div className="date-navigation">
          <button className="icon-button subtle" type="button" onClick={() => setSelectedDate(shiftDate(selectedDate, -1))} aria-label="前一天"><Icon name="chevronLeft" /></button>
          <label className="date-picker">
            <span>{selectedDate === localDate() ? "今天" : selectedDate}</span>
            <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          </label>
          <button className="icon-button subtle" type="button" onClick={() => setSelectedDate(shiftDate(selectedDate, 1))} aria-label="后一天"><Icon name="chevronRight" /></button>
        </div>
        <div className="day-title-row">
          <h1>{prettyDate(selectedDate)}</h1>
          {selectedDate !== localDate() && <button className="text-button" type="button" onClick={() => setSelectedDate(localDate())}>回到今天</button>}
        </div>
      </section>

      <section className="timeline" aria-live="polite">
        {dateEntries.map((entry, index) => (
          <button className="entry" type="button" key={entry.id} onClick={() => openEntry(entry)}>
            <time>{entry.time}</time>
            <span className="timeline-rail" aria-hidden="true"><i />{index < dateEntries.length - 1 && <b />}</span>
            <span className="entry-body">
              <span className="entry-meta">{categoryMap.get(entry.categoryId)?.name || "未分类"}</span>
              <span className="entry-content">{entry.content}</span>
              {!!entry.tags.length && <span className="entry-tags">{entry.tags.map((tag) => <span key={tag}>#{tag}</span>)}</span>}
            </span>
            <span className="entry-more"><Icon name="more" /></span>
          </button>
        ))}
      </section>

      <button className="fab" type="button" onClick={() => openNewEntry()} aria-label="新增记录">
        <Icon name="plus" size={30} />
      </button>

      {composerOpen && (
        <Surface onClose={() => setComposerOpen(false)} className="composer" label={draft.id ? "编辑记录" : "新增记录"}>
          <form onSubmit={saveEntry}>
            <div className="surface-header">
              <button className="icon-button" type="button" onClick={() => setComposerOpen(false)} aria-label="关闭"><Icon name="close" /></button>
              <strong className="composer-title">{draft.id ? "编辑" : "记录"}</strong>
              <button className="save-button" type="submit">完成</button>
            </div>

            <div className="writing-area">
              <textarea
                ref={textareaRef}
                value={draft.content}
                onChange={(event) => setDraft({ ...draft, content: event.target.value })}
                placeholder={currentTemplate?.prompt || "记录此刻…"}
                rows={7}
              />
            </div>

            <div className="composer-toolbar">
              {!draft.id && !!data.templates.length ? (
                <label className="template-select">
                  <Icon name="book" size={18} />
                  <select aria-label="使用模板" value={activeTemplate} onChange={(event) => chooseTemplate(data.templates.find((item) => item.id === event.target.value) || data.templates[0])}>
                    {data.templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                  </select>
                  <Icon name="chevronRight" size={16} />
                </label>
              ) : <span className="entry-category-label">{categoryMap.get(draft.categoryId)?.name}</span>}
              <button className={`details-toggle ${composerDetailsOpen ? "active" : ""}`} type="button" onClick={() => setComposerDetailsOpen((value) => !value)}>
                <Icon name="more" />更多
              </button>
            </div>

            {composerDetailsOpen && (
              <div className="composer-details">
                <div className="time-fields">
                  <label><span>日期</span><input aria-label="日期" type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label>
                  <label><span>时间</span><input aria-label="时间" type="time" value={draft.time} onChange={(event) => setDraft({ ...draft, time: event.target.value })} /></label>
                </div>
                <label><span>分类</span><select value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}>{data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                <label><span>标签</span><input value={draft.tags.join(" ")} onChange={(event) => setDraft({ ...draft, tags: event.target.value.split(/[，,\s]+/) })} placeholder="工作 灵感" /></label>
                {draft.id && <button className="danger-button" type="button" onClick={deleteEntry}><Icon name="trash" />删除记录</button>}
              </div>
            )}
          </form>
        </Surface>
      )}

      {searchOpen && (
        <Surface onClose={() => setSearchOpen(false)} className="search-surface" label="搜索记录">
          <div className="search-field">
            <Icon name="search" />
            <input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="搜索内容、标签或分类" />
            <button className="icon-button" onClick={() => setSearchOpen(false)} aria-label="关闭"><Icon name="close" /></button>
          </div>
          <div className="search-results">
            <p className="result-count">{searchQuery ? `找到 ${searchResults.length} 条` : "最近记录"}</p>
            {searchResults.length ? searchResults.map((entry) => (
              <button type="button" className="search-result" key={entry.id} onClick={() => { setSelectedDate(entry.date); openEntry(entry); }}>
                <span className="result-date">{compactDate(entry.date)}<small>{entry.time}</small></span>
                <span><b>{entry.content}</b><small>{categoryMap.get(entry.categoryId)?.name}{entry.tags.length ? ` · ${entry.tags.map((tag) => `#${tag}`).join(" ")}` : ""}</small></span>
              </button>
            )) : <div className="mini-empty"><Icon name="inbox" /><p>没有匹配的记录</p></div>}
          </div>
        </Surface>
      )}

      {templateManagerOpen && (
        <Surface onClose={() => setTemplateManagerOpen(false)} className="template-manager" label="模板管理">
          {!templateDraft ? (
            <>
              <div className="surface-header template-manager-header">
                <div><p className="eyebrow">快速记录</p><h2>模板</h2></div>
                <div className="header-actions">
                  <button className="text-action" type="button" onClick={() => startTemplate()}><Icon name="plus" size={18} />新建</button>
                  <button className="icon-button" type="button" onClick={() => setTemplateManagerOpen(false)} aria-label="关闭"><Icon name="close" /></button>
                </div>
              </div>
              <div className="template-manager-body">
                <div className="template-list standalone-list">
                  {data.templates.map((template) => (
                    <button type="button" className="template-row" key={template.id} onClick={() => startTemplate(template)}>
                      <span className="template-initial">{template.name.slice(0, 1)}</span>
                      <span>
                        <b>{template.name}</b>
                        <small>{template.skeleton || template.prompt || "空白模板"}</small>
                      </span>
                      <Icon name="chevronRight" />
                    </button>
                  ))}
                  {!data.templates.length && <button className="blank-template" type="button" onClick={() => startTemplate()}><Icon name="plus" />创建第一个模板</button>}
                </div>
              </div>
            </>
          ) : (
            <form className="template-form" onSubmit={saveTemplate}>
              <div className="surface-header template-form-header">
                <button className="icon-button" type="button" onClick={() => setTemplateDraft(null)} aria-label="返回"><Icon name="chevronLeft" /></button>
                <strong>{templateDraft.id ? "编辑模板" : "新建模板"}</strong>
                <button className="save-button" type="submit">保存</button>
              </div>
              <div className="template-form-body">
                <label className="template-name-field"><span>名称</span><input autoFocus value={templateDraft.name} onChange={(event) => setTemplateDraft({ ...templateDraft, name: event.target.value })} placeholder="例如：饮食" /></label>
                <label><span>记录格式</span><textarea rows={6} value={templateDraft.skeleton} onChange={(event) => setTemplateDraft({ ...templateDraft, skeleton: event.target.value })} placeholder="午餐：；感受：" /></label>
                <details className="template-options">
                  <summary>分类与标签</summary>
                  <div>
                    <label><span>默认分类</span><select value={templateDraft.categoryId} onChange={(event) => setTemplateDraft({ ...templateDraft, categoryId: event.target.value })}>{data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                    <label><span>默认标签</span><input value={templateDraft.tags.join(" ")} onChange={(event) => setTemplateDraft({ ...templateDraft, tags: event.target.value.split(/[，,\s]+/) })} placeholder="饮食 健康" /></label>
                    <label><span>空白提示</span><input value={templateDraft.prompt} onChange={(event) => setTemplateDraft({ ...templateDraft, prompt: event.target.value })} placeholder="刚刚吃了什么？" /></label>
                  </div>
                </details>
                {templateDraft.id && <button className="danger-button template-delete" type="button" onClick={() => deleteTemplate(templateDraft.id)}><Icon name="trash" />删除模板</button>}
              </div>
            </form>
          )}
        </Surface>
      )}

      {settingsTab && (
        <Surface onClose={() => setSettingsTab(null)} className="settings-surface" label="管理 Log Note">
          <div className="surface-header settings-header">
            <div><p className="eyebrow">Log Note</p><h2>管理</h2></div>
            <button className="icon-button" type="button" onClick={() => setSettingsTab(null)} aria-label="关闭"><Icon name="close" /></button>
          </div>
          <div className="settings-layout">
            <nav className="settings-nav">
              <button className={settingsTab === "categories" ? "active" : ""} onClick={() => setSettingsTab("categories")}>分类</button>
              <button className={settingsTab === "data" ? "active" : ""} onClick={() => setSettingsTab("data")}>数据</button>
            </nav>

            <div className="settings-content">
              {settingsTab === "categories" && (
                <section>
                  <div className="section-heading"><div><h3>记录分类</h3><p>使用“父级 · 子级”可以在 Markdown 中生成多级标题。</p></div></div>
                  <form className="add-row" onSubmit={addCategory}>
                    <input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="例如：健康 · 运动" />
                    <button className="secondary-button" type="submit"><Icon name="plus" />添加</button>
                  </form>
                  <div className="manage-list">
                    {data.categories.map((category) => (
                      <div className="manage-row" key={category.id}>
                        <span className="drag-dot" aria-hidden="true">••</span>
                        <input value={category.name} onChange={(event) => renameCategory(category.id, event.target.value)} onBlur={(event) => !event.target.value.trim() && renameCategory(category.id, "未命名分类")} />
                        <button className="icon-button danger-icon" type="button" onClick={() => deleteCategory(category.id)} aria-label={`删除${category.name}`}><Icon name="trash" /></button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {settingsTab === "data" && (
                <section>
                  <div className="section-heading"><div><h3>带走你的记录</h3><p>Markdown 用于阅读与归档，JSON 用于完整迁移和恢复。</p></div></div>
                  <div className="data-actions">
                    <button type="button" onClick={exportToday}><span className="action-icon"><Icon name="download" /></span><span><b>导出 {compactDate(selectedDate)} Markdown</b><small>{selectedDate.replaceAll("-", "_")}.md</small></span><Icon name="chevronRight" /></button>
                    <button type="button" onClick={exportAll}><span className="action-icon"><Icon name="book" /></span><span><b>导出全部 Markdown</b><small>按日期汇总所有记录</small></span><Icon name="chevronRight" /></button>
                    <button type="button" onClick={exportJson}><span className="action-icon"><Icon name="download" /></span><span><b>导出完整 JSON 备份</b><small>包含分类、模板和全部记录</small></span><Icon name="chevronRight" /></button>
                    <button type="button" onClick={() => fileInputRef.current?.click()}><span className="action-icon"><Icon name="upload" /></span><span><b>从 JSON 恢复</b><small>将覆盖当前设备上的数据</small></span><Icon name="chevronRight" /></button>
                  </div>
                  <input ref={fileInputRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={restoreJson} />
                  <div className="storage-note"><Icon name="check" /><p><b>本地优先</b><br />当前共有 {data.entries.length} 条记录，数据保存在这个浏览器中。建议定期导出 JSON 备份。</p></div>
                  {installPrompt ? (
                    <button className="primary-button install-button" type="button" onClick={installApp}>安装 Log Note 到设备</button>
                  ) : (
                    <p className="install-tip">在手机浏览器的分享菜单中选择“添加到主屏幕”，即可像 App 一样打开。</p>
                  )}
                </section>
              )}
            </div>
          </div>
        </Surface>
      )}

      {toast && <div className="toast"><Icon name="check" />{toast}</div>}
    </main>
  );
}
