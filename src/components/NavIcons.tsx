export type NavIconName =
  | "dashboard"
  | "meals"
  | "groceries"
  | "notes"
  | "polls"
  | "bills"
  | "payments"
  | "advances"
  | "routines"
  | "exit"
  | "members"
  | "rules"
  | "reports"
  | "settings";

export function NavIcon({ name, className = "w-4 h-4" }: { name: NavIconName; className?: string }) {
  const props = { className, fill: "none", stroke: "currentColor", strokeWidth: 1.8, viewBox: "0 0 24 24" };
  switch (name) {
    case "dashboard":
      return (
        <svg {...props}>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" strokeLinejoin="round" />
        </svg>
      );
    case "meals":
      return (
        <svg {...props}>
          <path d="M8 3v10M8 13c0 4-3 6-3 8h6c0-2-3-4-3-8M16 3c2 3 2 6 0 8 1.5 1 3 4 3 10h-6c0-6 1.5-9 3-10 0-2 0-5 0-8z" strokeLinecap="round" />
        </svg>
      );
    case "groceries":
      return (
        <svg {...props}>
          <path d="M6 7h15l-1.5 9H8L6 7zm0 0L5 4H3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9" cy="20" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="18" cy="20" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "notes":
      return (
        <svg {...props}>
          <path d="M7 4h8l4 4v12H7z" strokeLinejoin="round" />
          <path d="M15 4v4h4M9 12h6M9 16h4" strokeLinecap="round" />
        </svg>
      );
    case "polls":
      return (
        <svg {...props}>
          <path d="M5 19V10M12 19V5M19 19v-7" strokeLinecap="round" />
        </svg>
      );
    case "bills":
      return (
        <svg {...props}>
          <path d="M7 4h10v16l-2-1.5-3 1.5-3-1.5L7 20z" strokeLinejoin="round" />
          <path d="M10 9h4M10 13h4" strokeLinecap="round" />
        </svg>
      );
    case "payments":
      return (
        <svg {...props}>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M3 10h18" />
        </svg>
      );
    case "advances":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v8M9.5 10.5C10 9.5 11 9 12 9c1.5 0 2.5.8 2.5 2s-1 2-2.5 2-2.5.8-2.5 2c0 1.2 1 2 2.5 2 1 0 2-.5 2.5-1.5" strokeLinecap="round" />
        </svg>
      );
    case "routines":
      return (
        <svg {...props}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16" strokeLinecap="round" />
        </svg>
      );
    case "exit":
      return (
        <svg {...props}>
          <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 16l5-4-5-4M20 12H10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "members":
      return (
        <svg {...props}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 19c.5-3 2.5-5 5.5-5s5 2 5.5 5" strokeLinecap="round" />
          <circle cx="17" cy="9" r="2.2" />
          <path d="M16 19c.3-2 1.4-3.4 3.4-4" strokeLinecap="round" />
        </svg>
      );
    case "rules":
      return (
        <svg {...props}>
          <path d="M8 5h11v14H8zM5 8h3M5 12h3M5 16h3" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      );
    case "reports":
      return (
        <svg {...props}>
          <path d="M4 19h16M6 16l4-5 3 3 5-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "settings":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a7.7 7.7 0 0 0 .1-6l-2.1.4a5.8 5.8 0 0 0-1.3-1.3l.4-2.1a7.7 7.7 0 0 0-6-.1l-.4 2.1A5.8 5.8 0 0 0 8.6 8.3L6.5 7.9a7.7 7.7 0 0 0-.1 6l2.1-.4c.3.5.8 1 1.3 1.3l-.4 2.1a7.7 7.7 0 0 0 6 .1l.4-2.1c.5-.3 1-.8 1.3-1.3z" />
        </svg>
      );
    default:
      return null;
  }
}
