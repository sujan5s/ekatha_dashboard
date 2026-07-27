export interface NavItem {
  pageKey: string;
  label: string;
  href: string;
  icon: string;
  section: "Main" | "Admin";
  children?: Omit<NavItem, "section" | "children">[];
}

/** Full nav. The sidebar filters this by the user's allowedPages. */
export const NAV_ITEMS: NavItem[] = [
  {
    pageKey: "overview",
    label: "Home Page",
    href: "/",
    icon: "🏠",
    section: "Main",
    children: [
      { pageKey: "home-hero", label: "Hero", href: "/hero", icon: "★" },
      { pageKey: "home-about", label: "About", href: "/about", icon: "❖" },
      { pageKey: "home-counters", label: "Counters", href: "/counters", icon: "＃" },
      { pageKey: "home-impact", label: "Impact", href: "/impact", icon: "▤" },
      { pageKey: "home-gallery", label: "Gallery", href: "/gallery", icon: "▦" },
      { pageKey: "home-stories", label: "Stories", href: "/stories", icon: "❝" },
      { pageKey: "home-team", label: "Team", href: "/team", icon: "☺" },
      { pageKey: "home-faq", label: "FAQ", href: "/faq", icon: "?" },
    ],
  },
  { pageKey: "form-control", label: "Form Control", href: "/form-control", icon: "📝", section: "Main" },
  { pageKey: "submissions", label: "Submissions", href: "/submissions", icon: "✉", section: "Main" },

  { pageKey: "users", label: "User Control", href: "/users", icon: "⚿", section: "Admin" },
];

export const SECTION_ORDER: NavItem["section"][] = ["Main", "Admin"];

/**
 * Maps a nav href to the SWR key its page fetches, so the sidebar can warm the
 * cache on hover. Only routes with a known, safe GET endpoint are listed; a
 * missing entry simply means no prefetch (never a bad request).
 */
export const PREFETCH_KEY_BY_HREF: Record<string, string> = {
  "/": "/api/overview",
  "/hero": "/api/hero",
  "/about": "/api/home-text",
  "/counters": "/api/counters",
  "/impact": "/api/impact",
  "/gallery": "/api/gallery",
  "/stories": "/api/stories",
  "/team": "/api/team",
  "/faq": "/api/faq",
  "/form-control": "/api/form-control",
  "/submissions": "/api/submissions",
  "/users": "/api/users",
};
