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
  newsBadge: string;
  newsHeading: string;
  newsSub: string;
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

export interface NewsArticle {
  id: string;
  title: string;
  date: string;
  imageUrl: string;
  imageKey: string;
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

// ── Applications: OCR + human verification ──

export type VerificationStatus =
  | "PENDING"
  | "PROCESSING"
  | "VERIFIED"
  | "NEEDS_REVIEW"
  | "FAILED";

export type HumanDecision = "UNREVIEWED" | "APPROVED" | "REJECTED";

export type CheckResult = "PASS" | "FAIL" | "WARN" | "SKIP";

export type DocType =
  | "BANK_PASSBOOK"
  | "AADHAAR"
  | "MEDICAL_BILL"
  | "REQUEST_LETTER"
  | "PHOTO"
  | "OTHER";

/** One automated check comparing a document against the application form. */
export interface CheckRecord {
  key: string;
  label: string;
  result: CheckResult;
  /** What the applicant typed on the form. */
  expected?: string;
  /** What OCR read off the document. */
  found?: string;
  detail?: string;
}

export interface CheckSummary {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
  skipped: number;
}

/** Row shape for the applications list. */
export interface ApplicationRow {
  id: string;
  createdAt: string;
  status: SubmissionStatus;
  verificationStatus: VerificationStatus;
  humanDecision: HumanDecision;
  humanReviewer: string;
  humanReviewedAt: string | null;
  verifiedAt: string | null;
  beneficiaryName: string;
  beneficiaryAge: number | null;
  mobile: string;
  referrerName: string;
  documentCount: number;
  checkSummary: CheckSummary;
}

export interface VerifiedDocument {
  id: string;
  fieldKey: string;
  docType: DocType;
  fileName: string;
  fileKey: string;
  mimeType: string;
  fileSize: number;
  ocrProvider: string;
  ocrConfidence: number;
  rawText: string;
  /** Exactly what OCR read, never overwritten by a correction. */
  extracted: Record<string, unknown> | null;
  /** Reviewer corrections, keyed by field name. */
  corrections: Record<string, unknown>;
  /** `extracted` with `corrections` applied — what the document actually says. */
  values: Record<string, unknown>;
  /** Which fields this document type allows a reviewer to correct. */
  editableFields: string[];
  correctedBy: string;
  correctedAt: string | null;
  checks: CheckRecord[] | null;
  status: VerificationStatus;
  error: string;
  processedAt: string | null;
  /** Short-lived presigned URL; the bucket itself is private. */
  viewUrl: string | null;
}

/** Verdict for one row of the cross-document comparison. */
export type MatchStatus =
  | "MATCHED"
  | "MISMATCH"
  | "REVIEW"
  | "FOUND"
  | "NOT_FOUND"
  | "SINGLE_SOURCE"
  | "NA";

/** One fact, as it appears on every document that states it. */
export interface ComparisonRow {
  key: string;
  label: string;
  /** Value per document type; a missing key means the document is silent on it. */
  cells: Partial<Record<DocType, string>>;
  status: MatchStatus;
  detail: string;
  /** What the application form itself said, when it is comparable. */
  formValue?: string;
}

export interface ComparisonMatrix {
  columns: Array<{ docType: DocType; label: string }>;
  rows: ComparisonRow[];
  summary: { matched: number; mismatched: number; review: number; missing: number };
}

export interface ApplicationFormFieldDef {
  id: string;
  fieldKey: string;
  num: number;
  titleEn: string;
  titleKn: string;
  type: string;
  required: boolean;
  order: number;
  active: boolean;
}

export interface ApplicationDetail {
  id: string;
  type: SubmissionType;
  status: SubmissionStatus;
  createdAt: string;
  updatedAt: string;
  verificationStatus: VerificationStatus;
  verifiedAt: string | null;
  crossChecks: CheckRecord[];
  humanDecision: HumanDecision;
  humanReviewer: string;
  humanReviewedAt: string | null;
  humanNotes: string;
  form: {
    beneficiaryName: string;
    beneficiaryAge: number | null;
    mobile: string;
    address: string;
    referrerName: string;
  };
  payload: Record<string, unknown>;
  fields: ApplicationFormFieldDef[];
  documents: VerifiedDocument[];
  /** Form field key → view URL, so file answers can be opened from the table. */
  documentsByField: Record<string, string>;
  /** Every fact side by side across the documents that state it. */
  comparison: ComparisonMatrix;
  checkSummary: CheckSummary;
}

/** A row in the archive of applications a human has decided on. */
export interface VerifiedApplicationRow extends ApplicationRow {
  /** How many documents carry at least one reviewer correction. */
  correctedCount: number;
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
