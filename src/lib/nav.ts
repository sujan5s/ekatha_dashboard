export interface NavItem {
  pageKey: string;
  label: string;
  href: string;
  icon: string;
  section: "Main" | "Home Page" | "Admin";
}

/** Full nav. The sidebar filters this by the user's allowedPages. */
export const NAV_ITEMS: NavItem[] = [
  { pageKey: "overview", label: "Overview", href: "/", icon: "◆", section: "Main" },
  { pageKey: "submissions", label: "Submissions", href: "/submissions", icon: "✉", section: "Main" },

  { pageKey: "home-hero", label: "Hero", href: "/hero", icon: "★", section: "Home Page" },
  { pageKey: "home-about", label: "About", href: "/about", icon: "❖", section: "Home Page" },
  { pageKey: "home-counters", label: "Counters", href: "/counters", icon: "＃", section: "Home Page" },
  { pageKey: "home-impact", label: "Impact", href: "/impact", icon: "▤", section: "Home Page" },
  { pageKey: "home-gallery", label: "Gallery", href: "/gallery", icon: "▦", section: "Home Page" },
  { pageKey: "home-stories", label: "Stories", href: "/stories", icon: "❝", section: "Home Page" },
  { pageKey: "home-team", label: "Team", href: "/team", icon: "☺", section: "Home Page" },
  { pageKey: "home-faq", label: "FAQ", href: "/faq", icon: "?", section: "Home Page" },

  { pageKey: "users", label: "User Control", href: "/users", icon: "⚿", section: "Admin" },
];

export const SECTION_ORDER: NavItem["section"][] = ["Main", "Home Page", "Admin"];
