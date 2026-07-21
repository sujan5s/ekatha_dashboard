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
  { pageKey: "submissions", label: "Submissions", href: "/submissions", icon: "✉", section: "Main" },

  { pageKey: "users", label: "User Control", href: "/users", icon: "⚿", section: "Admin" },
];

export const SECTION_ORDER: NavItem["section"][] = ["Main", "Admin"];
