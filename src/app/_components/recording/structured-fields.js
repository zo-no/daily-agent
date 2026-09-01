/**
 * @fileoverview 为记录编辑器与固定记录复用模板字段输入控件。
 */

/** 将结构化模板字段映射为文字、选项或评分输入。 */
export function StructuredFields({ fields, values, onChange }) {
  return (
    <div className="structured-fields">
      {fields.map((field, index) => {
        const value = values[field.id] ?? "";
        const inputId = `structured-${field.id}`;
        return (
          <div className="structured-field" key={field.id}>
            <label htmlFor={inputId}>{field.label}{field.required && <span>*</span>}</label>
            {field.type === "textarea" && <textarea id={inputId} data-field-id={field.id} autoFocus={index === 0} rows={4} value={value} onChange={(event) => onChange(field.id, event.target.value)} placeholder={field.placeholder} />}
            {(field.type === "text" || field.type === "number") && <input id={inputId} data-field-id={field.id} autoFocus={index === 0} type={field.type === "number" ? "number" : "text"} value={value} onChange={(event) => onChange(field.id, event.target.value)} placeholder={field.placeholder} />}
            {field.type === "select" && (
              <div className="option-buttons" role="group" aria-label={field.label} data-field-id={field.id} tabIndex={-1}>
                {field.options.map((option) => <button aria-pressed={value === option} className={value === option ? "active" : ""} type="button" key={option} onClick={() => onChange(field.id, value === option ? "" : option)}>{option}</button>)}
              </div>
            )}
            {field.type === "rating" && (
              <div className="rating-buttons" role="group" aria-label={field.label} data-field-id={field.id} tabIndex={-1}>
                {[1, 2, 3, 4, 5].map((rating) => <button aria-pressed={String(value) === String(rating)} className={String(value) === String(rating) ? "active" : ""} type="button" key={rating} onClick={() => onChange(field.id, rating)}>{rating}</button>)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
