export type Role = "ADMIN" | "VOLUNTEER" | "CLIENT";
export type GallerySpan = "NORMAL" | "TALL" | "WIDE";
export type SubmissionType = "HELP" | "DONATE";
export type SubmissionStatus = "NEW" | "REVIEWED" | "CLOSED";

export interface DashUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  image: string | null;
  emailVerified: boolean;
}

export interface HeroSlide {
  id: string;
  imageUrl: string;
  imageKey: string;
  alt: string;
  order: number;
  active: boolean;
}

export interface HomeText {
  id: string;
  eyebrow: string;
  headline: string;
  headlineEm: string;
  headlineEnd: string;
  subText: string;
  ctaPrimary: string;
  ctaGhost: string;
  trustText: string;
  quoteText: string;
  quoteAttribution: string;
  quoteImageUrl: string;
  quoteImageKey: string;
  aboutImageUrl: string;
  aboutImageKey: string;
  aboutImage2Url: string;
  aboutImage2Key: string;
}

export interface StatCounter {
  id: string;
  icon: string;
  value: number;
  suffix: string;
  label: string;
  order: number;
}

export interface ImpactBar {
  id: string;
  label: string;
  percent: number;
  colorFrom: string;
  colorTo: string;
  order: number;
}

export interface GalleryImage {
  id: string;
  imageUrl: string;
  imageKey: string;
  caption: string;
  span: GallerySpan;
  order: number;
}

export interface Testimonial {
  id: string;
  text: string;
  name: string;
  location: string;
  avatarUrl: string;
  avatarKey: string;
  published: boolean;
  order: number;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  photoUrl: string;
  photoKey: string;
  isLead: boolean;
  order: number;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  published: boolean;
  order: number;
}

export interface Submission {
  id: string;
  type: SubmissionType;
  payload: Record<string, unknown>;
  status: SubmissionStatus;
  createdAt: string;
}

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  permissions: { pageKey: string }[];
}
