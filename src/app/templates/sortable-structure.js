"use client";

/**
 * @fileoverview dnd-kit 的可访问排序基础组件，只负责交互，不直接修改数据。
 */

import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";

export function SortableItem({ id, data, className, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, data });
  return <div
    ref={setNodeRef}
    className={`${className} sortable-item${isDragging ? " is-dragging" : ""}`}
    style={{ transform: CSS.Transform.toString(transform), transition }}
  >{children({ attributes, listeners, isDragging })}</div>;
}

export function DragHandle({ attributes, listeners, label }) {
  return <button className="drag-handle" type="button" aria-label={label} {...attributes} {...listeners}>
    <span className="drag-dots" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <i key={index} />)}</span>
  </button>;
}

export function DropZone({ id, data, className = "", children, emptyLabel }) {
  const { setNodeRef, isOver } = useDroppable({ id, data });
  return <div ref={setNodeRef} className={`${className} drop-zone${isOver ? " is-over" : ""}`}>
    {children}
    {!children && emptyLabel ? <span className="empty-drop-label">{emptyLabel}</span> : null}
  </div>;
}
