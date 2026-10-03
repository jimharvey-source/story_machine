// The StoryMachine icon set (approved by Jim, 3 October 2026). 24px grid, 1.5px line, round ends.
// Ink for the object, red (class "r") for the part that carries the meaning. Styles in app/globals.css (.ic, .tile).

const R = "r";

const PATHS = {
  quote: (
    <>
      <circle cx="7" cy="15" r="2.6" className={R} fill="currentColor" />
      <path d="M4.5 14.6C4.3 10.6 5.9 8 9.2 6.6" className={R} />
      <circle cx="16" cy="15" r="2.6" className={R} fill="currentColor" />
      <path d="M13.5 14.6C13.3 10.6 14.9 8 18.2 6.6" className={R} />
    </>
  ),
  backwards: (
    <>
      <rect x="4" y="10" width="16" height="10" rx="1.5" />
      <path d="M8 14h5" />
      <path d="M20 5H9" className={R} />
      <path d="M12 2L9 5l3 3" className={R} />
    </>
  ),
  notes: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6" className={R} />
      <path d="M9 15h6M9 18h4" />
    </>
  ),
  questions: (
    <>
      <path d="M3 4h12v8H8l-3 3v-3H3z" />
      <path d="M15 9h6v8h-2v3l-3-3h-6v-3" />
      <circle cx="9" cy="8" r=".9" className={R} fill="currentColor" />
    </>
  ),
  acts: (
    <>
      <rect x="3" y="6" width="5" height="12" rx="1" />
      <rect x="9.5" y="6" width="5" height="12" rx="1" className={R} />
      <rect x="16" y="6" width="5" height="12" rx="1" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.6" className={R} fill="currentColor" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21M9 21h6" />
      <path d="M12 6.5v4" className={R} />
    </>
  ),
  pen: (
    <>
      <path d="M15 4l5 5-10 10H5v-5z" />
      <path d="M12.5 6.5l5 5" />
      <path d="M3 21h8" className={R} />
    </>
  ),
  laptop: (
    <>
      <rect x="4" y="5" width="16" height="11" rx="1.5" />
      <path d="M2 19h20" />
      <rect x="10" y="10" width="4" height="3.4" rx=".6" className={R} />
      <path d="M10.8 10V8.9a1.2 1.2 0 0 1 2.4 0V10" className={R} />
    </>
  ),
  update: (
    <>
      <path d="M4 6h10M4 12h16M4 18h7" />
      <circle cx="20" cy="12" r="1.6" className={R} fill="currentColor" />
    </>
  ),
  strategy: (
    <>
      <circle cx="6" cy="18" r="2" />
      <path d="M8 18h5a3 3 0 0 0 0-6h-3a3 3 0 0 1 0-6h7" />
      <path d="M18 2.5V10" className={R} />
      <path d="M18 3h3.5l-1 1.75 1 1.75H18" className={R} />
    </>
  ),
  pitch: (
    <>
      <circle cx="10" cy="14" r="7" />
      <circle cx="10" cy="14" r="3" />
      <path d="M12.5 11.5L20 4M16 4h4v4" className={R} />
    </>
  ),
  options: (
    <>
      <path d="M12 21v-7M12 14L6 8M12 14l6-6" />
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="18" cy="6" r="2.2" className={R} />
    </>
  ),
  training: (
    <>
      <path d="M3 20h5v-5h5v-5h5V6" />
      <path d="M18 3v3" className={R} />
      <circle cx="18" cy="3" r="1.4" className={R} fill="currentColor" />
    </>
  ),
  badnews: (
    <>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
      <path d="M12 8v5" className={R} />
      <circle cx="12" cy="16.2" r=".9" className={R} fill="currentColor" />
    </>
  ),
  book: (
    <>
      <path d="M12 6.5C10 5 7 4.5 3.5 4.5v13c3.5 0 6.5.5 8.5 2 2-1.5 5-2 8.5-2v-13C17 4.5 14 5 12 6.5z" />
      <path d="M12 6.5V19.5" />
      <path d="M15.5 5v5.5l1.5-1 1.5 1V4.8" className={R} />
    </>
  ),
  tag: (
    <>
      <path d="M3 12V4h8l10 10-8 8z" />
      <circle cx="7.5" cy="8.5" r="1.6" className={R} />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="1.5" />
      <rect x="9" y="2.5" width="6" height="3" rx="1" />
      <path d="M9 13l2 2 4-4" className={R} />
    </>
  ),
  upload: (
    <>
      <path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
      <path d="M12 15V4M8 8l4-4 4 4" className={R} />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.2" />
      <rect x="13" y="4" width="7" height="7" rx="1.2" className={R} />
      <rect x="4" y="13" width="7" height="7" rx="1.2" />
      <rect x="13" y="13" width="7" height="7" rx="1.2" />
    </>
  ),
  download: (
    <>
      <path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
      <path d="M12 4v11M8 11l4 4 4-4" className={R} />
    </>
  ),
  slides: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M12 16v4M8 20h8" />
      <path d="M7 8.5h6" className={R} />
      <path d="M7 11.5h9" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4.5" />
      <path d="M11.2 11.8L20 3M16 7l3 3" />
      <circle cx="8" cy="15" r="1.4" className={R} fill="currentColor" />
    </>
  ),
  help: (
    <>
      <path d="M4 4h16v12h-9l-4 4v-4H4z" />
      <path d="M9.8 8.4a2.2 2.2 0 1 1 3.2 2c-.6.3-1 .8-1 1.4" className={R} />
      <circle cx="12" cy="13.8" r=".9" className={R} fill="currentColor" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M3.5 6.5L12 12.5l8.5-6" className={R} />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`ic ${className}`} aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

/** The icon on its small grey tile. */
export function IconTile({ name, size = "md", white = false }: { name: IconName; size?: "sm" | "md"; white?: boolean }) {
  return (
    <span className={`tile ${size === "sm" ? "tile-sm" : ""} ${white ? "tile-white" : ""}`}>
      <Icon name={name} />
    </span>
  );
}
