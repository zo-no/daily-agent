"use client";

/**
 * @fileoverview 渲染领域、分类与模板的可访问结构管理界面。
 */

import { useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import Link from "next/link";
import { sortByOrder } from "@/lib/data.mjs";
import { localizeCategoryName, localizeDomainName, localizeTemplate } from "@/lib/i18n.mjs";
import { useI18n } from "../i18n";
import { ManagementHeader } from "../management-header";
import { Icon } from "../ui";
import { DragHandle, DropZone, SortableItem } from "./sortable-structure";

const FIELD_TYPES = ["text", "textarea", "number", "select", "rating"];
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const dragId = (type, id) => `${type}:${id}`;

function EditorShell({ children, label, onClose }) {
  return <div className="structure-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="structure-sheet" role="dialog" aria-modal="true" aria-label={label} onFocusCapture={(event) => event.target.scrollIntoView?.({ block: "nearest", inline: "nearest" })}>{children}</section>
  </div>;
}

function ItemMenu({ type, id, parentId, destinations = [], onMove, onMoveTo, t }) {
  return <details className="item-menu">
    <summary role="button" aria-label={t("drag.actions")}><Icon name="more" size={18} /></summary>
    <div className="item-menu-popover">
      <button type="button" onClick={(event) => { onMove(type, id, -1); event.currentTarget.closest("details")?.removeAttribute("open"); }}>{t("drag.moveUp")}</button>
      <button type="button" onClick={(event) => { onMove(type, id, 1); event.currentTarget.closest("details")?.removeAttribute("open"); }}>{t("drag.moveDown")}</button>
      {!!destinations.length && <label><span>{t("drag.moveTo")}</span><select value={parentId} onChange={(event) => { onMoveTo(type, id, event.target.value); event.currentTarget.closest("details")?.removeAttribute("open"); }}>
        {destinations.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
      </select></label>}
    </div>
  </details>;
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

/** 渲染结构管理列表与编辑抽屉。 */
export function TemplateScreen({
  data, focusPeriodic, selection, selectedDomain, selectedCategory, selectedTemplate, focusName, toast,
  onSelect, onCloseEditor, onNameFocused, onNameBlur, onCreateDomain, onCreateCategory, onCreateTemplate, onDuplicateTemplate,
  onUpdate, onUpdateTemplate, onInputModeChange, onAddField, onUpdateField, onDeleteField, onMoveField, onMoveFieldBy,
  onMove, onMoveTo, onDrop, onDeleteDomain, onDeleteCategory, onDeleteTemplate, onTagsChange
}) {
  const { locale, t } = useI18n();
  const [activeDrag, setActiveDrag] = useState(null);
  const displayTemplate = localizeTemplate(selectedTemplate, locale);
  const domains = sortByOrder(data.domains);
  const domainDestinations = domains.map((item) => ({ id: item.id, name: localizeDomainName(item, locale) }));
  const categoryDestinations = domains.flatMap((domain) => sortByOrder(data.categories.filter((item) => item.domainId === domain.id)).map((item) => ({
    id: item.id,
    name: `${localizeDomainName(domain, locale)} / ${localizeCategoryName(item, locale)}`
  })));
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const accessibility = useMemo(() => ({
    screenReaderInstructions: { draggable: t("drag.instructions") },
    announcements: {
      onDragStart({ active }) { return t("drag.pickedUp", { item: active.data.current?.label || "" }); },
      onDragOver({ active, over }) { return over?.data.current?.accepts === active.data.current?.type ? t("drag.over", { item: active.data.current?.label || "", target: over.data.current?.label || "" }) : undefined; },
      onDragEnd({ active, over }) { return over?.data.current?.accepts === active.data.current?.type ? t("drag.dropped", { item: active.data.current?.label || "", target: over.data.current?.label || "" }) : t("drag.cancelled"); },
      onDragCancel() { return t("drag.cancelled"); }
    }
  }), [t]);

  function handleDragStart({ active }) {
    setActiveDrag(active.data.current || null);
  }

  function matchingCollision(args) {
    const activeType = args.active.data.current?.type;
    const droppableContainers = args.droppableContainers.filter((container) => container.id !== args.active.id && container.data.current?.accepts === activeType);
    return closestCenter({ ...args, droppableContainers });
  }

  function dropPosition(source, target) {
    if (source.type !== target.type || source.parentId !== target.parentId) return "before";
    const items = source.type === "domain" ? domains
      : source.type === "category" ? sortByOrder(data.categories.filter((item) => item.domainId === source.parentId))
        : sortByOrder(data.templates.filter((item) => item.categoryId === source.parentId));
    return items.findIndex((item) => item.id === source.itemId) < items.findIndex((item) => item.id === target.itemId) ? "after" : "before";
  }

  function handleDragEnd({ active, over }) {
    setActiveDrag(null);
    if (!over) return;
    const source = active.data.current;
    const target = over.data.current;
    if (!source || !target || source.type !== target.accepts) return;
    if (source.type === "field") return onMoveField(source.itemId, target.itemId);
    onDrop(source.type, {
      id: source.itemId,
      overId: target.type === source.type ? target.itemId : null,
      targetParentId: target.parentId ?? source.parentId,
      position: dropPosition(source, target)
    });
  }

  return <DndContext
    sensors={sensors}
    collisionDetection={matchingCollision}
    accessibility={accessibility}
    onDragStart={handleDragStart}
    onDragCancel={() => setActiveDrag(null)}
    onDragEnd={handleDragEnd}
  >
    <main className="template-manager management-page">
      <ManagementHeader
        backLabel={t("templates.backRecords")}
        title={t("templates.recordSetup")}
        action={<Link className="export-structure-button" href="/settings#structure" aria-label={t("templates.exportOptions")}><Icon name="download" size={18} /><span>{t("templates.exportOptions")}</span></Link>}
      />

      <section className="structure-page">
        <div className="structure-summary">
          <div><b>{focusPeriodic ? t("templates.fixedSetup") : t("templates.structureTree")}</b><small>{focusPeriodic ? t("templates.fixedSetupHint") : t("templates.structureTreeHint")}</small></div>
          <span>{focusPeriodic ? data.templates.filter((item) => item.recordType === "periodic").length : `${data.domains.length} / ${data.categories.length} / ${data.templates.length}`}</span>
        </div>

        <SortableContext items={domains.map((item) => dragId("domain", item.id))} strategy={verticalListSortingStrategy}>
          <div className="domain-list">
            {domains.map((domain) => {
              const domainName = localizeDomainName(domain, locale);
              const categories = sortByOrder(data.categories.filter((item) => item.domainId === domain.id));
              const visibleCategories = focusPeriodic
                ? categories.filter((category) => data.templates.some((item) => item.categoryId === category.id && item.recordType === "periodic"))
                : categories;
              if (focusPeriodic && !visibleCategories.length) return null;
              return <SortableItem className="domain-section" id={dragId("domain", domain.id)} key={domain.id} data={{ type: "domain", accepts: "domain", itemId: domain.id, label: domainName }}>
                {({ attributes, listeners }) => <>
                  <div className="domain-row">
                    {focusPeriodic ? <span /> : <DragHandle attributes={attributes} listeners={listeners} label={t("drag.handle", { item: domainName })} />}
                    {focusPeriodic
                      ? <div className="row-main"><b>{domainName}</b><small>{categoryCount(visibleCategories.length, t)}</small></div>
                      : <button className="row-main" type="button" onClick={() => onSelect("domain", domain.id)}><b>{domainName}</b><small>{categoryCount(visibleCategories.length, t)}</small></button>}
                    {focusPeriodic ? <span /> : <ItemMenu type="domain" id={domain.id} onMove={onMove} onMoveTo={onMoveTo} t={t} />}
                    {!focusPeriodic && <button className="row-add" type="button" onClick={() => onCreateCategory(domain.id)} aria-label={t("templates.newCategory")}><Icon name="plus" size={17} /></button>}
                  </div>
                  <DropZone id={`category-container:${domain.id}`} data={{ type: "container", accepts: "category", parentId: domain.id, label: domainName }} className="category-list" emptyLabel={t("drag.emptyCategories")}>
                    {visibleCategories.length ? <SortableContext items={visibleCategories.map((item) => dragId("category", item.id))} strategy={verticalListSortingStrategy}>
                      {visibleCategories.map((category) => {
                        const categoryName = localizeCategoryName(category, locale);
                        const templates = sortByOrder(data.templates.filter((item) => item.categoryId === category.id && (!focusPeriodic || item.recordType === "periodic")));
                        return <div className="category-branch" key={category.id}>
                          <SortableItem className="category-row" id={dragId("category", category.id)} data={{ type: "category", accepts: "category", itemId: category.id, parentId: domain.id, label: categoryName }}>
                            {({ attributes: categoryAttributes, listeners: categoryListeners }) => <>
                              {focusPeriodic ? <span /> : <DragHandle attributes={categoryAttributes} listeners={categoryListeners} label={t("drag.handle", { item: categoryName })} />}
                              {focusPeriodic
                                ? <div className="row-main"><span>{categoryName}</span><small>{templateCount(templates.length, t)}</small></div>
                                : <button className="row-main" type="button" onClick={() => onSelect("category", category.id)}><span>{categoryName}</span><small>{templateCount(templates.length, t)}</small></button>}
                              {focusPeriodic ? <span /> : <ItemMenu type="category" id={category.id} parentId={domain.id} destinations={domainDestinations} onMove={onMove} onMoveTo={onMoveTo} t={t} />}
                              <details className="template-create-menu"><summary aria-label={t("templates.newTemplateInCategory")}><Icon name="plus" size={15} /></summary><div>
                                {!focusPeriodic && <><button type="button" onClick={() => onCreateTemplate(category.id, "free")}><b>{t("templates.presetQuickName")}</b><small>{t("templates.presetQuickDetail")}</small></button>
                                  <button type="button" onClick={() => onCreateTemplate(category.id, "structured")}><b>{t("templates.presetReflectionName")}</b><small>{t("templates.presetReflectionDetail")}</small></button></>}
                                <button type="button" onClick={() => onCreateTemplate(category.id, "value")}><b>{t("templates.presetValueName")}</b><small>{t("templates.presetValueDetail")}</small></button>
                              </div></details>
                            </>}
                          </SortableItem>
                          <DropZone id={`template-container:${category.id}`} data={{ type: "container", accepts: "template", parentId: category.id, label: categoryName }} className="template-list" emptyLabel={t("drag.emptyTemplates")}>
                            {templates.length ? <SortableContext items={templates.map((item) => dragId("template", item.id))} strategy={verticalListSortingStrategy}>
                              {templates.map((item) => {
                                const display = localizeTemplate(item, locale);
                                return <SortableItem className={`template-row ${item.recordType === "periodic" && item.homeVisible === false ? "is-paused" : ""}`} id={dragId("template", item.id)} key={item.id} data={{ type: "template", accepts: "template", itemId: item.id, parentId: category.id, label: display.name }}>
                                  {({ attributes, listeners }) => <>
                                    <DragHandle attributes={attributes} listeners={listeners} label={t("drag.handle", { item: display.name })} />
                                    <button className="row-main" type="button" onClick={() => onSelect("template", item.id)}><span><b>{display.name}</b><small>{scheduleLabel(item, t)}</small></span><em>{item.recordType === "periodic" && item.homeVisible === false ? t("templates.paused") : item.inputMode === "structured" ? t("templates.itemCount", { count: item.fields.length }) : t(`templates.input.${item.inputMode}`)}</em></button>
                                    <ItemMenu type="template" id={item.id} parentId={category.id} destinations={categoryDestinations} onMove={onMove} onMoveTo={onMoveTo} t={t} />
                                  </>}
                                </SortableItem>;
                              })}
                            </SortableContext> : null}
                          </DropZone>
                        </div>;
                      })}
                    </SortableContext> : null}
                  </DropZone>
                </>}
              </SortableItem>;
            })}
            {!focusPeriodic && <button className="primary-add-row" type="button" onClick={onCreateDomain}><Icon name="plus" size={17} />{t("templates.newDomain")}</button>}
          </div>
        </SortableContext>
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
          <label className="structure-form-field"><span>{t("templates.domainLabel")}</span><select value={selectedCategory.domainId} onChange={(event) => onMoveTo("category", selectedCategory.id, event.target.value)}>{domains.map((domain) => <option key={domain.id} value={domain.id}>{localizeDomainName(domain, locale)}</option>)}</select></label>
          <button className="danger-button structure-delete" type="button" onClick={() => onDeleteCategory(selectedCategory.id)}><Icon name="trash" />{t("templates.deleteCategory")}</button>
        </div>
      </EditorShell>}

      {selectedTemplate && displayTemplate && <EditorShell label={t("templates.edit")} onClose={onCloseEditor}>
        <DrawerHeader eyebrow={t("templates.templateLabel")} title={displayTemplate.name} onClose={onCloseEditor} t={t} />
        <div className="structure-sheet-body">
          <label className="structure-primary-field"><span>{t("templates.name")}</span><input autoFocus={focusName} value={selectedTemplate.name} onFocus={(event) => { if (focusName) event.target.select(); onNameFocused(); }} onChange={(event) => onUpdateTemplate({ name: event.target.value })} onBlur={onNameBlur} /></label>
          <label className="structure-form-field"><span>{t("templates.defaultCategory")}</span><select value={selectedTemplate.categoryId} onChange={(event) => onMoveTo("template", selectedTemplate.id, event.target.value)}>{categoryDestinations.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>

          <SettingSwitch label={t("templates.recordBehavior")} value={selectedTemplate.recordType} options={[["linear", t("templates.linear")], ["periodic", t("templates.periodic")]]} onChange={(recordType) => onUpdateTemplate({ recordType })} />
          {selectedTemplate.recordType === "periodic" && <div className="schedule-settings">
            <label className="structure-form-field"><span>{t("templates.cadence")}</span><select value={selectedTemplate.schedule?.cadence || "daily"} onChange={(event) => onUpdateTemplate({ schedule: event.target.value === "timepoint" ? { cadence: "timepoint", time: "08:00" } : event.target.value === "weekly" ? { cadence: "weekly", weekday: 1 } : { cadence: "daily" } })}><option value="timepoint">{t("templates.timepoint")}</option><option value="daily">{t("templates.daily")}</option><option value="weekly">{t("templates.weekly")}</option></select></label>
            {selectedTemplate.schedule?.cadence === "timepoint" && <label className="structure-form-field"><span>{t("common.time")}</span><input type="time" value={selectedTemplate.schedule.time || "08:00"} onChange={(event) => onUpdateTemplate({ schedule: { cadence: "timepoint", time: event.target.value } })} /></label>}
            {selectedTemplate.schedule?.cadence === "weekly" && <label className="structure-form-field"><span>{t("templates.weekday")}</span><select value={selectedTemplate.schedule.weekday ?? 1} onChange={(event) => onUpdateTemplate({ schedule: { cadence: "weekly", weekday: Number(event.target.value) } })}>{WEEKDAYS.map((day, index) => <option key={day} value={index}>{t(`weekday.${day}`)}</option>)}</select></label>}
          </div>}

          {selectedTemplate.recordType === "periodic" && <label className="home-visibility-setting">
            <span><b>{t("templates.showOnHome")}</b><small>{selectedTemplate.homeVisible === false ? t("templates.pausedHint") : t("templates.visibleHint")}</small></span>
            <input type="checkbox" checked={selectedTemplate.homeVisible !== false} onChange={(event) => onUpdateTemplate({ homeVisible: event.target.checked })} />
          </label>}

          <SettingSwitch label={t("templates.inputStyle")} value={selectedTemplate.inputMode} options={[["free", t("templates.freeTextStyle")], ["structured", t("templates.formStyle")], ["value", t("templates.valueStyle")]]} onChange={onInputModeChange} />
          <label className="structure-form-field"><span>{t("templates.prompt")}</span><input value={selectedTemplate.prompt} onChange={(event) => onUpdateTemplate({ prompt: event.target.value })} /></label>

          <TemplatePreview template={selectedTemplate} display={displayTemplate} t={t} />

          {selectedTemplate.inputMode === "structured" && <section className="field-builder">
            <div className="structure-subheading"><h2>{t("templates.fields")}</h2><button type="button" onClick={onAddField}><Icon name="plus" size={16} />{t("templates.addField")}</button></div>
            <SortableContext items={displayTemplate.fields.map((field) => dragId("field", field.id))} strategy={verticalListSortingStrategy}>
              <div className="field-builder-list">{displayTemplate.fields.map((field, index) => <SortableItem className="field-builder-row" id={dragId("field", field.id)} key={field.id} data={{ type: "field", accepts: "field", itemId: field.id, label: field.label }}>
                {({ attributes, listeners }) => <>
                  <DragHandle attributes={attributes} listeners={listeners} label={t("drag.handle", { item: field.label })} />
                  <span className="field-index">{index + 1}</span><div className="field-builder-main">
                    <input value={field.label} onChange={(event) => onUpdateField(field.id, { label: event.target.value })} />
                    <div className="field-builder-controls"><select value={field.type} onChange={(event) => onUpdateField(field.id, { type: event.target.value })}>{FIELD_TYPES.map((type) => <option key={type} value={type}>{t(`templates.fieldType.${type}`)}</option>)}</select><label className="required-check"><input type="checkbox" checked={field.required} onChange={(event) => onUpdateField(field.id, { required: event.target.checked })} />{t("templates.required")}</label></div>
                    {field.type === "select" && <input value={field.options.join(", ")} onChange={(event) => onUpdateField(field.id, { options: event.target.value.split(/[,，]/).map((item) => item.trim()).filter(Boolean) })} placeholder={t("templates.optionsPlaceholder")} />}
                    {["text", "textarea", "number"].includes(field.type) && <input value={field.placeholder} onChange={(event) => onUpdateField(field.id, { placeholder: event.target.value })} placeholder={t("templates.hintPlaceholder")} />}
                  </div>
                  <div className="field-actions"><ItemMenu type="field" id={field.id} onMove={(_, fieldId, direction) => onMoveFieldBy(fieldId, direction)} onMoveTo={() => {}} t={t} /><button className="icon-button danger-icon" type="button" onClick={() => onDeleteField(field.id)} aria-label={t("templates.deleteField")}><Icon name="trash" /></button></div>
                </>}
              </SortableItem>)}</div>
            </SortableContext>
          </section>}

          <details className="structure-details"><summary>{t("templates.defaults")}<Icon name="chevronRight" size={17} /></summary><div className="structure-details-body">
            <label className="structure-form-field"><span>{t("templates.defaultTags")}</span><input value={selectedTemplate.tags.join(" ")} onChange={(event) => onTagsChange(event.target.value.split(/[，,\s]+/))} /></label>
            {selectedTemplate.inputMode === "free" && <label className="structure-form-field"><span>{t("templates.prefill")}</span><textarea rows={3} value={selectedTemplate.skeleton} onChange={(event) => onUpdateTemplate({ skeleton: event.target.value })} /></label>}
          </div></details>
          <button className="secondary-button structure-duplicate" type="button" onClick={onDuplicateTemplate}><Icon name="copy" />{t("templates.duplicate")}</button>
          <button className="danger-button structure-delete" type="button" onClick={() => onDeleteTemplate(selectedTemplate.id)}><Icon name="trash" />{t("templates.delete")}</button>
        </div>
      </EditorShell>}

      {toast && <div className="toast"><Icon name="check" />{toast}</div>}
    </main>
    <DragOverlay dropAnimation={{ duration: 200, easing: "ease-out" }}>{activeDrag ? <div className="drag-overlay-row"><span className="drag-dots" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <i key={index} />)}</span><b>{activeDrag.label}</b></div> : null}</DragOverlay>
  </DndContext>;
}

function TemplatePreview({ template, display, t }) {
  return <section className="template-preview" aria-label={t("templates.preview")}>
    <header><span>{t("templates.preview")}</span><small>{t("templates.previewHint")}</small></header>
    {display.prompt && <p>{display.prompt}</p>}
    {template.inputMode === "free" && <div className="preview-writing">{template.skeleton || display.prompt || t("composer.placeholder")}</div>}
    {template.inputMode === "value" && <div className="preview-value"><span>{display.name}</span><b>{display.prompt || t("composer.fixedValuePlaceholder")}</b></div>}
    {template.inputMode === "structured" && <div className="preview-fields">{display.fields.map((field) => <div key={field.id}><span>{field.label}{field.required ? " *" : ""}</span><b>{field.placeholder || (field.type === "rating" ? "1  2  3  4  5" : field.options?.join(" · ") || t("templates.previewEmpty"))}</b></div>)}</div>}
  </section>;
}

function DrawerHeader({ eyebrow, title, onClose, t }) {
  return <header className="structure-sheet-header"><button className="icon-button" type="button" onClick={onClose} aria-label={t("common.close")}><Icon name="close" /></button><div><span>{eyebrow}</span><strong>{title}</strong></div><span className="autosave-status"><Icon name="check" size={15} />{t("templates.autoSaved")}</span></header>;
}

function SettingSwitch({ label, value, options, onChange }) {
  return <div className="structure-setting-row"><span>{label}</span><div className="template-mode-switch" role="group">{options.map(([key, text]) => <button className={value === key ? "active" : ""} type="button" key={key} onClick={() => onChange(key)}>{text}</button>)}</div></div>;
}
