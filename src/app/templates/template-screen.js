"use client";

/**
 * @fileoverview 渲染领域、分类与模板的结构管理界面。
 */

import Link from "next/link";
import { sortByOrder } from "@/lib/data.mjs";
import { localizeCategoryName, localizeDomainName, localizeTemplate } from "@/lib/i18n.mjs";
import { useI18n } from "../i18n";
import { Icon } from "../ui";

const FIELD_TYPES = ["text", "textarea", "number", "select", "rating"];
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function EditorShell({ children, label, onClose }) {
  return <div className="structure-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="structure-sheet" role="dialog" aria-modal="true" aria-label={label}>{children}</section>
  </div>;
}

function OrderButtons({ onMove }) {
  return <span className="order-buttons">
    <button type="button" onClick={(event) => { event.stopPropagation(); onMove(-1); }} aria-label="Move up">↑</button>
    <button type="button" onClick={(event) => { event.stopPropagation(); onMove(1); }} aria-label="Move down">↓</button>
  </span>;
}

function scheduleLabel(template, t) {
  if (template.recordType !== "periodic") return t("templates.linear");
  const cadence = template.schedule?.cadence || "daily";
  if (cadence === "timepoint") return `${t("templates.timepoint")} · ${template.schedule?.time || "08:00"}`;
  if (cadence === "weekly") return `${t("templates.weekly")} · ${t(`weekday.${WEEKDAYS[template.schedule?.weekday ?? 1]}`)}`;
  return t("templates.daily");
}

function categoryCount(count, t) {
  return count === 1 ? t("templates.oneCategory") : t("templates.categoryCount", { count });
}

function templateCount(count, t) {
  return count === 1 ? t("templates.oneTemplate") : t("templates.templateCount", { count });
}

