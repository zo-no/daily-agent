/**
 * @fileoverview 提供记录页与模板页共同使用的图标。
 */

const ICON_PATHS = {
  search: <><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  chevronLeft: <path d="m15 18-6-6 6-6"/>,
  chevronRight: <path d="m9 18 6-6-6-6"/>,
  chevronDown: <path d="m6 9 6 6 6-6"/>,
  close: <><path d="m6 6 12 12"/><path d="m18 6-12 12"/></>,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></>,
  download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></>,
  upload: <><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 21h14"/></>,
  fileText: <><path d="M6 3h8l4 4v14H6Z"/><path d="M14 3v5h4"/><path d="M9 13h6"/><path d="M9 17h5"/></>,
  archive: <><path d="M4 7h16"/><path d="M6 7v13h12V7"/><path d="M8 4h8l2 3H6Z"/><path d="M10 12h4"/></>,
  fileJson: <><path d="M6 3h8l4 4v14H6Z"/><path d="M14 3v5h4"/><path d="M10 13c-1.2 0-2 .7-2 2s.8 2 2 2"/><path d="M14 13c1.2 0 2 .7 2 2s-.8 2-2 2"/></>,
  structure: <><path d="M12 4v4"/><path d="M6 12h12"/><path d="M6 12v4"/><path d="M18 12v4"/><rect x="9" y="2" width="6" height="4" rx="1"/><rect x="3" y="16" width="6" height="4" rx="1"/><rect x="15" y="16" width="6" height="4" rx="1"/></>,
  template: <><path d="M6 3h12v18H6Z"/><path d="M9 7h6"/><path d="M9 11h6"/><path d="M9 15h3"/><path d="M16 15v4"/><path d="M14 17h4"/></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 17 5-5 4 4 2-2 5 5"/></>,
  trash: <><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="m7 7 1 14h8l1-14"/></>,
  plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  book: <><path d="M4 5a3 3 0 0 1 3-3h13v17H7a3 3 0 0 0-3 3V5Z"/><path d="M4 19a3 3 0 0 1 3-3h13"/></>,
  copy: <><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
  inbox: <><path d="M4 4h16v13H4z"/><path d="M4 13h5l2 3h2l2-3h5"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>
};

export function Icon({ name, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON_PATHS[name]}
    </svg>
  );
}