/** 渲染结构管理列表、编辑抽屉与导出面板。 */
export function TemplateScreen({
  data, tab, selection, selectedDomain, selectedCategory, selectedTemplate, exportOpen, focusName, toast,
  onTab, onSelect, onCloseEditor, onNameFocused, onNameBlur, onCreateDomain, onCreateCategory, onCreateTemplate,
  onUpdate, onUpdateTemplate, onInputModeChange, onAddField, onUpdateField, onDeleteField, onMove,
  onDeleteDomain, onDeleteCategory, onDeleteTemplate, onTagsChange, onOpenExport, onCloseExport, onExport
}) {
  const { locale, t } = useI18n();
  const displayTemplate = localizeTemplate(selectedTemplate, locale);
  const domains = sortByOrder(data.domains);

  return <main className="template-manager">
    <header className="template-manager-header">
      <Link className="icon-button" href="/" aria-label={t("templates.backRecords")}><Icon name="chevronLeft" /></Link>
      <div className="template-manager-title"><span>Log Note</span><h1>{t("templates.recordSetup")}</h1></div>
      <button className="export-structure-button" type="button" onClick={onOpenExport}><Icon name="download" size={18} /><span>{t("templates.export")}</span></button>
    </header>

    <nav className="structure-tabs" aria-label={t("templates.recordSetup")}>
      <button className={tab === "structure" ? "active" : ""} onClick={() => onTab("structure")}>{t("templates.domainsCategories")}</button>
      <button className={tab === "templates" ? "active" : ""} onClick={() => onTab("templates")}>{t("templates.templatesTab")}</button>
    </nav>

    <section className="structure-page">
      <div className="structure-summary">
        <div><b>{tab === "structure" ? t("templates.domainsCategories") : t("templates.templatesTab")}</b><small>{tab === "structure" ? t("templates.structureHint") : t("templates.templateHint")}</small></div>
        <span>{tab === "structure" ? `${data.domains.length} / ${data.categories.length}` : data.templates.length}</span>
      </div>

      {tab === "structure" ? <div className="domain-list">
        {domains.map((domain) => {
          const categories = sortByOrder(data.categories.filter((item) => item.domainId === domain.id));
          return <section className="domain-section" key={domain.id}>
            <div className="domain-row">
              <button type="button" onClick={() => onSelect("domain", domain.id)}><b>{localizeDomainName(domain, locale)}</b><small>{categoryCount(categories.length, t)}</small></button>
              <OrderButtons onMove={(direction) => onMove("domain", domain.id, direction)} />
              <button className="row-add" type="button" onClick={() => onCreateCategory(domain.id)} aria-label={t("templates.newCategory")}><Icon name="plus" size={17} /></button>
            </div>
            <div className="category-list">
              {categories.map((category) => <div className="category-row" key={category.id}>
                <button type="button" onClick={() => onSelect("category", category.id)}>
                  <span>{localizeCategoryName(category, locale)}</span>
                  <small>{templateCount(data.templates.filter((item) => item.categoryId === category.id).length, t)}</small>
                </button>
                <OrderButtons onMove={(direction) => onMove("category", category.id, direction)} />
              </div>)}
              {!categories.length && <button className="inline-add" type="button" onClick={() => onCreateCategory(domain.id)}><Icon name="plus" size={15} />{t("templates.newCategory")}</button>}
            </div>
          </section>;
        })}
        <button className="primary-add-row" type="button" onClick={onCreateDomain}><Icon name="plus" size={17} />{t("templates.newDomain")}</button>
      </div> : <div className="template-domain-list">
        {domains.map((domain) => {
          const categories = sortByOrder(data.categories.filter((item) => item.domainId === domain.id));
          const count = categories.reduce((sum, category) => sum + data.templates.filter((item) => item.categoryId === category.id).length, 0);
          if (!categories.length) return null;
          return <section className="template-domain" key={domain.id}>
            <header><h2>{localizeDomainName(domain, locale)}</h2><span>{count}</span></header>
            {categories.map((category) => {
              const templates = sortByOrder(data.templates.filter((item) => item.categoryId === category.id));
              return <div className="template-category" key={category.id}>
                <div className="template-category-heading"><span>{localizeCategoryName(category, locale)}</span><button type="button" onClick={() => onCreateTemplate(category.id)}><Icon name="plus" size={15} />{t("templates.new")}</button></div>
                <div className="template-list">
                  {templates.map((item) => {
                    const display = localizeTemplate(item, locale);
                    return <div className="template-row" key={item.id}>
                      <button type="button" onClick={() => onSelect("template", item.id)}><span><b>{display.name}</b><small>{scheduleLabel(item, t)}</small></span><em>{item.inputMode === "structured" ? t("templates.itemCount", { count: item.fields.length }) : t(`templates.input.${item.inputMode}`)}</em></button>
                      <OrderButtons onMove={(direction) => onMove("template", item.id, direction)} />
                    </div>;
                  })}
                  {!templates.length && <button className="inline-add" type="button" onClick={() => onCreateTemplate(category.id)}><Icon name="plus" size={15} />{t("templates.newTemplateInCategory")}</button>}
                </div>
              </div>;
            })}
          </section>;
        })}
      </div>}
    </section>

    {selectedDomain && <EditorShell label={t("templates.editDomain")} onClose={onCloseEditor}>
      <DrawerHeader eyebrow={t("templates.domainLabel")} title={localizeDomainName(selectedDomain, locale)} onClose={onCloseEditor} t={t} />
      <div className="structure-sheet-body">
        <label className="structure-primary-field"><span>{t("templates.domainName")}</span><input autoFocus={focusName} value={selectedDomain.name} onFocus={(event) => { if (focusName) event.target.select(); onNameFocused(); }} onChange={(event) => onUpdate({ name: event.target.value })} onBlur={onNameBlur} /></label>
        <p className="drawer-note">{t("templates.domainDescription")}</p>
        <button className="danger-button structure-delete" type="button" onClick={() => onDeleteDomain(selectedDomain.id)}><Icon name="trash" />{t("templates.deleteDomain")}</button>
      </div>
    </EditorShell>}

    {selectedCategory && <EditorShell label={t("templates.categorySetup")} onClose={onCloseEditor}>
      <DrawerHeader eyebrow={t("templates.categoryLabel")} title={localizeCategoryName(selectedCategory, locale)} onClose={onCloseEditor} t={t} />
      <div className="structure-sheet-body">
        <label className="structure-primary-field"><span>{t("templates.categoryName")}</span><input autoFocus={focusName} value={selectedCategory.name} onFocus={(event) => { if (focusName) event.target.select(); onNameFocused(); }} onChange={(event) => onUpdate({ name: event.target.value })} onBlur={onNameBlur} /></label>
        <label className="structure-form-field"><span>{t("templates.domainLabel")}</span><select value={selectedCategory.domainId} onChange={(event) => onUpdate({ domainId: event.target.value, order: 0 })}>{domains.map((domain) => <option key={domain.id} value={domain.id}>{localizeDomainName(domain, locale)}</option>)}</select></label>
        <button className="danger-button structure-delete" type="button" onClick={() => onDeleteCategory(selectedCategory.id)}><Icon name="trash" />{t("templates.deleteCategory")}</button>
      </div>
    </EditorShell>}

    {selectedTemplate && displayTemplate && <EditorShell label={t("templates.edit")} onClose={onCloseEditor}>
      <DrawerHeader eyebrow={t("templates.templateLabel")} title={displayTemplate.name} onClose={onCloseEditor} t={t} />
      <div className="structure-sheet-body">
        <label className="structure-primary-field"><span>{t("templates.name")}</span><input autoFocus={focusName} value={selectedTemplate.name} onFocus={(event) => { if (focusName) event.target.select(); onNameFocused(); }} onChange={(event) => onUpdateTemplate({ name: event.target.value })} onBlur={onNameBlur} /></label>
        <label className="structure-form-field"><span>{t("templates.defaultCategory")}</span><select value={selectedTemplate.categoryId} onChange={(event) => onUpdateTemplate({ categoryId: event.target.value, order: 0 })}>{domains.flatMap((domain) => sortByOrder(data.categories.filter((item) => item.domainId === domain.id)).map((category) => <option key={category.id} value={category.id}>{localizeDomainName(domain, locale)} / {localizeCategoryName(category, locale)}</option>))}</select></label>

        <SettingSwitch label={t("templates.recordBehavior")} value={selectedTemplate.recordType} options={[["linear", t("templates.linear")], ["periodic", t("templates.periodic")]]} onChange={(recordType) => onUpdateTemplate({ recordType })} />
        {selectedTemplate.recordType === "periodic" && <div className="schedule-settings">
          <label className="structure-form-field"><span>{t("templates.cadence")}</span><select value={selectedTemplate.schedule?.cadence || "daily"} onChange={(event) => onUpdateTemplate({ schedule: event.target.value === "timepoint" ? { cadence: "timepoint", time: "08:00" } : event.target.value === "weekly" ? { cadence: "weekly", weekday: 1 } : { cadence: "daily" } })}><option value="timepoint">{t("templates.timepoint")}</option><option value="daily">{t("templates.daily")}</option><option value="weekly">{t("templates.weekly")}</option></select></label>
          {selectedTemplate.schedule?.cadence === "timepoint" && <label className="structure-form-field"><span>{t("common.time")}</span><input type="time" value={selectedTemplate.schedule.time || "08:00"} onChange={(event) => onUpdateTemplate({ schedule: { cadence: "timepoint", time: event.target.value } })} /></label>}
          {selectedTemplate.schedule?.cadence === "weekly" && <label className="structure-form-field"><span>{t("templates.weekday")}</span><select value={selectedTemplate.schedule.weekday ?? 1} onChange={(event) => onUpdateTemplate({ schedule: { cadence: "weekly", weekday: Number(event.target.value) } })}>{WEEKDAYS.map((day, index) => <option key={day} value={index}>{t(`weekday.${day}`)}</option>)}</select></label>}
        </div>}

        <SettingSwitch label={t("templates.inputStyle")} value={selectedTemplate.inputMode} options={[["free", t("templates.freeTextStyle")], ["structured", t("templates.formStyle")], ["value", t("templates.valueStyle")]]} onChange={onInputModeChange} />
        <label className="structure-form-field"><span>{t("templates.prompt")}</span><input value={selectedTemplate.prompt} onChange={(event) => onUpdateTemplate({ prompt: event.target.value })} /></label>

        {selectedTemplate.inputMode === "structured" && <section className="field-builder">
          <div className="structure-subheading"><h2>{t("templates.fields")}</h2><button type="button" onClick={onAddField}><Icon name="plus" size={16} />{t("templates.addField")}</button></div>
          <div className="field-builder-list">{displayTemplate.fields.map((field, index) => <div className="field-builder-row" key={field.id}>
            <span className="field-index">{index + 1}</span><div className="field-builder-main">
              <input value={field.label} onChange={(event) => onUpdateField(field.id, { label: event.target.value })} />
              <div className="field-builder-controls"><select value={field.type} onChange={(event) => onUpdateField(field.id, { type: event.target.value })}>{FIELD_TYPES.map((type) => <option key={type} value={type}>{t(`templates.fieldType.${type}`)}</option>)}</select><label className="required-check"><input type="checkbox" checked={field.required} onChange={(event) => onUpdateField(field.id, { required: event.target.checked })} />{t("templates.required")}</label></div>
              {field.type === "select" && <input value={field.options.join(", ")} onChange={(event) => onUpdateField(field.id, { options: event.target.value.split(/[,，]/).map((item) => item.trim()).filter(Boolean) })} placeholder={t("templates.optionsPlaceholder")} />}
              {["text", "textarea", "number"].includes(field.type) && <input value={field.placeholder} onChange={(event) => onUpdateField(field.id, { placeholder: event.target.value })} placeholder={t("templates.hintPlaceholder")} />}
            </div><button className="icon-button danger-icon" type="button" onClick={() => onDeleteField(field.id)}><Icon name="trash" /></button>
          </div>)}</div>
        </section>}

        <details className="structure-details"><summary>{t("templates.defaults")}<Icon name="chevronRight" size={17} /></summary><div className="structure-details-body">
          <label className="structure-form-field"><span>{t("templates.defaultTags")}</span><input value={selectedTemplate.tags.join(" ")} onChange={(event) => onTagsChange(event.target.value.split(/[，,\s]+/))} /></label>
          {selectedTemplate.inputMode === "free" && <label className="structure-form-field"><span>{t("templates.prefill")}</span><textarea rows={3} value={selectedTemplate.skeleton} onChange={(event) => onUpdateTemplate({ skeleton: event.target.value })} /></label>}
        </div></details>
        <button className="danger-button structure-delete" type="button" onClick={() => onDeleteTemplate(selectedTemplate.id)}><Icon name="trash" />{t("templates.delete")}</button>
      </div>
    </EditorShell>}

    {exportOpen && <EditorShell label={t("templates.exportTitle")} onClose={onCloseExport}>
      <div className="export-sheet"><header className="export-sheet-header"><div><span>Log Note</span><h2>{t("templates.exportTitle")}</h2></div><button className="icon-button" type="button" onClick={onCloseExport}><Icon name="close" /></button></header>
        <div className="export-options">
          {[['all', 'settings.exportAll', 'settings.exportAllDetail', 'book'], ['today', 'home.exportToday', 'settings.exportTodayDetail', 'download'], ['backup', 'settings.exportJson', 'settings.exportJsonDetail', 'download'], ['structure', 'settings.exportStructure', 'settings.exportStructureDetail', 'download'], ['general', 'settings.exportGeneralTemplate', 'settings.exportGeneralTemplateDetail', 'book']].map(([kind, title, detail, icon]) => <button type="button" key={kind} onClick={() => onExport(kind)}><Icon name={icon} /><span><b>{t(title)}</b><small>{t(detail)}</small></span><Icon name="download" /></button>)}
        </div>
      </div>
    </EditorShell>}
    {toast && <div className="toast"><Icon name="check" />{toast}</div>}
  </main>;
}

function DrawerHeader({ eyebrow, title, onClose, t }) {
  return <header className="structure-sheet-header"><button className="icon-button" type="button" onClick={onClose}><Icon name="close" /></button><div><span>{eyebrow}</span><strong>{title}</strong></div><span className="autosave-status"><Icon name="check" size={15} />{t("templates.autoSaved")}</span></header>;
}

function SettingSwitch({ label, value, options, onChange }) {
  return <div className="structure-setting-row"><span>{label}</span><div className="template-mode-switch" role="group">{options.map(([key, text]) => <button className={value === key ? "active" : ""} type="button" key={key} onClick={() => onChange(key)}>{text}</button>)}</div></div>;
}
